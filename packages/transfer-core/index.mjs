// Portable domain: no platform, vendor, browser or filesystem imports.
export const VERSION = '0.1.0';
export const TERMINAL = new Set(['verified','unverified','terminal-failed','cancelled','needs-browser','needs-auth','skipped']);
export class TransferError extends Error {
  constructor(code, retryable = false) { super(code); this.code = code; this.retryable = retryable; }
}
export function validateKey(key) {
  if (typeof key !== 'string' || !key || new TextEncoder().encode(key).length > 1024 ||
      /[\\\x00-\x1f\x7f]/.test(key) || key.startsWith('/') || key.split('/').some(x => !x || x === '.' || x === '..') || key.startsWith('.redown-transfer/'))
    throw new TransferError('INVALID_KEY');
  return key;
}
export function validateSubmission(input) {
  if (!input || typeof input !== 'object') throw new TransferError('INVALID_JOB');
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(input.idempotencyKey || '')) throw new TransferError('INVALID_IDEMPOTENCY_KEY');
  if(typeof input.sourceUrl!=='string'||input.sourceUrl.length>8192)throw new TransferError('INVALID_SOURCE');
  const u = new URL(input.sourceUrl);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.hash) throw new TransferError('NEEDS_BROWSER');
  validateKey(input.destination?.key);
  if (!input.destination.accountId || !input.destination.bucket) throw new TransferError('INVALID_DESTINATION');
  const mode = input.requestedMode || 'automatic';
  if (!['automatic','fully-remote','browser-assisted'].includes(mode)) throw new TransferError('INVALID_MODE');
  const overwrite = input.policy?.overwrite || 'skip-existing';
  // Conditional multipart replacement is not portable across destinations. Fail closed.
  if (!['skip-existing','fail-if-existing'].includes(overwrite)) throw new TransferError('REPLACE_UNSUPPORTED');
  if (input.resume) throw new TransferError('RESUME_UNSUPPORTED');
  return {sourceUrl:u.href, destination:{...input.destination}, idempotencyKey:input.idempotencyKey,
    requestedMode:mode, policy:{overwrite,allowBrowserFallback:input.policy?.allowBrowserFallback !== false},
    actualMode:'cloud-to-cloud', resume:'restart-only', cleanup:'not-applicable'};
}
export const TRANSITIONS = {
  queued:['preflight','cancelled'], 'retry-wait':['preflight','cancelled'],
  preflight:['transferring','verifying','skipped','needs-browser','needs-auth','retry-wait','terminal-failed','cancellation-pending'],
  transferring:['transferring','verifying','retry-wait','terminal-failed','needs-auth','cancellation-pending'],
  verifying:['verifying','verified','unverified','retry-wait','terminal-failed','needs-auth','cancellation-pending'],
  'cancellation-pending':['cancelled','verified','unverified','retry-wait','terminal-failed']
};
export function assertTransition(from,to) {
  if (!TRANSITIONS[from]?.includes(to)) throw new TransferError('ILLEGAL_TRANSITION');
}
// Ports are injected. Store checkpoint must atomically fence the lease and append an event.
export async function executeTransfer(job, ports) {
  const {store,source,destination,hash,clock} = ports;
  const lease = job.lease;
  const checkpoint = async (state, patch={}) => {
    await ports.fault?.('before:'+state);
    job = await store.checkpoint(job.jobId, lease, state, patch, clock.now());
    await ports.events?.emit({jobId:job.jobId,attemptId:lease,state});
    await ports.fault?.('after:'+state);
    return job;
  };
  const checkCancel = async () => {
    if (await store.cancelRequested(job.jobId,lease)) throw new TransferError('CANCELLED');
  };
  const verify = async () => {
    await checkpoint('verifying');
    const object = await destination.inspect(job.destination);
    if (!object || object.jobId !== job.jobId || !job.digest || object.size !== job.bytes)
      return checkpoint('unverified',{errorCode:'OBJECT_EVIDENCE_MISMATCH'});
    const digest = hash.create(); let bytes = 0;
    for await (const chunk of await destination.read(job.destination)) {
      // Cancellation cannot pretend to undo a committed object; finish observing it.
      bytes += chunk.byteLength;
      if (bytes > job.bytes) return checkpoint('unverified',{errorCode:'READBACK_SIZE_MISMATCH'});
      digest.update(chunk);
    }
    const actual = digest.digest();
    if (bytes !== job.bytes || actual !== job.digest)
      return checkpoint('unverified',{errorCode:'READBACK_DIGEST_MISMATCH'});
    return checkpoint('verified',{verification:{method:'sha256-readback',sourceDigest:job.digest,
      destinationDigest:actual,bytes,location:{...job.destination},checkedAt:clock.now(),assurance:'content-readback'}});
  };
  let acquisition;
  try {
    await checkpoint('preflight');
    const existing = await destination.inspect(job.destination);
    if (existing?.jobId === job.jobId && job.digest) return await verify();
    await checkCancel();
    if (job.attempt > job.maxAttempts) return await checkpoint('terminal-failed',{errorCode:'ATTEMPT_BUDGET_EXCEEDED'});
    if (existing) return await checkpoint(job.policy.overwrite === 'skip-existing' ? 'skipped':'terminal-failed',
      {errorCode:'EXISTING_OBJECT_NOT_VERIFIED'});
    if (job.requestedMode === 'browser-assisted') return await checkpoint('needs-browser',{errorCode:'BROWSER_PERMISSION_REQUIRED'});
    // Begin identity is deterministic per attempt, so a lost create response is recoverable.
    if (job.multipart) await destination.cleanup(job.multipart);
    acquisition = await source.open(job.sourceUrl,{validator:job.validator,maxBytes:job.maxBytes});
    const stream = acquisition;
    await checkpoint('transferring',{validator:stream.validator,contentLength:stream.length,bytes:0});
    const multipart = await destination.begin(job.destination,job.jobId,lease);
    await checkpoint('transferring',{multipart});
    const digest = hash.create(); let bytes=0, part=0, used=0;
    let buffer = new Uint8Array(ports.partBytes);
    for await (const chunk of stream.body) {
      await checkCancel();
      bytes += chunk.byteLength;
      if (bytes > job.maxBytes) throw new TransferError('BYTE_BUDGET_EXCEEDED');
      digest.update(chunk);
      for (let offset=0; offset < chunk.byteLength;) {
        const n = Math.min(buffer.length-used,chunk.byteLength-offset);
        buffer.set(chunk.subarray(offset,offset+n),used); used+=n; offset+=n;
        if (used === buffer.length) {
          await ports.fault?.('before:part');
          const receipt = await destination.part(multipart,++part,buffer);
          await ports.fault?.('after:part-effect');
          await checkpoint('transferring',{bytes:bytes-(chunk.byteLength-offset),part,partReceipt:receipt});
          buffer = new Uint8Array(ports.partBytes); used=0;
        }
      }
    }
    if (stream.length !== null && bytes !== stream.length) throw new TransferError('SHORT_READ',true);
    if (used || part === 0) {
      await ports.fault?.('before:final-part');
      await destination.part(multipart,++part,buffer.subarray(0,used));
      await ports.fault?.('after:final-part');
    }
    await checkCancel();
    // Persist proof before any final write; lost response is reconciled by exact job identity/readback.
    await checkpoint('transferring',{bytes,digest:digest.digest(),part});
    await ports.fault?.('before:commit');
    const published = await destination.commit(multipart,job.destination,{jobId:job.jobId,digest:job.digest,bytes});
    await ports.fault?.('after:commit');
    if (!published) {
      const object=await destination.inspect(job.destination);
      if (object?.jobId !== job.jobId) return await checkpoint('terminal-failed',{errorCode:'DESTINATION_RACE'});
    }
    return await verify();
  } catch (error) {
    if (error.code === 'LEASE_LOST' || error.crash) throw error;
    // Inspect before cancelling: a lost commit response may have written the final object.
    try {
      const object=await destination.inspect(job.destination);
      if (object?.jobId === job.jobId && job.digest) return await verify();
    } catch { /* uncertainty remains; never infer success */ }
    if (error.code === 'CANCELLED') {
      await checkpoint('cancellation-pending',{errorCode:'CANCELLED'});
      if (job.multipart) await destination.cleanup(job.multipart);
      return checkpoint('cancelled');
    }
    try { if (job.multipart) await destination.cleanup(job.multipart); } catch { /* retained checkpoint allows cleanup retry */ }
    const code=error.code || 'NETWORK_FAILURE';
    if (code === 'SOURCE_401' || code === 'SOURCE_403' || code === 'DESTINATION_401' || code === 'DESTINATION_403')
      return checkpoint('needs-auth',{errorCode:code});
    if (code === 'NEEDS_BROWSER') return checkpoint('needs-browser',{errorCode:code});
    if (error.retryable && job.attempt < job.maxAttempts) {
      const delay = Math.min(60000,1000*2**(job.attempt-1));
      return checkpoint('retry-wait',{errorCode:code,nextAttemptAt:clock.now()+delay});
    }
    return checkpoint(job.state === 'verifying' ? 'unverified':'terminal-failed',{errorCode:code});
  } finally { await acquisition?.close?.(); }
}
