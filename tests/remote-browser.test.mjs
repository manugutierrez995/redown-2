import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const source=readFileSync('extension/remote-transfers.js','utf8');
const background=readFileSync('extension/background.js','utf8');
function browser(state,fetchImpl) {
 const context=vm.createContext({URL,AbortSignal,crypto:{randomUUID},fetch:fetchImpl,chrome:{storage:{local:{
  get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),set:async patch=>Object.assign(state,patch)}}}});
 vm.runInContext(source,context);return context;
}
const profile={accountId:'account',bucketName:'chosen-bucket'};
test('actual background ingestion uses remote control only, exact bucket/prefix; lost acknowledgment replays after browser restart',async()=>{
 const state={redownRemoteExecutorV1:{enabled:true,url:'https://executor.test',token:'scope-token'},redownTransferPolicyV1:{preferredMode:'fully-remote',allowBrowserFallback:false}};
 let lost=true;const bodies=[],requests=[];const jobId=randomUUID();
 const fetchImpl=async(url,init)=>{requests.push(url);assert.ok(url.startsWith('https://executor.test/v2/'));if(init.method==='POST'){
  bodies.push(JSON.parse(init.body));if(lost){lost=false;throw Error('lost response');}return Response.json({durable:true,job:{jobId}});
 }return Response.json({jobs:[{schemaVersion:2,jobId,state:'verified',bytes:3,destination:{accountId:'account',bucket:'chosen-bucket',key:'deep/exact/name.bin'}}]});};
 const first=browser(state,fetchImpl);
 // Execute the actual integrated function, with legacy preparation forbidden.
 first.preparedProfile=()=>assert.fail('remote submission prepared/deployed legacy Worker');
 const begin=background.indexOf('async function ingestCloudflareAtPrefix('),end=background.indexOf('async function ingestCloudflare(profile',begin);
 vm.runInContext(background.slice(begin,end),first);
 await assert.rejects(vm.runInContext(`ingestCloudflareAtPrefix(${JSON.stringify(profile)},"https://source.test/asset.bin","deep/exact","name.bin")`,first),/acceptance unknown/);
 assert.equal(state.redownRemoteOutboxV1.length,1);
 // Discard the whole first VM/browser runtime. A new runtime replays the persisted intent.
 const second=browser(state,fetchImpl);const jobs=await second.RedownRemoteTransfers.reconcile();
 assert.equal(jobs[0].state,'verified');assert.equal(bodies[0].idempotencyKey,bodies[1].idempotencyKey);
 assert.deepEqual(bodies[0].destination,{accountId:'account',bucket:'chosen-bucket',key:'deep/exact/name.bin'});
 assert.equal(bodies[0].requestedMode,'fully-remote');assert.equal(state.redownRemoteOutboxV1.length,0);
 assert.equal(state.redownRemoteProjectionV2[0].jobId,jobId);assert.equal(requests.length,3);
});
test('feature gating, unsupported browser URL, fallback flags and Fully Remote missing executor never fetch source',async()=>{
 const state={redownRemoteExecutorV1:{enabled:false},redownTransferPolicyV1:{preferredMode:'browser-assisted'}};
 const context=browser(state,()=>assert.fail('unexpected fetch'));
 assert.equal(await context.RedownRemoteTransfers.submit(profile,'https://source.test/x','a','x'),null);
 state.redownTransferPolicyV1.preferredMode='fully-remote';await assert.rejects(context.RedownRemoteTransfers.submit(profile,'https://source.test/x','a','x'),/requires an enabled executor/);
 state.redownRemoteExecutorV1={enabled:true,url:'https://executor.test',token:'token'};
 for(const url of ['blob:https://site.test/x','data:text/plain,abc','javascript:run()'])await assert.rejects(context.RedownRemoteTransfers.submit(profile,url,'a','x'),/Needs browser/);
 assert.equal(context.RedownRemoteTransfers.handles({type:'cfObjects'}),false);
 assert.equal(context.RedownRemoteTransfers.handles({type:'remoteTransferJobs'}),true);
 assert.match(background,/HITOMI_MAX_BYTES = 64 \* 1024 \* 1024/);
 assert.match(background,/policy\.allowBrowserFallback===false/);
});
test('IndexedDB projection performs a single replace transaction and preserves authoritative job state',async()=>{
 const stored=new Map();let transactions=0,closed=0;
 const indexedDB={open(){const req={};queueMicrotask(()=>{req.result={objectStoreNames:{contains:()=>true},transaction(name,mode){assert.equal(name,'jobs');assert.equal(mode,'readwrite');transactions++;
  const tx={objectStore:()=>({clear:()=>stored.clear(),put:j=>stored.set(j.jobId,j)})};queueMicrotask(()=>tx.oncomplete());return tx;},close(){closed++;}};req.onsuccess();});return req;}};
 const context=vm.createContext({indexedDB});vm.runInContext(readFileSync('extension/transfer-projection.js','utf8'),context);
 await context.RedownTransferProjection.reconcile([{jobId:'one',state:'queued'}]);await context.RedownTransferProjection.reconcile([{jobId:'one',state:'verified'},{jobId:'two',state:'unverified'}]);
 assert.equal(transactions,2);assert.equal(closed,2);assert.equal(stored.get('one').state,'verified');assert.equal(stored.get('two').state,'unverified');
});
