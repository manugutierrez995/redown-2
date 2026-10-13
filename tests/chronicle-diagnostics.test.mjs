import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {mkdtemp,appendFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import '../extension/diagnostic-core.js';
import '../extension/diagnostic-recorder.js';
import {createChronicleApi} from '../agent/chronicle/api.mjs';
import {FileJournal,ChronicleFileJournal} from '../packages/content-chronicle/file-journal.mjs';
import {createHash} from 'node:crypto';
import {createArchive,restoreArchive,createHistoryVault} from '../packages/content-chronicle/archive.mjs';
import {createChronicleIndex} from '../packages/content-chronicle/indexeddb.mjs';
import {createChronicleRecorder} from '../packages/content-chronicle/recorder.mjs';
import {capture,toProvenance,exportSnapshot,importSnapshot,lookup} from '../packages/content-chronicle/index.mjs';
import {R2Gateway} from '../remote/adapters/r2-gateway.mjs';
const C=globalThis.RedownDiagnosticCore,R=globalThis.RedownDiagnosticRecorder;
const background=readFileSync('extension/background.js','utf8');
const events=[],recorderAttempts=[];let seq=0;
function observer(list=events){return {emit(code,traceId,details,ctx={}){list.push(C.event(code,{traceId,eventId:'fixture:'+ ++seq,occurredAt:'2026-10-12T00:00:00Z',observationLevel:'simulated',...ctx},details));}};}
function browser(state={},fetchImpl=()=>assert.fail('inspection/blocked branch fetched'),list=events){
 const context=vm.createContext({URL,Blob,AbortSignal,Response,setTimeout,clearTimeout,queueMicrotask,Date,console,crypto:{randomUUID},atob,fetch:fetchImpl,
  RedownDiagnostics:observer(list),chrome:{storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),set:async patch=>Object.assign(state,patch)}}}});
 vm.runInContext(readFileSync('extension/remote-transfers.js','utf8'),context);return context;
}
function extract(begin,end,context){const i=background.indexOf(begin);assert.ok(i>=0);const j=background.indexOf(end,i);assert.ok(j>i);vm.runInContext(background.slice(i,j),context);}
const profile={id:'profile',accountId:'account',bucketName:'bucket'};
const mk=(id='e')=>capture({id,time:'2026-10-12T00:00:00Z',overUrl:'https://hitomi.la/galleries/123.html?token=private',filename:'archive.zip',size:3,references:[{role:'asset-url',url:'https://cdn.test/x?sig=private'}]});
test('actual context-menu Hitomi policy emits intentional browser block; direct source stays distinct',async()=>{
 const state={redownTransferPolicyV1:{preferredMode:'fully-remote',allowBrowserFallback:false}},ctx=browser(state);
 ctx.getProfiles=async()=>[profile];ctx.notify=async()=>{};ctx.selectedUrl=info=>info.srcUrl||info.linkUrl||info.pageUrl;
 ctx.chrome.contextMenus={onClicked:{addListener(fn){ctx.onClick=fn;}}};
 ctx.initiateHitomiCapture=()=>assert.fail('blocked gallery injected page');
 extract('chrome.contextMenus.onClicked.addListener','chrome.runtime.onMessage.addListener',ctx);
 await ctx.onClick({menuItemId:'quick:profile',pageUrl:'https://hitomi.la/galleries/123.html',linkUrl:'javascript:download()'},{id:1,url:'https://hitomi.la/galleries/123.html'});
 const hitomi=events.filter(e=>e.code==='REDOWN.MODE.POLICY.BROWSER_REQUIRED_BLOCK').at(-1);assert.ok(hitomi);
 assert.ok(events.some(e=>e.traceId===hitomi.traceId&&e.code==='REDOWN.SOURCE.URL.BROWSER_ONLY'));
 const api=createChronicleApi({events});const coverage=api.query('getStageCoverage',{traceId:hitomi.traceId}).data;
 assert.equal(coverage.find(s=>s.stage==='upload').status,'not-observed');
 state.redownTransferPolicyV1={preferredMode:'automatic',allowBrowserFallback:true};let started=0;
 ctx.initiateHitomiCapture=async()=>{started++;};
 await ctx.onClick({menuItemId:'quick:profile',pageUrl:'https://hitomi.la/galleries/123.html'},{id:1,url:'https://hitomi.la/galleries/123.html'});
 assert.equal(started,1);assert.ok(events.some(e=>e.code==='REDOWN.MODE.POLICY.BROWSER_SELECTED'));
});
test('actual executor disabled, invalid HTTPS, permission denial, uncertain response, durable replay boundaries',async()=>{
 const state={redownRemoteExecutorV1:{enabled:false},redownTransferPolicyV1:{preferredMode:'fully-remote'}},ctx=browser(state);
 await assert.rejects(ctx.RedownRemoteTransfers.submit(profile,'https://source.test/x','','x','disabled'),/enabled executor/);
 assert.ok(events.some(e=>e.traceId==='disabled'&&e.code==='REDOWN.EXECUTOR.PREFLIGHT.NOT_CONFIGURED'));
 state.redownRemoteExecutorV1={enabled:true,url:'http://executor.test',token:'TOKEN_MUST_NOT_LEAK'};
 await assert.rejects(ctx.RedownRemoteTransfers.submit(profile,'https://source.test/x','','x','bad-https'));
 assert.ok(events.some(e=>e.traceId==='bad-https'&&e.code==='REDOWN.EXECUTOR.PREFLIGHT.HTTPS_REQUIRED'));
 state.redownRemoteExecutorV1.url='https://executor.test';ctx.fetch=async()=>Response.json({error:'SECRET_UNTRUSTED_ERROR'},{status:403});
 await assert.rejects(ctx.RedownRemoteTransfers.submit(profile,'https://source.test/x','','x','denied'));
 assert.ok(events.some(e=>e.traceId==='denied'&&e.code==='REDOWN.EXECUTOR.ACCEPTANCE.PERMISSION_DENIED'));
 ctx.fetch=async()=>{throw Error('response lost');};
 await assert.rejects(ctx.RedownRemoteTransfers.submit(profile,'https://source.test/x?sig=private','','x','lost'));
 assert.ok(events.some(e=>e.traceId==='lost'&&e.code==='REDOWN.EXECUTOR.ACCEPTANCE.RESPONSE_UNKNOWN'));
 const restarted=browser(state,async(url,init)=>init.method==='POST'?Response.json({durable:true,job:{jobId:'job'}}):Response.json({jobs:[]}));
 await restarted.RedownRemoteTransfers.reconcile();assert.equal(state.redownRemoteOutboxV1.length,0);
 assert.ok(events.some(e=>e.traceId==='lost'&&e.code==='REDOWN.EXECUTOR.RECOVERY.REPLAY'));
 assert.ok(events.some(e=>e.traceId==='lost'&&e.code==='REDOWN.EXECUTOR.ACCEPTANCE.DURABLE_ACK'));
 assert.ok(!JSON.stringify(C.bundle(events)).includes('TOKEN_MUST_NOT_LEAK'));
});
function hitomiContext(){
 const ctx=browser();ctx.hitomiIntents=new Map();ctx.HITOMI_MAX_BYTES=64*1024*1024;
 ctx.markHitomiQueue=async()=>{};ctx.recordTransfer=async()=>{};ctx.notify=async()=>{};ctx.cleanExplorerName=x=>x;ctx.cleanExplorerPrefix=x=>x;ctx.publicAssetUrl=()=> 'https://public.test/x';
 ctx.preparedProfile=async()=>({workerUrl:'https://worker.test',token:'PRIVATE_TOKEN'});
 extract('async function handleHitomiCaptureMessage','chrome.runtime.onInstalled.addListener',ctx);return ctx;
}
const sender={tab:{id:1},url:'https://hitomi.la/galleries/123.html'};
test('actual Hitomi start/chunk/finish paths aggregate bytes, retain guard, acknowledge without verified claim',async()=>{
 const ctx=hitomiContext();const intent={profile,jobId:'hitomi-success',prefix:'chosen',state:'armed',chunks:[],size:0};ctx.hitomiIntents.set(1,intent);
 await assert.rejects(ctx.handleHitomiCaptureMessage({type:'hitomiCaptureStart',size:64*1024*1024+1},sender),/64 MiB/);
 assert.ok(events.some(e=>e.code==='REDOWN.HITOMI.CAPTURE.SIZE_LIMIT'));
 const start=await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureStart',size:3,filename:'a.zip'},sender);
 await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureChunk',id:start.id,data:btoa('abc')},sender);
 let uploads=0;ctx.fetch=async(_url,init)=>{uploads++;assert.equal(await init.body.text(),'abc');return Response.json({ok:true,publicUrl:'https://public.test/x'});};
 await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureFinish',id:start.id},sender);assert.equal(uploads,1);
 const trace=events.filter(e=>e.traceId==='hitomi-success');assert.ok(trace.some(e=>e.code==='REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED'));
 assert.ok(trace.some(e=>e.code==='REDOWN.VERIFICATION.READBACK.NOT_OBSERVED'));assert.ok(!trace.some(e=>e.code.includes('VERIFIED')));
 assert.equal(trace.filter(e=>e.code.includes('CHUNK')).length,0);
 await assert.rejects(ctx.handleHitomiCaptureMessage({type:'hitomiCaptureFinish',id:start.id},sender),/No active/);
 assert.ok(events.some(e=>e.code==='REDOWN.HITOMI.CAPTURE.SESSION_MISSING'));
});
test('actual Hitomi failure paths retain chunk mismatch, incomplete ZIP, R2 503 and independent recorder outcomes',async()=>{
 const ctx=hitomiContext();const intent={profile,jobId:'hitomi-failed',prefix:'',state:'armed',chunks:[],size:0};ctx.hitomiIntents.set(1,intent);
 const start=await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureStart',size:3,filename:'a.zip'},sender);
 await assert.rejects(ctx.handleHitomiCaptureMessage({type:'hitomiCaptureChunk',id:start.id,data:btoa('abcd')},sender),/Invalid/);
 await assert.rejects(ctx.handleHitomiCaptureMessage({type:'hitomiCaptureFinish',id:start.id},sender),/Incomplete/);
 await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureChunk',id:start.id,data:btoa('abc')},sender);
 ctx.fetch=async()=>Response.json({ok:false,error:'secret'},{status:503});
 await assert.rejects(ctx.handleHitomiCaptureMessage({type:'hitomiCaptureFinish',id:start.id},sender),/secret/);
 for(const code of ['HITOMI.CAPTURE.CHUNK_INVALID','HITOMI.CAPTURE.INCOMPLETE','R2.UPLOAD.RESPONSE_503','TRANSFER.UPLOAD.FAILED'])assert.ok(events.some(e=>e.code==='REDOWN.'+code));
 assert.ok(!JSON.stringify(C.bundle(events)).includes('"secret"'));
 ctx.hitomiIntents.set(1,{...intent,state:'armed',chunks:[],size:0});await ctx.handleHitomiCaptureMessage({type:'hitomiCaptureError',error:'SECRET_PRIVATE_PAGE_ERROR'},sender);
 assert.ok(events.some(e=>e.code==='REDOWN.HITOMI.CAPTURE.ERROR_REPORTED'));
});
test('actual ordinary ingest emits ack, uncertainty and HTTP symptoms, but throwing diagnostics never breaks success',async()=>{
 const ctx=browser({redownRemoteExecutorV1:{enabled:false},redownTransferPolicyV1:{preferredMode:'browser-assisted'}},async()=>Response.json({ok:true,publicUrl:'https://public.test/x'}));
 ctx.preparedProfile=async()=>({workerUrl:'https://worker.test',token:'private'});ctx.cleanExplorerPrefix=x=>x;ctx.publicAssetUrl=()=>'';
 extract('async function ingestCloudflareAtPrefix','async function ingestCloudflare(profile',ctx);
 assert.equal(await ctx.ingestCloudflareAtPrefix(profile,'https://source.test/x','','x','ordinary'),'https://public.test/x');
 ctx.RedownDiagnostics={emit(){throw Error('quota');}};
 assert.equal(await ctx.ingestCloudflareAtPrefix(profile,'https://source.test/x','','x','observer-failure'),'https://public.test/x');
 ctx.RedownDiagnostics=observer();ctx.fetch=async()=>Response.json({ok:false},{status:503});await assert.rejects(ctx.ingestCloudflareAtPrefix(profile,'https://source.test/x','','x','ordinary-503'));
 assert.ok(events.some(e=>e.traceId==='ordinary-503'&&e.code==='REDOWN.R2.UPLOAD.RESPONSE_503'));
});
test('actual R2 adapter errors emit 503, denied HTTP and lost response without changing retry policy',async()=>{
 for(const [status,code] of [[503,'RESPONSE_503'],[403,'HTTP_REJECTED'],[0,'NETWORK_UNKNOWN']]){
 const gateway=new R2Gateway({url:'https://gateway.test',token:'SECRET',accountId:'a',bucket:'b',diagnostics:observer(),traceId:'gateway-'+status,fetchImpl:async()=>{if(!status)throw Error('lost');return Response.json({},{status});}});
 await assert.rejects(gateway.request('inspect',{key:'private/name'}),e=>e.code==='DESTINATION_'+(status||'NETWORK'));
 assert.ok(events.some(e=>e.traceId==='gateway-'+status&&e.code==='REDOWN.R2.UPLOAD.'+code));
 }
});
test('bounded recorder overflow, write failure/retry/quota and independent metadata success/failure',async()=>{
 const persisted=[],tasks=[];let fail=true;
 const r=R.createRecorder({maxQueue:2,schedule:fn=>tasks.push(fn),append:async batch=>{recorderAttempts.push(...batch);if(fail){fail=false;throw Object.assign(Error('private'),{name:'QuotaExceededError'});}for(const e of batch)if(!persisted.some(x=>x.eventId===e.eventId))persisted.push(e);},load:async()=>persisted});
 r.emit('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED','recording');r.emit('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED','recording');assert.equal(r.emit('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED','recording'),false);
 assert.equal(r.health().pending,2);await r.flush();
 for(const code of ['CHRONICLE.JOURNAL.RECORDING_GAP','CHRONICLE.JOURNAL.QUOTA_EXHAUSTED','CHRONICLE.JOURNAL.RETRY','CHRONICLE.JOURNAL.APPENDED'])assert.ok(persisted.some(e=>e.code==='REDOWN.'+code));
 const exhausted=R.createRecorder({schedule:()=>{},append:async batch=>{recorderAttempts.push(...batch);throw Error('disk');}});exhausted.emit('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED','independent');const result=await exhausted.flush();assert.equal(result.persisted,0);assert.ok(exhausted.snapshot().some(e=>e.code==='REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP'));
 const ok=R.createRecorder({schedule:()=>{},append:async batch=>persisted.push(...batch)});ok.emit('REDOWN.TRANSFER.UPLOAD.FAILED','failed-transfer');await ok.flush();assert.ok(persisted.some(e=>e.traceId==='failed-transfer'&&e.code==='REDOWN.CHRONICLE.JOURNAL.APPENDED'));
 const metadata=[];const m=createChronicleRecorder({schedule:()=>{},append:async batch=>metadata.push(...batch)});assert.equal(m.observe({id:'bad',overUrl:'javascript:bad'}),false);assert.equal(m.observe({...mk('metadata'),overUrl:mk().page.overUrl}),true);await m.flush();assert.equal(metadata.length,1);
});
test('durable journal fsync, replay after new instance/cache reset, torn tail and ID conflicts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'redown-journal-'));try{const path=join(dir,'events.jsonl'),j=new FileJournal(path,{diagnostics:observer()});const e=C.event('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED',{traceId:'disk',eventId:'disk:1'},{});
 await j.append([e]);await j.append([e]);assert.equal((await new FileJournal(path).load()).length,1);
 const bundle=C.bundle(await j.load());assert.deepEqual(C.importBundle(JSON.stringify(bundle)).events,[e]);
 await assert.rejects(j.append([{...e,details:{changed:1}}]),/ID_CONFLICT/);
 await appendFile(path,'{"broken":');const r=await j.recover();assert.equal(r.tailCorrupt,true);assert.deepEqual(r.events,[e]);await assert.rejects(j.append([e]),/TAIL_REPAIR/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('causal query gives evidence-backed first divergence, preserves unknown future codes, and is pure',()=>{
 const es=['success','failure'].flatMap(traceId=>[C.event('REDOWN.SOURCE.URL.BROWSER_ONLY',{traceId,eventId:traceId+':1'},{})]);
 es.push(C.event('REDOWN.MODE.POLICY.BROWSER_SELECTED',{traceId:'success',eventId:'success:2',causalLinks:['success:1']},{}));
 es.push(C.event('REDOWN.MODE.POLICY.BROWSER_REQUIRED_BLOCK',{traceId:'failure',eventId:'failure:2',causalLinks:['failure:1']},{}));
 const api=createChronicleApi({events:es});assert.equal(api.query('findFirstDivergence',{successTraceId:'success',failedTraceId:'failure'}).data.first.stage,'policy');
 const before=JSON.stringify(es);for(const operation of api.query('describeCapabilities').data.operations){api.query(operation,{traceId:'failure',successTraceId:'success',failedTraceId:'failure',code:es[0].code,eventId:'none'});}assert.equal(JSON.stringify(es),before);
 const future={...es[0],code:'REDOWN.FUTURE.STAGE.NEW',message:'OAuth TOKEN_VALUE',component:'/home/private/PRIVATE_NAME'};const decoded=C.importBundle(JSON.stringify(C.bundle([future])));assert.equal(decoded.events[0].code,future.code);assert.ok(!JSON.stringify(decoded).includes('TOKEN_VALUE'));assert.ok(!JSON.stringify(decoded).includes('PRIVATE_NAME'));
 assert.equal(api.query('getTransferTrace',{traceId:'absent'}).error.code,'TRACE_NOT_FOUND');
 const missing=createChronicleApi({events:[es[0],es[2]]});assert.equal(missing.query('findFirstDivergence',{successTraceId:'success',failedTraceId:'failure'}).error.code,'TRACE_NOT_FOUND');
});
test('adversarial URLs/titles/headers/private paths never reach diagnostic persistence or export; input bounds',()=>{
 const secrets=['TOKEN_VALUE','COOKIE_VALUE','PRIVATE_NAME','PRIVATE_BYTES'];
 const e=C.event('REDOWN.CONTEXT.SELECTION.OBSERVED',{traceId:'privacy',eventId:'privacy:1'},{sourceUrl:'https://u:TOKEN_VALUE@example.test/path/PRIVATE_NAME?sig=COOKIE_VALUE#PRIVATE_BYTES',title:'<script>TOKEN_VALUE</script>',filename:'/home/user/PRIVATE_NAME',authorization:'Bearer TOKEN_VALUE',headers:{cookie:'COOKIE_VALUE'},body:'PRIVATE_BYTES'});
 const text=JSON.stringify(C.bundle([e]));for(const s of secrets)assert.ok(!text.includes(s));assert.ok(!text.includes('/home/user'));
 assert.throws(()=>C.importBundle('{malformed'));assert.throws(()=>C.importBundle(JSON.stringify({format:'future'})));assert.throws(()=>C.bundle(Array(C.LIMITS.events+1).fill(e)),/INVALID_EVENTS/);
 const many={};for(let i=0;i<1000;i++)many['name'+i]='private';assert.ok(Object.keys(C.sanitize(many)).length<=32);
 const r=R.createRecorder({enabled:false,schedule:()=>assert.fail('normal mode scheduled verbose diagnostics'),append:()=>assert.fail('normal mode persisted verbose diagnostics')});for(let i=0;i<10000;i++)assert.equal(r.emit(e.code,'off'),false);assert.equal(r.health().pending,0);
});
test('recognition never proves same bytes; versioned provenance mapping and roundtrip',()=>{
 const a=mk('a'),b=mk('b');assert.equal(lookup([a,b],{overUrl:a.page.overUrl,filename:a.filename,size:a.size}).status,'possible-match');assert.equal(a.integrity,'unknown');
 assert.deepEqual(importSnapshot(exportSnapshot([b,a])),[a,b]);const p=toProvenance(a);assert.equal(p.schemaVersion,1);assert.equal(p.integrity.status,'unknown');assert.equal(p.page.siteItemId,'hitomi:123');
});
test('every emitted diagnostic resolves to documented source anchor; registry support is honest',()=>{
 assert.ok(events.length>15);for(const e of events){const d=C.definition(e.code);assert.equal(d.support,'implemented');assert.ok(d.humanMeaning);assert.ok(d.testFixtureIds.length);for(const ref of d.relatedSourceAnchors)assert.ok(readFileSync(ref.path,'utf8').includes(ref.anchor),ref.path+' '+ref.anchor);}
});

test('IndexedDB atomic activation, partial/stale markers, abort and cache reset keep file truth unknown',async()=>{
 const stores=new Map([['events',new Map()],['meta',new Map()]]);let abort=false;
 const indexedDB={open(){const r={};queueMicrotask(()=>{r.result={transaction(names,mode){
  const working=new Map([...stores].map(([name,m])=>[name,new Map(m)]));
  const tx={objectStore(name){return {clear(){working.get(name).clear();},put(e){working.get(name).set(e.id,e);},get(id){const request={};queueMicrotask(()=>{request.result=working.get(name).get(id);request.onsuccess();});return request;},getAll(){const request={};queueMicrotask(()=>{request.result=[...working.get(name).values()];request.onsuccess();});return request;}};}};
  setTimeout(()=>{if(abort&&mode==='readwrite')tx.onabort();else{if(mode==='readwrite')for(const [name,m] of working)stores.set(name,m);tx.oncomplete();}},0);return tx;
 },close(){}};r.onsuccess();});return r;}};
 const index=createChronicleIndex(indexedDB,{diagnostics:observer()});
 await index.activate(exportSnapshot([mk('indexed')]),{revision:'one',complete:false});assert.equal((await index.freshness('one')).status,'partial');assert.equal((await index.freshness('two')).status,'stale');
 abort=true;await assert.rejects(index.activate(exportSnapshot([mk('replacement')]),{revision:'two'}),/TRANSACTION/);abort=false;assert.equal(importSnapshot(await index.export())[0].id,'indexed');
 stores.get('events').clear();stores.get('meta').clear();assert.equal((await index.freshness('one')).status,'missing');assert.equal((await index.freshness('one')).fileExistence,'unknown');
});
test('browser recorder persists sanitized bundle across background restart; Debug Mode consent and retention',async()=>{
 const state={redownDebugSettingsV1:{enabled:true,retentionHours:24}},jobs=[];
 function start(){const ctx=vm.createContext({URL,Date,crypto:{randomUUID},setTimeout:fn=>{jobs.push(fn);},chrome:{storage:{local:{get:async k=>Object.fromEntries((Array.isArray(k)?k:[k]).map(key=>[key,state[key]])),set:async p=>Object.assign(state,p)}}}});
  for(const name of ['diagnostic-core.js','diagnostic-recorder.js','chronicle-domain.js','diagnostic-browser.js'])vm.runInContext(readFileSync('extension/'+name,'utf8'),ctx);return ctx.RedownDiagnostics;}
 const first=start();await first.ready;first.emit('REDOWN.MODE.POLICY.BROWSER_REQUIRED_BLOCK','restart',{sourceUrl:'https://hitomi.la/path?secret=TOKEN'});
 const exported=await first.handle({type:'diagnosticExport'});assert.equal(exported.bundle.events[0].traceId,'restart');
 const second=start();await second.ready;const replay=await second.handle({type:'diagnosticExport'});assert.equal(replay.bundle.events[0].eventId,exported.bundle.events[0].eventId);assert.ok(!JSON.stringify(state).includes('TOKEN'));
 await second.handle({type:'diagnosticSettings',enabled:false,retentionHours:1});const count=state.redownDiagnosticJournalV1.length;second.emit('REDOWN.TRANSFER.UPLOAD.STARTED','off');await second.recorder.flush();assert.equal(state.redownDiagnosticJournalV1.length,count);
 // Profile reset loses browser persistence; exported bytes independently survive.
 const outside=JSON.stringify(exported.bundle);delete state.redownDiagnosticJournalV1;assert.equal(C.importBundle(outside).events[0].traceId,'restart');
});

test('actual injected Hitomi hook succeeds or reports injection symptom without guessing a page-world cause',async()=>{
 const ctx=browser();ctx.hitomiDestination=()=>({profile,prefix:''});ctx.hitomiIntents=new Map();ctx.readHitomiQueue=async()=>[];ctx.HITOMI_QUEUE_KEY='queue';ctx.markHitomiQueue=async()=>{};ctx.notify=async()=>{};
 ctx.chrome.alarms={create(){}};const timers=[];ctx.setTimeout=fn=>timers.push(fn);
 ctx.document={querySelector:()=>null,addEventListener(){},removeEventListener(){}};
 ctx.chrome.scripting={executeScript:async options=>{if(options.func)options.func();return [];}};
 extract('async function initiateHitomiCapture','async function handleHitomiCaptureMessage',ctx);
 await assert.rejects(ctx.initiateHitomiCapture({menuItemId:'quick:profile',diagnosticTraceId:'inject-failed'},{id:1,url:'https://hitomi.la/galleries/123.html'},[profile]),/button not found/);
 assert.ok(events.some(e=>e.traceId==='inject-failed'&&e.code==='REDOWN.HITOMI.CAPTURE.INJECTION_FAILED'));
 ctx.URL=class FakeURL {static createObjectURL(){return 'blob:https://hitomi.la/fixture';}};
 ctx.window={postMessage(){}};ctx.document.querySelector=selector=>selector==='#dl-button'?{click(){}}:null;
 await ctx.initiateHitomiCapture({menuItemId:'quick:profile',diagnosticTraceId:'inject-success'},{id:1,url:'https://hitomi.la/galleries/123.html'},[profile]);
 assert.ok(events.some(e=>e.traceId==='inject-success'&&e.code==='REDOWN.HITOMI.CAPTURE.HOOK_INSTALLED'));timers.forEach(fn=>fn());
});
test('segmented archive checksum, scoped restore, opt-in immutable vault and failed backup never alter records',async()=>{
 const sha256=async value=>createHash('sha256').update(value).digest('hex'),records=[mk('one'),mk('two')];
 const archive=await createArchive(records,{scope:{accountId:'account',region:'EU'},revision:'one',segmentEvents:1,sha256});assert.equal(archive.segments.length,2);
 assert.deepEqual((await restoreArchive(archive,{sha256})).events,records);
 const altered=structuredClone(archive);altered.segments[0].jsonl+=' ';await assert.rejects(restoreArchive(altered,{sha256}),/CHECKSUM/);
 const objects=new Map(),vault=createHistoryVault({sha256,putImmutable:async({key,value})=>{if(objects.has(key))throw Error('conflict');objects.set(key,value);},read:async({key})=>objects.get(key)});
 assert.equal((await vault.backup(records,{optIn:false})).state,'disabled');assert.equal(objects.size,0);
 const config={optIn:true,accountId:'account',bucket:'bucket',prefix:'history/redown/',generation:'generation-one',region:'EU'};
 assert.equal((await vault.backup(records,config)).state,'backed-up-readback');assert.equal(vault.shouldIndex('history/redown/generation-one/manifest.json',config),false);
 assert.equal((await vault.backup(records,config)).state,'backup-failed');assert.deepEqual(records,[mk('one'),mk('two')]);
});

test('preflight failure never produces a fabricated upload failure; durable metadata journal recovers independently',async()=>{
 const ctx=browser({redownRemoteExecutorV1:{enabled:false},redownTransferPolicyV1:{preferredMode:'fully-remote'}});
 extract('async function ingestCloudflareAtPrefix','async function ingestCloudflare(profile',ctx);
 await assert.rejects(ctx.ingestCloudflareAtPrefix(profile,'https://source.test/x','','x','not-started'));
 assert.ok(events.some(e=>e.traceId==='not-started'&&e.code==='REDOWN.TRANSFER.REQUEST.NOT_STARTED'));
 assert.ok(!events.some(e=>e.traceId==='not-started'&&e.stage==='upload'));
 const dir=await mkdtemp(join(tmpdir(),'redown-metadata-'));try{const path=join(dir,'metadata.jsonl'),journal=new ChronicleFileJournal(path);
 const r=createChronicleRecorder({append:batch=>journal.append(batch),schedule:()=>{}});r.observe({...mk('durable-metadata'),overUrl:mk().page.overUrl});await r.flush();
 assert.equal((await new ChronicleFileJournal(path).load())[0].id,'durable-metadata');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('registry artifact matches runtime definitions; export size and recursive detail budgets report gaps',()=>{
 const artifact=JSON.parse(readFileSync('contracts/diagnostics/registry-v1.json','utf8'));assert.deepEqual(artifact.codes,C.registry);
 const es=Array.from({length:2000},(_,i)=>C.event('REDOWN.CONTEXT.SELECTION.OBSERVED',{traceId:'budget-'+i,eventId:'budget:'+i,occurredAt:'2026-10-12T00:00:00Z'},{}));
 const b=C.bundle(es);assert.ok(JSON.stringify(b).length<C.LIMITS.bundleBytes);assert.ok(b.manifest.exportGap);assert.ok(b.manifest.omittedTraceReports>0);assert.ok(C.importBundle(JSON.stringify(b)).events.length>0);
 const api=createChronicleApi();const r=api.query('listDiagnosticCodes');r.data.items[0].relatedSourceAnchors[0].path='mutated';assert.notEqual(api.query('listDiagnosticCodes').data.items[0].relatedSourceAnchors[0].path,'mutated');
});

test('projection failure is independently emitted; archive exact observed coverage for review',async()=>{
 const saved=[];const r=R.createRecorder({schedule:()=>{},load:async()=>saved,append:async batch=>{saved.push(...batch);recorderAttempts.push(...batch);},projection:async()=>{throw Error('cache unavailable');}});
 r.emit('REDOWN.TRANSFER.UPLOAD.ACKNOWLEDGED','projection-failed');await r.flush();await r.flush();assert.ok(saved.some(e=>e.code==='REDOWN.CHRONICLE.INDEX.UNAVAILABLE'));
 const observed=new Set([...events,...recorderAttempts].map(e=>e.code));
 const report={scope:'simulated actual emitting boundaries; no installed Chrome or live R2 proof',codes:C.registry.map(d=>({code:d.code,support:d.support,emittingBoundaryExercised:observed.has(d.code),source:d.relatedSourceAnchors})),testedCodes:C.registry.filter(d=>observed.has(d.code)).length,totalCodes:C.registry.length};
 assert.equal(report.codes.filter(d=>d.support==='implemented'&&!d.emittingBoundaryExercised).length,0,'every supported registry code needs an exercised emitter');
 if(process.env.REDOWN_WRITE_DIAGNOSTIC_FIXTURES==='1'){
  const {writeFile}=await import('node:fs/promises');await writeFile('work/chronicle-verification/emission-coverage.json',JSON.stringify(report,null,2)+'\n');
  await writeFile('work/chronicle-verification/observed-acceptance-bundle.json',JSON.stringify(C.bundle(events),null,2)+'\n');
 }
});

test('Debug Mode UI persists explicit consent, uses text-only timelines, and exports on user action',async()=>{
 const {JSDOM}=await import('jsdom');const dom=new JSDOM(readFileSync('extension/options.html','utf8'),{url:'https://extension.test/options.html',runScripts:'outside-only'}),w=dom.window;
 let enabled=false,exports=0;const requests=[];
 const bundle=C.bundle([C.event('REDOWN.MODE.POLICY.BROWSER_REQUIRED_BLOCK',{traceId:'ui',eventId:'ui:1'}, {})]);bundle.events[0].message='<img src=x onerror="globalThis.pwned=true">';
 w.chrome={runtime:{sendMessage:async message=>{requests.push(message.type);if(message.type==='diagnosticSettings'){if(message.enabled!==undefined)enabled=message.enabled;return {ok:true,settings:{enabled,retentionHours:24}};}exports++;return {ok:true,bundle};}}};
 w.Blob=Blob;w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.eval(readFileSync('extension/diagnostic-options.js','utf8'));await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(exports,0);const toggle=w.document.getElementById('diagnostic-enable');toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(enabled,true);
 w.document.getElementById('diagnostic-refresh').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(w.document.getElementById('diagnostic-timeline').querySelector('img'),null);assert.equal(w.pwned,undefined);
 w.document.getElementById('diagnostic-export').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(exports,2);dom.window.close();
});
