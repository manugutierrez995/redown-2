/* Portable diagnostic domain v1. No I/O, Chrome, transfer or credential dependencies. */
(function(root){
  'use strict';
  const VERSION=1, FORMAT='redown.diagnostics.v1';
  const LIMITS=Object.freeze({events:2000,lineBytes:16384,bundleBytes:4*1024*1024,depth:6,queue:128});
  const STAGES=['selection','classification','destination','policy','acceptance','queue','capture','source','upload','verification','journal','index','backup','recovery','cleanup'];
  // Immutable IDs: meaning must never change. New causes need new IDs.
  const rows=[
    ['CONTEXT.SELECTION.OBSERVED','selection','success','Context menu action observed','extension/background.js','chrome.contextMenus.onClicked.addListener'],
    ['SOURCE.URL.BROWSER_ONLY','classification','decision','Gallery ZIP is generated inside the browser; gallery HTML is not ZIP bytes','extension/background.js','const onHitomiGallery='],
    ['SOURCE.URL.DIRECT_CANDIDATE','classification','decision','Selected HTTP URL is a remote candidate; retrievability has not been proven','extension/remote-transfers.js','async function submit'],
    ['DESTINATION.RESOLUTION.SELECTED','destination','success','Explicit account, bucket and prefix selected','extension/background.js','async function ingestCloudflareAtPrefix'],
    ['MODE.POLICY.BROWSER_REQUIRED_BLOCK','policy','safety-block','Policy forbids browser assistance for a browser-generated gallery ZIP','extension/background.js','policy.preferredMode==='],
    ['MODE.POLICY.BROWSER_SELECTED','policy','decision','Browser assistance selected; this is not a cloud-to-cloud byte path','extension/remote-transfers.js','async function submit'],
    ['MODE.POLICY.REMOTE_SELECTED','policy','decision','Remote executor selected; no automatic legacy fallback is started','extension/remote-transfers.js','async function submit'],
    ['EXECUTOR.PREFLIGHT.NOT_CONFIGURED','acceptance','safety-block','Fully Remote cannot start because the executor is disabled','extension/remote-transfers.js','if(!config.enabled)'],
    ['EXECUTOR.PREFLIGHT.HTTPS_REQUIRED','acceptance','safety-block','Configured executor URL failed HTTPS/origin validation','extension/remote-transfers.js','Executor must use HTTPS'],
    ['EXECUTOR.ACCEPTANCE.PERMISSION_DENIED','acceptance','symptom','Executor returned 401 or 403; credentials or permissions need separate inspection','extension/remote-transfers.js','async function request'],
    ['EXECUTOR.ACCEPTANCE.RESPONSE_UNKNOWN','acceptance','symptom','Acceptance response was lost or unusable; preserved intent may already have been accepted','extension/remote-transfers.js','Remote acceptance unknown'],
    ['EXECUTOR.ACCEPTANCE.DURABLE_ACK','acceptance','success','Service reported durable job acceptance; this is not completed upload or readback proof','extension/remote-transfers.js','result.durable'],
    ['EXECUTOR.QUEUE.INTENT_PERSISTED','queue','success','Idempotent remote intent persisted before submission','extension/remote-transfers.js','outbox.push(intent)'],
    ['EXECUTOR.RECOVERY.REPLAY','recovery','decision','Persisted intent replayed using the original idempotency key','extension/remote-transfers.js','for(const intent'],
    ['HITOMI.CAPTURE.HOOK_INSTALLED','capture','success','Both injection calls returned after hook installation and click invocation','extension/background.js','async function initiateHitomiCapture'],
    ['HITOMI.CAPTURE.INJECTION_FAILED','capture','symptom','Injection/click invocation failed; exact page-world cause is unobserved','extension/background.js','hitomiIntents.delete(tab.id)'],
    ['HITOMI.CAPTURE.BLOB_OBSERVED','capture','success','Capture start reported a bounded browser-generated ZIP size','extension/background.js','hitomiCaptureStart'],
    ['HITOMI.CAPTURE.SIZE_LIMIT','capture','safety-block','Reported ZIP size is invalid or exceeds the unchanged 64 MiB guard','extension/background.js','HITOMI_MAX_BYTES'],
    ['HITOMI.CAPTURE.SESSION_MISSING','capture','gap','Background capture intent is absent; suspension/restart is only a hypothesis','extension/background.js','No active gallery capture'],
    ['HITOMI.CAPTURE.CHUNK_INVALID','capture','symptom','Observed chunk exceeds expected size or per-message budget','extension/background.js','Invalid gallery ZIP chunk'],
    ['HITOMI.CAPTURE.INCOMPLETE','capture','symptom','Aggregated received bytes differ from reported ZIP size','extension/background.js','Incomplete gallery ZIP'],
    ['HITOMI.CAPTURE.BYTES_READY','capture','success','All expected ZIP bytes received; no per-chunk event logging','extension/background.js','intent.state="uploading"'],
    ['HITOMI.CAPTURE.ERROR_REPORTED','capture','symptom','Page capture reported an error; original private error text is omitted','extension/background.js','hitomiCaptureError'],
    ['TRANSFER.REQUEST.NOT_STARTED','policy','symptom','Browser byte upload was not started; a control-plane or preparation branch threw. Remote acceptance may still be unknown','extension/background.js','async function ingestCloudflareAtPrefix'],
    ['TRANSFER.UPLOAD.STARTED','upload','success','Byte upload started on the selected path','extension/background.js','const response=await fetch(prepared.workerUrl'],
    ['R2.UPLOAD.RESPONSE_503','upload','symptom','Destination returned HTTP 503; underlying provider cause is unknown','remote/adapters/r2-gateway.mjs','async request'],
    ['R2.UPLOAD.HTTP_REJECTED','upload','symptom','Destination returned an unsuccessful HTTP status','remote/adapters/r2-gateway.mjs','async request'],
    ['R2.UPLOAD.NETWORK_UNKNOWN','upload','symptom','Destination response unavailable; a write may have occurred','remote/adapters/r2-gateway.mjs','catch'],
    ['TRANSFER.UPLOAD.ACKNOWLEDGED','upload','success','Destination acknowledged upload; independent integrity remains separate','extension/background.js','body.publicUrl'],
    ['TRANSFER.UPLOAD.FAILED','upload','symptom','Upload boundary threw; original private exception is omitted','extension/background.js','async function ingestCloudflareAtPrefix'],
    ['VERIFICATION.READBACK.NOT_OBSERVED','verification','gap','No independent readback evidence was collected on this path','extension/background.js','async function ingestCloudflareAtPrefix'],
    ['CLEANUP.POLICY.DISABLED','cleanup','safety-block','Diagnostics and chronicle never authorize file deletion','extension/diagnostic-core.js','const STAGES='],
    ['CHRONICLE.JOURNAL.APPENDED','journal','success','Sanitized batch persisted by the recorder adapter','extension/diagnostic-recorder.js','async function flush'],
    ['CHRONICLE.JOURNAL.WRITE_FAILED','journal','symptom','Recorder adapter write rejected; download outcome remains independent','extension/diagnostic-recorder.js','async function flush'],
    ['CHRONICLE.JOURNAL.QUOTA_EXHAUSTED','journal','symptom','Storage adapter reported QuotaExceededError','extension/diagnostic-recorder.js','async function flush'],
    ['CHRONICLE.JOURNAL.RETRY','journal','decision','Same immutable event batch scheduled for another append attempt','extension/diagnostic-recorder.js','async function flush'],
    ['CHRONICLE.JOURNAL.RECORDING_GAP','journal','gap','Recorder queue/budget exhausted or batch could not persist; missing observations are unknown','extension/diagnostic-recorder.js','function gap'],
    ['CHRONICLE.RECOVERY.TAIL_CORRUPT','recovery','gap','Journal has a torn or malformed tail; only validated prefix is recoverable','packages/content-chronicle/file-journal.mjs','recover'],
    ['CHRONICLE.INDEX.ACTIVATED','index','success','Disposable index activated in one transaction','extension/chronicle-index.js','activate'],
    ['CHRONICLE.INDEX.UNAVAILABLE','index','gap','Index unavailable; durable journal and file existence are separate','extension/diagnostic-recorder.js','projection'],
    ['CHRONICLE.BACKUP.DISABLED','backup','safety-block','R2 history backup is off; no logs were uploaded','extension/diagnostic-core.js','function bundle']
  ];
  const nextChecks={
    'MODE.POLICY.BROWSER_REQUIRED_BLOCK':['Select Browser-Assisted explicitly for the gallery ZIP, or test a direct asset URL','Compare Fully Remote direct-MP4 and automatic gallery fixtures; inspect the captured mode branch before investigating R2'],
    'EXECUTOR.PREFLIGHT.NOT_CONFIGURED':['Review the executor enable setting; do not put tokens in support bundles','Inspect the configured/disabled decision and run the disabled-executor fixture; no source request was started by this branch'],
    'EXECUTOR.ACCEPTANCE.RESPONSE_UNKNOWN':['Retain the original pending intent; avoid creating a new download occurrence merely to resolve acknowledgment uncertainty','Propose replay/reconciliation with the original idempotency key; durable acceptance and byte completion remain separate'],
    'EXECUTOR.ACCEPTANCE.PERMISSION_DENIED':['Review executor permission scope without exporting credentials','Reproduce the 403 fixture; a denied response alone cannot distinguish token expiry from scope or policy rejection'],
    'HITOMI.CAPTURE.SIZE_LIMIT':['Use a smaller gallery for the existing capture route','Compare reported ZIP size with the unchanged 64 MiB guard; do not raise the guard without separate evidence'],
    'HITOMI.CAPTURE.SESSION_MISSING':['Reopen the gallery and review the retained queued request','Inspect missing capture session evidence; test restart loss without claiming suspension was the confirmed cause'],
    'R2.UPLOAD.RESPONSE_503':['Keep the original job and inspect its retry/reconciliation state','Reproduce the gateway 503 fixture and inspect the safe action field; do not infer final object absence or delete anything'],
    'CHRONICLE.JOURNAL.RECORDING_GAP':['Export currently available evidence before closing the browser','Inspect gap count and missing event links; reproduce bounded overflow, not a fabricated downstream outcome'],
    'CHRONICLE.JOURNAL.QUOTA_EXHAUSTED':['Export available history and choose shorter diagnostics retention','Run the quota adapter fixture; confirm recorder failure remains independent of transfer acknowledgment'],
    'VERIFICATION.READBACK.NOT_OBSERVED':['Keep the acknowledgment distinct from verified integrity','Propose separately scoped independent readback against the exact destination and an observed source digest'],
    'TRANSFER.UPLOAD.ACKNOWLEDGED':['Retain the acknowledgment and request separate verification evidence if needed','Inspect verification coverage; acknowledgment alone establishes neither source identity nor current object integrity'],
    'CHRONICLE.INDEX.UNAVAILABLE':['Retain the journal/export; index loss does not imply file loss','Rebuild a disposable index from a validated snapshot in the atomic activation fixture'],
    'CHRONICLE.RECOVERY.TAIL_CORRUPT':['Preserve the original journal before any explicit tail repair','Read the validated prefix and corruption marker; reproduce torn-tail handling before proposing repair']
  };
  const registry=Object.freeze(rows.map(([suffix,stage,category,humanMeaning,path,anchor])=>Object.freeze({
    code:'REDOWN.'+suffix,versionIntroduced:1,severity:['symptom','gap'].includes(category)?'warning':'info',category,stage,
    component:path, humanMeaning,knownCauses:category==='symptom'?['Not established by this symptom alone']:[],
    detectionEvidence:'An event emitted by the cited boundary; absence is not evidence of nonexecution',
    userSafeAction:nextChecks[suffix]?.[0]||(category==='safety-block'?'Review policy without disabling safety automatically':'Export a sanitized bundle and inspect the correlated timeline'),
    agentNextDiagnostic:nextChecks[suffix]?.[1]||'Inspect evidence references and stage gaps, then propose an isolated fixture test',
    retryability:category==='symptom'?'policy-dependent':'not-applicable',isTerminal:false,redactionClass:'sanitized-metadata',
    relatedSourceAnchors:[{path,anchor}],testFixtureIds:['chronicle-diagnostics'],documentationRef:'docs/agent/chronicle/API.md',support:suffix==='CHRONICLE.BACKUP.DISABLED'?'planned':'implemented'
  })));
  const byCode=new Map(registry.map(r=>[r.code,r]));
  function definition(code){return byCode.get(code)||{code,humanMeaning:'Unknown future diagnostic code; original ID preserved',support:'unavailable',relatedSourceAnchors:[]};}
  // No arbitrary text persists: free titles, names, headers, exception messages and paths are private.
  function opaque(value){let h=2166136261;for(const c of String(value).slice(0,8192)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'ref-'+(h>>>0).toString(16).padStart(8,'0');}
  function urlRole(value){try{const u=new URL(value);return {protocol:u.protocol,origin:['http:','https:'].includes(u.protocol)?u.origin.replace(/\/\/.*@/,'//'):null,reference:opaque(value),path:'[redacted]',queryRemoved:Boolean(u.search),fragmentRemoved:Boolean(u.hash)};}catch{return {reference:opaque(value),invalid:true};}}
  const symbols=new Set(['browser-assisted','fully-remote','automatic','cloud-to-cloud','inspect','read','begin','part','commit','cleanup','queue-overflow','append-exhausted','retention-limit','export-size-budget','chronicle-overflow','invalid-observation','chronicle-write-rejected','ack-record-failed']);
  function sanitize(input,depth=0,budget={remaining:256}){
    if(--budget.remaining<0)return "[node-limit]";
    if(depth>LIMITS.depth)return '[depth-limit]';
    if(input===null||typeof input==='boolean')return input;
    if(typeof input==='number')return Number.isFinite(input)?input:null;
    if(typeof input==='string')return opaque(input);
    if(Array.isArray(input))return input.slice(0,32).map(x=>sanitize(x,depth+1,budget));
    if(!input||typeof input!=='object')return null;
    const out={};
    for(const key of Object.keys(input).slice(0,32)){
      if(!/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(key)||/token|cookie|authorization|header|password|secret|body|bytes|content|dom|path/i.test(key))continue;
      const v=input[key];out[key]=/url$/i.test(key)?urlRole(v):['action','mode','reason'].includes(key)&&symbols.has(v)?v:sanitize(v,depth+1,budget);
    }return out;
  }
  const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9._:-]{1,128}$/.test(x);
  function event(code,ctx={},details={}){
    const d=definition(code);if(!byCode.has(code))throw Error('UNREGISTERED_CODE');
    if(!validId(ctx.traceId)||!validId(ctx.eventId))throw Error('INVALID_CORRELATION');
    return {schemaVersion:VERSION,code,traceId:ctx.traceId,spanId:ctx.spanId||opaque(ctx.traceId+':'+d.stage), parentSpanId:ctx.parentSpanId||null,
      transferId:ctx.transferId||ctx.traceId,attemptId:ctx.attemptId||null,eventId:ctx.eventId,
      occurredAt:ctx.occurredAt||new Date().toISOString(),clockSource:'wall-clock-utc',stage:d.stage,component:d.component,
      severity:d.severity,outcome:d.category,message:d.humanMeaning,evidenceRefs:d.relatedSourceAnchors,
      causalLinks:(ctx.causalLinks||[]).filter(validId).slice(0,16),causalLinkSemantics:'preceding-instrumented-boundary',environmentVersion:'redown-diagnostics-1',redactionStatus:'sanitized',
      observationLevel:ctx.observationLevel||'measured',details:sanitize(details)};
  }
  const fields=new Set(['schemaVersion','code','traceId','spanId','parentSpanId','transferId','attemptId','eventId','occurredAt','clockSource','stage','component','severity','outcome','message','evidenceRefs','causalLinks','causalLinkSemantics','environmentVersion','redactionStatus','observationLevel','details']);
  function safeDetails(value,depth=0){
    if(depth>LIMITS.depth+1)return false;
    if(value===null||typeof value==='boolean'||typeof value==='number')return true;
    if(typeof value==='string')return symbols.has(value)||/^ref-[a-f0-9]{8}$/.test(value)||['[depth-limit]','[node-limit]','[redacted]','http:','https:','blob:','data:','javascript:','file:'].includes(value)||/^https?:\/\/[a-zA-Z0-9.:[\]-]+$/.test(value);
    if(Array.isArray(value))return value.length<=32&&value.every(x=>safeDetails(x,depth+1));
    return value&&typeof value==='object'&&Object.keys(value).length<=32&&Object.entries(value).every(([k,v])=>/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(k)&&safeDetails(v,depth+1));
  }
  function validate(events){
    const errors=[],ids=new Set();if(!Array.isArray(events)||events.length>LIMITS.events)return {valid:false,errors:['EVENT_BUDGET']};
    events.forEach((e,i)=>{
      if(!e||e.schemaVersion!==1||!validId(e.eventId)||!validId(e.traceId)||!validId(e.spanId)||!STAGES.includes(e.stage)||
        typeof e.code!=='string'||!/^REDOWN\.[A-Z0-9_]+\.[A-Z_]+\.[A-Z0-9_]+$/.test(e.code)||
        !Number.isFinite(Date.parse(e.occurredAt))||e.redactionStatus!=='sanitized'||!Array.isArray(e.causalLinks)||
        !['reported','measured','simulated','inferred','not-observed'].includes(e.observationLevel)||JSON.stringify(e).length>LIMITS.lineBytes)errors.push('INVALID_EVENT:'+i);
      const d=byCode.get(e?.code);
      if(e&&typeof e==='object'&&(Object.keys(e).some(k=>!fields.has(k))||!safeDetails(e.details)||
        !validId(e.transferId)||e.attemptId!==null&&!validId(e.attemptId)||e.parentSpanId!==null&&!validId(e.parentSpanId)||
        !Array.isArray(e.causalLinks)||e.causalLinks.some(x=>!validId(x))||e.causalLinks.length>16||
        d&&(e.stage!==d.stage||e.component!==d.component||e.message!==d.humanMeaning||JSON.stringify(e.evidenceRefs)!==JSON.stringify(d.relatedSourceAnchors))))errors.push('UNSAFE_OR_INCONSISTENT_EVENT:'+i);
      if(ids.has(e?.eventId))errors.push('DUPLICATE_ID:'+i);ids.add(e?.eventId);
    });return {valid:!errors.length,errors};
  }
  function coverage(events){return STAGES.map(stage=>{const es=events.filter(e=>e.stage===stage);return {stage,status:!es.length||es.every(e=>e.outcome==='gap')?'not-observed':es.every(e=>e.outcome==='safety-block')?'skipped-for-reason':'observed',reason:es.length?'Only listed events establish outcomes; gap markers are not execution proof':'No captured evidence; does not imply this stage did not happen',eventIds:es.map(e=>e.eventId)};});}
  function explain(events){return events.map(e=>({claim:definition(e.code).humanMeaning,evidence:[e.eventId],confidence:e.observationLevel==='inferred'?'hypothesis':'boundary-observation',limitations:'Not independent proof of downstream success or a root cause',source:definition(e.code).relatedSourceAnchors,nextSafeStep:definition(e.code).agentNextDiagnostic}));}
  function bundle(events,health={},environment={}){
    const v=validate(events);if(!v.valid)throw Error('INVALID_EVENTS');
    const originalCount=events.length;let size=0;const bounded=[];
    for(let i=events.length-1;i>=0;i--){const bytes=JSON.stringify(events[i]).length*3;if(size+bytes>1024*1024)break;size+=bytes;bounded.unshift(events[i]);}
    events=bounded;const allTraces=[...new Set(events.map(e=>e.traceId))].sort(),traces=allTraces.slice(0,100);
    const result={format:FORMAT,manifest:{schemaVersion:1,registryVersion:1,application:'REDOWN',applicationVersion:/^[0-9]+\.[0-9]+\.[0-9]+$/.test(environment.applicationVersion||'')?environment.applicationVersion:'not-observed',adapterVersion:1,environmentCapabilities:{installedBrowser:'not-certified',liveR2:'not-observed',native:'unavailable',evidenceLevels:[...new Set(events.map(e=>e.observationLevel))].sort()},
      complete:false,exportGap:originalCount>events.length?{code:'REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',reason:'export-size-budget',omittedEvents:originalCount-events.length,occurredAt:null}:null,omittedTraceReports:Math.max(0,allTraces.length-traces.length),provenance:'captured-boundary-observations; installed Chrome and R2 acceptance not certified',
      limits:LIMITS,backup:'disabled',native:'unavailable',index:'disposable',clockSkew:'UTC ordering approximate; causal links take precedence'},
      events:JSON.parse(JSON.stringify(events)).map(e=>byCode.has(e.code)?e:{...e,message:definition(e.code).humanMeaning,evidenceRefs:[],component:'unknown-future-component'}),registry:registry.filter(d=>events.some(e=>e.code===d.code)),
      traces:traces.map(traceId=>{const es=events.filter(e=>e.traceId===traceId);return {traceId,coverage:coverage(es),explanations:explain(es)};}),
      health:sanitize(health),redactionAudit:{status:'sanitized-before-persistence',freeText:'omitted',urls:'origin and opaque reference only',validity:v},
      reproduction:{executable:false,command:'node --test --test-isolation=none tests/chronicle-diagnostics.test.mjs',scope:'deterministic offline fixtures'}};
    if(JSON.stringify(result).length>LIMITS.bundleBytes)throw Error('BUNDLE_BUDGET');return result;
  }
  function importBundle(text){if(typeof text!=='string'||text.length>LIMITS.bundleBytes)throw Error('BUNDLE_BUDGET');const b=JSON.parse(text);if(b.format!==FORMAT||b.manifest?.schemaVersion!==1||!validate(b.events).valid)throw Error('INVALID_BUNDLE');b.events=b.events.map(e=>byCode.has(e.code)?e:{...e,message:definition(e.code).humanMeaning,evidenceRefs:[],component:'unknown-future-component'});b.registry=registry.filter(d=>b.events.some(e=>e.code===d.code));if(!safeDetails(b.health))b.health=sanitize(b.health);return b;}
  root.RedownDiagnosticCore=Object.freeze({VERSION,FORMAT,LIMITS,STAGES,registry,definition,opaque,urlRole,sanitize,event,validate,coverage,explain,bundle,importBundle});
})(globalThis);
