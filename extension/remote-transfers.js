// Feature-gated control plane only: no source byte fetch or automatic browser fallback.
(function(root){
  const CONFIG='redownRemoteExecutorV1',OUTBOX='redownRemoteOutboxV1',CACHE='redownRemoteProjectionV2';
  function diag(code,traceId,details={}){try{root.RedownDiagnostics?.emit(code,traceId,details);}catch{}}
  let serial=Promise.resolve();
  function locked(fn){const next=serial.then(fn);serial=next.catch(()=>{});return next;}
  async function settings(){const s=await chrome.storage.local.get([CONFIG,'redownTransferPolicyV1']);return {config:s[CONFIG]||{},policy:s.redownTransferPolicyV1||{preferredMode:'browser-assisted',allowBrowserFallback:true}};}
  async function request(config,path,method='GET',body,traceId='unattributed'){
    const u=new URL(config.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash){diag('REDOWN.EXECUTOR.PREFLIGHT.HTTPS_REQUIRED',traceId);throw Error('Executor must use HTTPS');}
    const response=await fetch(u.origin+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if([401,403].includes(response.status))diag('REDOWN.EXECUTOR.ACCEPTANCE.PERMISSION_DENIED',traceId,{status:response.status});
    const result=await response.json();if(!response.ok)throw Error(result.error||'REMOTE_API_FAILURE');return result;
  }
  async function submit(profile,sourceUrl,prefix,filename,traceId=crypto.randomUUID()){return locked(async()=>{
    const {config,policy}=await settings();
    if(/^https?:\/\//i.test(sourceUrl))diag("REDOWN.SOURCE.URL.DIRECT_CANDIDATE",traceId);
    if(!config.enabled){if(policy.preferredMode==='fully-remote'){diag('REDOWN.EXECUTOR.PREFLIGHT.NOT_CONFIGURED',traceId);throw Error('Fully Remote requires an enabled executor. No legacy transfer started.');}diag('REDOWN.MODE.POLICY.BROWSER_SELECTED',traceId);return null;}
    if(policy.preferredMode==='browser-assisted'){diag('REDOWN.MODE.POLICY.BROWSER_SELECTED',traceId);return null;}
    diag('REDOWN.MODE.POLICY.REMOTE_SELECTED',traceId);

    if(!/^https?:\/\//i.test(sourceUrl))throw Error('Needs browser access: this URL cannot be retrieved remotely. No fallback has been started.');
    const key=[String(prefix||'').replace(/\/$/,''),filename].filter(Boolean).join('/');
    const intent={idempotencyKey:traceId,sourceUrl,destination:{accountId:profile.accountId,bucket:profile.bucketName,key},
      requestedMode:policy.preferredMode==='fully-remote'?'fully-remote':'automatic',policy:{allowBrowserFallback:policy.allowBrowserFallback,overwrite:policy.overwrite||'skip-existing'}};
    const state=await chrome.storage.local.get(OUTBOX);const outbox=state[OUTBOX]||[];
    outbox.push(intent);await chrome.storage.local.set({[OUTBOX]:outbox});diag('REDOWN.EXECUTOR.QUEUE.INTENT_PERSISTED',traceId);
    // If acknowledgment is lost, preserve intent and replay exactly the same key on alarm/restart.
    let result;try{result=await request(config,'/v2/jobs','POST',intent,traceId);}catch(error){diag('REDOWN.EXECUTOR.ACCEPTANCE.RESPONSE_UNKNOWN',traceId);throw Error('Remote acceptance unknown; request retained for reconciliation. '+error.message);}
    if(result.durable!==true||!result.job?.jobId)throw Error('Remote service did not acknowledge durable acceptance');
    diag('REDOWN.EXECUTOR.ACCEPTANCE.DURABLE_ACK',traceId);
    await chrome.storage.local.set({[OUTBOX]:outbox.filter(x=>x.idempotencyKey!==intent.idempotencyKey)});
    return 'remote-job:'+result.job.jobId;
  });}
  async function reconcile(){return locked(async()=>{
    const {config}=await settings();if(!config.enabled)return [];
    const state=await chrome.storage.local.get(OUTBOX);let outbox=state[OUTBOX]||[];
    for(const intent of [...outbox]){
      diag('REDOWN.EXECUTOR.RECOVERY.REPLAY',intent.idempotencyKey);
      const result=await request(config,'/v2/jobs','POST',intent,intent.idempotencyKey);
      if(!result.durable||!result.job?.jobId)throw Error('DURABLE_ACK_REQUIRED');
      diag('REDOWN.EXECUTOR.ACCEPTANCE.DURABLE_ACK',intent.idempotencyKey);
      outbox=outbox.filter(x=>x.idempotencyKey!==intent.idempotencyKey);await chrome.storage.local.set({[OUTBOX]:outbox});
    }
    const {jobs}=await request(config,'/v2/jobs');
    if(!Array.isArray(jobs))throw Error('INVALID_JOB_LIST');
    await chrome.storage.local.set({[CACHE]:jobs});
    if(root.RedownTransferProjection)await root.RedownTransferProjection.reconcile(jobs);
    return jobs;
  });}
  async function cancel(jobId){const {config}=await settings();if(!/^[a-f0-9-]{36}$/.test(jobId))throw Error('INVALID_JOB');return request(config,'/v2/jobs/'+jobId+'/cancel','POST',{});}
  function handles(message){return ['remoteTransferJobs','remoteTransferCancel'].includes(message?.type);}
  async function handle(message){
    if(message.type==='remoteTransferJobs')return {ok:true,jobs:await reconcile()};
    if(message.type==='remoteTransferCancel')return {ok:true,...await cancel(message.jobId)};
    throw Error('UNKNOWN_REMOTE_REQUEST');
  }
  root.RedownRemoteTransfers={settings,submit,reconcile,cancel,handles,handle};
})(globalThis);
