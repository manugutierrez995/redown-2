import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {TERMINAL,TransferError,assertTransition,validateSubmission} from '../packages/transfer-core/index.mjs';
export class Ledger {
  constructor(path,{now=Date.now,leaseMs=30000}={}) {
    this.now=now; this.leaseMs=leaseMs; this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, idem TEXT NOT NULL, fingerprint TEXT NOT NULL, record TEXT NOT NULL, UNIQUE(tenant,idem));
      CREATE TABLE IF NOT EXISTS events(job TEXT NOT NULL, seq INTEGER NOT NULL, record TEXT NOT NULL, PRIMARY KEY(job,seq));`);
  }
  transaction(fn) {this.db.exec('BEGIN IMMEDIATE');try {const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  get(id,tenant) {const row=this.db.prepare('SELECT record FROM jobs WHERE id=?').get(id);const job=row&&JSON.parse(row.record);return job&&(!tenant||job.tenant===tenant)?job:null;}
  save(job,type,patch={}) {
    job.updatedAt=this.now();job.sequence=(job.sequence||0)+1;
    this.db.prepare('UPDATE jobs SET record=? WHERE id=?').run(JSON.stringify(job),job.jobId);
    const event={schemaVersion:2,jobId:job.jobId,sequence:job.sequence,at:job.updatedAt,attemptId:job.lease||null,
      state:job.state,type,provenance:'remote-executor',...patch};
    this.db.prepare('INSERT INTO events VALUES(?,?,?)').run(job.jobId,job.sequence,JSON.stringify(event));
    return structuredClone(job);
  }
  submit(input,tenant,{maxBytes=64*1024*1024,maxAttempts=5,maxPending=100}={}) {
    if(!Number.isSafeInteger(maxBytes)||maxBytes<0||maxBytes>1024*1024*1024||!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>20||!Number.isSafeInteger(maxPending)||maxPending<1||maxPending>1000)throw new TransferError('INVALID_LIMITS');
    const spec=validateSubmission(input);
    const fingerprint=createHash('sha256').update(JSON.stringify(spec)).digest('hex');
    return this.transaction(()=>{
      const previous=this.db.prepare('SELECT id,fingerprint FROM jobs WHERE tenant=? AND idem=?').get(tenant,spec.idempotencyKey);
      if(previous){if(previous.fingerprint!==fingerprint)throw new TransferError('IDEMPOTENCY_CONFLICT');return this.get(previous.id);}
      if(this.list(tenant).filter(j=>!TERMINAL.has(j.state)).length>=maxPending)throw new TransferError('QUEUE_BUDGET_EXCEEDED');
      const job={schemaVersion:2,jobId:randomUUID(),tenant,...spec,state:'queued',createdAt:this.now(),updatedAt:this.now(),
        bytes:0,attempt:0,maxBytes,maxAttempts,cancel:false,lease:null,leaseUntil:0,nextAttemptAt:0,sequence:0};
      this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(job.jobId,tenant,spec.idempotencyKey,fingerprint,JSON.stringify(job));
      return this.save(job,'durably-accepted');
    });
  }
  list(tenant) {return this.db.prepare('SELECT record FROM jobs ORDER BY id').all().map(r=>JSON.parse(r.record)).filter(j=>!tenant||j.tenant===tenant);}
  claim() {return this.transaction(()=>{
    const now=this.now();const jobs=this.list();const active=new Set(jobs.filter(j=>!TERMINAL.has(j.state)&&j.leaseUntil>now).map(j=>j.tenant));
    const job=jobs.find(j=>!TERMINAL.has(j.state)&&j.leaseUntil<=now&&j.nextAttemptAt<=now&&!active.has(j.tenant));
    if(!job)return null;
    job.lease=randomUUID();job.leaseUntil=now+this.leaseMs;job.attempt++;
    // Explicit recovery transition: retained checkpoint, new fenced attempt.
    job.state='queued';return this.save(job,'lease-claimed',{recovery:job.attempt>1});
  });}
  owned(id,lease) {const j=this.get(id);if(!j||j.lease!==lease||j.leaseUntil<=this.now())throw new TransferError('LEASE_LOST');return j;}
  heartbeat(id,lease) {return this.transaction(()=>{const j=this.owned(id,lease);j.leaseUntil=this.now()+this.leaseMs;this.db.prepare('UPDATE jobs SET record=? WHERE id=?').run(JSON.stringify(j),id);});}
  async checkpoint(id,lease,state,patch,at) {return this.transaction(()=>{
    const j=this.owned(id,lease);assertTransition(j.state,state);Object.assign(j,patch,{state,transitionAt:at});
    if(TERMINAL.has(state)||state==='retry-wait')j.leaseUntil=0;
    return this.save(j,'checkpoint',{errorCode:j.errorCode||null,bytes:j.bytes});
  });}
  async cancelRequested(id,lease) {return this.owned(id,lease).cancel;}
  cancel(id,tenant) {return this.transaction(()=>{const j=this.get(id,tenant);if(!j)throw new TransferError('NOT_FOUND');
    if(TERMINAL.has(j.state))return j;j.cancel=true;return this.save(j,'cancellation-requested');});}
  events(id,tenant) {if(!this.get(id,tenant))throw new TransferError('NOT_FOUND');return this.db.prepare('SELECT record FROM events WHERE job=? ORDER BY seq').all(id).map(r=>JSON.parse(r.record));}
  close(){this.db.close();}
}
// Public projection never exposes signed source URLs, tokens, multipart keys or private source paths.
export function publicJob(job) {
  const {sourceUrl,tenant,lease,multipart,validator,partReceipt,...safe}=job;
  safe.source={kind:'url',origin:new URL(sourceUrl).origin};
  safe.validatorPresent=Boolean(validator);return safe;
}
export function exportJSONL(ledger,tenant) {return ledger.list(tenant).map(publicJob).map(j=>JSON.stringify(j)).join('\n')+'\n';}
export function readProjectionJSONL(text) {
  const lines=text.split('\n');const incomplete=lines.at(-1)!=='';if(incomplete)lines.pop();
  const records=lines.filter(Boolean).map(l=>JSON.parse(l));
  if(records.some(j=>j.schemaVersion!==2||typeof j.jobId!=='string'||!TERMINAL.has(j.state)&&!['queued','preflight','transferring','verifying','retry-wait','cancellation-pending'].includes(j.state)))throw new TransferError('INVALID_LEDGER');
  // Imports are evidence projections, never executable job intent.
  return {records:records.sort((a,b)=>a.jobId.localeCompare(b.jobId)),incompleteTail:incomplete,executable:false};
}
export function migrateV1(record) {
  if(record.schemaVersion!==1)throw new TransferError('UNSUPPORTED_LEDGER_VERSION');
  const legacy=structuredClone(record);
  if(legacy.source?.url){try{legacy.source.url=new URL(legacy.source.url).origin+'/[redacted]';}catch{delete legacy.source.url;}}
  if(legacy.source){delete legacy.source.localRef;delete legacy.source.displayName;}
  return {schemaVersion:2,jobId:record.jobId,state:'unverified',legacy,
    createdAt:Math.max(0,Date.parse(record.createdAt)||0),updatedAt:Math.max(0,Date.parse(record.updatedAt)||0),sequence:1,
    source:{kind:record.source?.kind||'other',origin:legacy.source?.url?new URL(legacy.source.url).origin:null},
    destination:{accountId:record.destination?.accountId||'unknown',bucket:record.destination?.bucket||'unknown',key:record.destination?.key||'unknown'},
    requestedMode:record.policy?.preferredMode==='browser-assisted'?'browser-assisted':'automatic',
    actualMode:'unknown',bytes:0,cleanup:'not-applicable',executable:false,
    reason:'LEGACY_COMPLETION_IS_NOT_VERIFICATION'};
}
