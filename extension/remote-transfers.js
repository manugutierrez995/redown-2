// Feature-gated control plane only: no source byte fetch or automatic browser fallback.
(function(root){
  const CONFIG='redownRemoteExecutorV1',OUTBOX='redownRemoteOutboxV1',CACHE='redownRemoteProjectionV2';
  let serial=Promise.resolve();
  function locked(fn){const next=serial.then(fn);serial=next.catch(()=>{});return next;}
  async function settings(){const s=await chrome.storage.local.get([CONFIG,'redownTransferPolicyV1']);return {config:s[CONFIG]||{},policy:s.redownTransferPolicyV1||{preferredMode:'browser-assisted',allowBrowserFallback:true}};}
  async function request(config,path,method='GET',body){
    const u=new URL(config.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Executor must use HTTPS');
    const response=await fetch(u.origin+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'REMOTE_API_FAILURE');return result;
  }
  async function submit(profile,sourceUrl,prefix,filename){return locked(async()=>{
    const {config,policy}=await settings();
    if(!config.enabled){if(policy.preferredMode==='fully-remote')throw Error('Fully Remote requires an enabled executor. No legacy transfer started.');return null;}
    if(policy.preferredMode==='browser-assisted')return null;
    if(!/^https?:\/\//i.test(sourceUrl))throw Error('Needs browser access: this URL cannot be retrieved remotely. No fallback has been started.');
    const key=[String(prefix||'').replace(/\/$/,''),filename].filter(Boolean).join('/');
    const intent={idempotencyKey:crypto.randomUUID(),sourceUrl,destination:{accountId:profile.accountId,bucket:profile.bucketName,key},
      requestedMode:policy.preferredMode==='fully-remote'?'fully-remote':'automatic',policy:{allowBrowserFallback:policy.allowBrowserFallback,overwrite:policy.overwrite||'skip-existing'}};
    const state=await chrome.storage.local.get(OUTBOX);const outbox=state[OUTBOX]||[];
    outbox.push(intent);await chrome.storage.local.set({[OUTBOX]:outbox});
    // If acknowledgment is lost, preserve intent and replay exactly the same key on alarm/restart.
    let result;try{result=await request(config,'/v2/jobs','POST',intent);}catch(error){throw Error('Remote acceptance unknown; request retained for reconciliation. '+error.message);}
    if(result.durable!==true||!result.job?.jobId)throw Error('Remote service did not acknowledge durable acceptance');
    await chrome.storage.local.set({[OUTBOX]:outbox.filter(x=>x.idempotencyKey!==intent.idempotencyKey)});
    return 'remote-job:'+result.job.jobId;
  });}
  async function reconcile(){return locked(async()=>{
    const {config}=await settings();if(!config.enabled)return [];
    const state=await chrome.storage.local.get(OUTBOX);let outbox=state[OUTBOX]||[];
    for(const intent of [...outbox]){
      const result=await request(config,'/v2/jobs','POST',intent);
      if(!result.durable||!result.job?.jobId)throw Error('DURABLE_ACK_REQUIRED');
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
