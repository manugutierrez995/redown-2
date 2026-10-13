// Read-only pure snapshot API. No file access, network, Chrome, clocks or write ports.
import '../../extension/diagnostic-core.js';
import {lookup,toProvenance,importSnapshot,exportSnapshot} from '../../packages/content-chronicle/index.mjs';
const C=globalThis.RedownDiagnosticCore;
const operations=['describeCapabilities','describeEventSchema','describeStages','listAdapters','getCoverageMatrix','listDiagnosticCodes','describeDiagnosticCode','listTransfers','getTransferTrace','getTimeline','getDecisionTrace','listTraceCodes','getCausalChain','getStageCoverage','explainTransferFailure','explainFailure','getRetryAndFallbackTrace','findFirstDivergence','compareSuccessfulAndFailedTraces','validateRecords','validateDiagnosticBundle','suggestSafeReproduction','exportDiagnosticBundle','listChronicleEvents','findPossibleDuplicates','getProvenance','getSourceUrlRoles','getIndexFreshness','getJournalHealth','getBackupStatus','getQueueSnapshot','explainVerification','explainCleanupEligibility','planVerification'];
const gaps=[{stage:'native',support:'unavailable',reason:'No built native companion'},{stage:'backup',support:'planned',reason:'No authorized live R2 history vault adapter'},{stage:'source',support:'unavailable',reason:'Remote DNS, redirects and body events not collected by browser recorder'},{stage:'index',support:'implemented',reason:'Atomic activation after browser metadata append; cache is disposable'},{stage:'capture',support:'implemented',reason:'Background messages; page-world individual button/hook outcomes not instrumented'},{stage:'verification',support:'derived',reason:'Browser upload acknowledgment does not prove integrity; remote job readback remains independent'}];
const page=(values,a)=>{const limit=a.limit??100,offset=a.offset??0;if(!Number.isInteger(limit)||limit<1||limit>200||!Number.isInteger(offset)||offset<0)throw Error('INVALID_PAGE');return {items:values.slice(offset,offset+limit),total:values.length,nextOffset:offset+limit<values.length?offset+limit:null};};
export function createChronicleApi({events=[],chronicle=[],health={}}={}){
 const v=C.validate(events);if(!v.valid)throw Error('INVALID_RECORDS');const snapshot=JSON.parse(JSON.stringify(events)),history=importSnapshot(exportSnapshot(chronicle)),capturedHealth=JSON.parse(JSON.stringify(health));
 function trace(id){if(typeof id!=='string'||id.length>128)throw Error('TRACE_ID_REQUIRED');const es=snapshot.filter(e=>e.traceId===id);if(!es.length)throw Error('TRACE_NOT_FOUND');return es;}
 function differences(a,b){const left=C.coverage(trace(a)),right=C.coverage(trace(b));return left.map((s,i)=>{
  const l=trace(a).filter(e=>e.stage===s.stage),r=trace(b).filter(e=>e.stage===s.stage);
  return {stage:s.stage,left:s,right:right[i],leftCodes:[...new Set(l.map(e=>e.code))],rightCodes:[...new Set(r.map(e=>e.code))],
    evidenceBacked:l.length>0&&r.length>0,diverges:l.length>0&&r.length>0&&JSON.stringify([...new Set(l.map(e=>e.code))].sort())!==JSON.stringify([...new Set(r.map(e=>e.code))].sort())};});}
 function query(op,a={}){try{
  if(!a||typeof a!=='object'||Array.isArray(a))throw Error('INVALID_ARGUMENTS');
  let data;
  const es=()=>trace(a.traceId);
  switch(op){
   case 'describeCapabilities':data={apiVersion:1,operations:operations.slice().sort(),boundary:'offline-read-only',executionAuthorized:false,coverage:gaps,limits:C.LIMITS};break;
   case 'describeEventSchema':data={schema:'contracts/diagnostics/event-v1.schema.json',version:1,registryVersion:1};break;
   case 'describeStages':data=C.STAGES;break;
   case 'listAdapters':data=[{id:'browser-storage',support:'implemented',durability:'profile-local; erasable'}, {id:'fs-jsonl',support:'implemented',durability:'single-writer fsync; host disk required'}, {id:'indexeddb',support:'implemented',durability:'disposable'}, {id:'r2-history',support:'planned'}];break;
   case 'getCoverageMatrix':data={stages:gaps,codes:C.registry.map(d=>({code:d.code,support:d.support,source:d.relatedSourceAnchors})),liveAcceptance:'unavailable'};break;
   case 'listDiagnosticCodes':data=page(C.registry,a);break;
   case 'describeDiagnosticCode':data=C.definition(a.code);break;
   case 'listTransfers':data=page([...new Set(snapshot.map(e=>e.traceId))].sort(),a);break;
   case 'getTransferTrace':case 'getTimeline':data={...page(es(),a),coverage:C.coverage(es()),ordering:'capture order; UTC may skew; explicit causal links are evidence',missingCausalLinks:es().flatMap(e=>e.causalLinks.filter(id=>!snapshot.some(x=>x.eventId===id)))};break;
   case 'getCausalChain':{const nodes=es(),byId=new Map(nodes.map(e=>[e.eventId,e]));data={nodes:page(nodes,a),edges:nodes.flatMap(e=>e.causalLinks.map(id=>({from:id,to:e.eventId,relation:e.causalLinkSemantics||'unspecified',support:byId.has(id)?'observed-boundary-link':'missing-observation'}))),limitations:'Preceding instrumented boundaries are causal navigation, not proof of an underlying provider root cause'};break;}
   case 'listTraceCodes':data=page([...new Set(es().map(e=>e.code))].map(C.definition),a);break;
   case 'getDecisionTrace':data=page(es().filter(e=>['decision','safety-block'].includes(e.outcome)),a);break;
   case 'getRetryAndFallbackTrace':data=page(es().filter(e=>/RETRY|REPLAY|BROWSER_SELECTED|BLOCK|UNKNOWN/.test(e.code)),a);break;
   case 'getStageCoverage':data=C.coverage(es());break;
   case 'explainTransferFailure':case 'explainFailure':data={claims:C.explain(es()),coverage:C.coverage(es()),rootCause:'Only directly observed boundary conditions are established; downstream absence is unknown'};break;
   case 'findFirstDivergence':case 'compareSuccessfulAndFailedTraces':{const ds=differences(a.successTraceId,a.failedTraceId);data={first:ds.find(d=>d.diverges)||null,stages:ds,limitations:'Earliest lifecycle stage with different observed codes, not a guessed root cause; missing stages cannot establish divergence'};break;}
   case 'validateRecords':case 'validateDiagnosticBundle':data=a.bundle?{valid:true,events:C.importBundle(JSON.stringify(a.bundle)).events.length}:C.validate(snapshot);break;
   case 'exportDiagnosticBundle':data=C.bundle(snapshot,capturedHealth);break;
   case 'suggestSafeReproduction':data={executionAuthorized:false,offlineCommand:'node --test --test-isolation=none tests/chronicle-diagnostics.test.mjs',evidence:C.explain(es()),liveActions:'Proposed only: use a separate opt-in browser test profile; cloud operations require separate authorization'};break;
   case 'listChronicleEvents':data=page(history,a);break;
   case 'findPossibleDuplicates':data={...lookup(history,a),byteEquality:'unknown',cleanupEligible:false};break;
   case 'getProvenance':case 'getSourceUrlRoles':{const e=history.find(e=>e.id===a.eventId);if(!e)throw Error('EVENT_NOT_FOUND');data=op==='getProvenance'?toProvenance(e):{page:e.page,references:e.references,clickedAction:e.clickedAction||'not-observed'};break;}
   case 'getJournalHealth':case 'getQueueSnapshot':data={captured:capturedHealth,liveState:'not-observed',complete:false};break;
   case 'getIndexFreshness':data={status:'not-observed',reason:'No index metadata supplied; absence does not imply file loss'};break;
   case 'getBackupStatus':data={status:'disabled',support:'planned',remoteGeneration:'not-observed'};break;
   case 'explainVerification':data={claims:C.explain(es().filter(e=>e.stage==='verification')),status:es().some(e=>e.stage==='verification')?'reported-by-boundary':'not-observed',independentReadback:'not-established-by-this-diagnostic-trace'};break;
   case 'explainCleanupEligibility':data={eligible:false,reason:'No cleanup authority; recognition and imported evidence cannot authorize deletion'};break;
   case 'planVerification':data={execute:false,steps:['Inspect exact destination and durable job acknowledgment','Obtain separately authorized independent readback hash/size evidence','Compare source-byte digest and readback digest'],status:'proposed'};break;
   default:throw Error('UNSUPPORTED_OPERATION');
  }return {ok:true,apiVersion:1,data:JSON.parse(JSON.stringify(data))};
 }catch(e){return {ok:false,apiVersion:1,error:{code:/^[A-Z_]+$/.test(e.message)?e.message:'INVALID_REQUEST'},data:null};}}
 return Object.freeze({query});
}
