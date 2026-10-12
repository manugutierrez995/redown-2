import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Ledger,publicJob,exportJSONL,readProjectionJSONL,migrateV1} from '../remote/store.mjs';
import {createService} from '../remote/service.mjs';
import {HttpSource,publicIPv4} from '../remote/adapters/http-source.mjs';
import {R2Gateway} from '../remote/adapters/r2-gateway.mjs';
import {validateSubmission,validateKey} from '../packages/transfer-core/index.mjs';
import {listen,gatewayFixture} from './helpers/transfer-fixtures.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const location={accountId:'fixture-account',bucket:'fixture-bucket',key:'nested/exact/ground-truth.bin'};
async function harness(t,handler,options={}) {
 const root=await mkdtemp(join(tmpdir(),'transfer-ledger-'));let now=100000;
 const fixture=await listen(handler),gateway=await gatewayFixture();
 const path=join(root,'jobs.sqlite');const ledger=new Ledger(path,{now:()=>now});
 const source=new HttpSource({allowedHosts:['127.0.0.1'],fixtureLoopback:true,timeoutMs:2000,totalMs:10000});
 const destination=new R2Gateway({url:gateway.url,token:'gateway-test-secret',...location});
 const tenants=[{id:'tenant-a',token:'test-token',destinations:[{...location,prefix:'nested/'}],limits:{maxBytes:16*1024*1024,maxAttempts:3}},
 {id:'tenant-b',token:'other-token',destinations:[{...location,prefix:'other/'}]}];
 const service=createService({ledger,tenants,source,destinationFor:()=>destination,partBytes:5*1024*1024,now:()=>now,...options});
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+service.server.address().port;
 t.after(async()=>{service.server.closeAllConnections();await new Promise(r=>service.server.close(r));ledger.close();await fixture.close();await gateway.close();await rm(root,{recursive:true,force:true});});
 const submit=async(extra={})=>{const response=await fetch(url+'/v2/jobs',{method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},body:JSON.stringify({sourceUrl:fixture.url+'/data',destination:location,idempotencyKey:'fixture-idempotency',...extra})});return {status:response.status,...await response.json()};};
 return {root,path,fixture,gateway,ledger,source,destination,service,submit,url,advance:()=>{now+=61000;}};
}
test('production HTTP adapter -> executor -> actual gateway -> R2 fixture, multipart SHA256, browser closed, ledger restart',async t=>{
 const bytes=Buffer.alloc(11*1024*1024+17);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
 let requests=0;
 const h=await harness(t,(req,res)=>{requests++;res.writeHead(200,{etag:'"ground-truth"'});for(let i=0;i<bytes.length;i+=73199)res.write(bytes.subarray(i,i+73199));res.end();});
 const accepted=await h.submit();assert.equal(accepted.status,202);assert.equal(accepted.durable,true);assert.equal(requests,0);
 // No browser connection remains. Remote polling/executor owns all source I/O.
 const duplicate=await h.submit();assert.equal(duplicate.job.jobId,accepted.job.jobId);
 const job=await h.service.tick();assert.equal(job.state,'verified');assert.equal(job.verification.sourceDigest,digest(bytes));
 assert.equal(job.verification.destinationDigest,digest(bytes));assert.equal(job.bytes,bytes.length);
 assert.deepEqual(job.verification.location,location);assert.ok(h.gateway.bucket.partSizes.length>=3);assert.ok(Math.max(...h.gateway.bucket.partSizes)<=5*1024*1024);
 const restarted=new Ledger(h.path);assert.equal(restarted.get(job.jobId).state,'verified');restarted.close();
 const poll=await fetch(h.url+'/v2/jobs/'+job.jobId,{headers:{authorization:'Bearer test-token'}});assert.equal((await poll.json()).job.state,'verified');
 assert.equal(h.gateway.bucket.published,1);assert.equal((await h.submit({sourceUrl:h.fixture.url+'/changed'})).status,409);
 console.log(JSON.stringify({evidence:'local-R2-fixture',bytes:job.bytes,sha256:digest(bytes),sourceRequests:requests,parts:h.gateway.bucket.partSizes,browserByteRelay:false,ledger:publicJob(job)}));
});
test('known length, empty object, short stream reset, byte quota, permanent statuses and retries',async t=>{
 for(const status of [401,403,404,429,503])await t.test('HTTP '+status,async t=>{
  let count=0;const h=await harness(t,(req,res)=>{count++;res.writeHead(count===1?status:200,{'content-length':'3'});res.end('abc');});
  await h.submit();const first=await h.service.tick();
  assert.equal(first.state,[429,503].includes(status)?'retry-wait':[401,403].includes(status)?'needs-auth':'terminal-failed');
  if(first.state==='retry-wait'){h.advance();assert.equal((await h.service.tick()).state,'verified');}
 });
 await t.test('empty',async t=>{const h=await harness(t,(q,r)=>{r.writeHead(200,{'content-length':'0'});r.end();});await h.submit();assert.equal((await h.service.tick()).state,'verified');});
 await t.test('oversize preflight',async t=>{const h=await harness(t,(q,r)=>{r.writeHead(200,{'content-length':String(17*1024*1024)});r.end();});await h.submit();assert.equal((await h.service.tick()).errorCode,'BYTE_BUDGET_EXCEEDED');});
 await t.test('short read',async t=>{const h=await harness(t,(q,r)=>{r.writeHead(200,{'content-length':'100'});r.write('abc');r.end();});await h.submit();assert.equal((await h.service.tick()).state,'retry-wait');});
});
test('SSRF, redirect, rebinding, range/encoding and changed validator fail closed',async t=>{
 for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','192.168.1.1','100.64.0.1','::1','::ffff:8.8.8.8','224.0.0.1'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
 const source=new HttpSource({allowedHosts:['allowed.test'],resolve:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]});
 await assert.rejects(source.address(new URL('https://allowed.test')),/SSRF_BLOCKED/);
 const h=await harness(t,(q,r)=>{r.writeHead(302,{location:'http://169.254.169.254/latest/meta-data'});r.end();});await h.submit();assert.equal((await h.service.tick()).errorCode,'SOURCE_HOST_DENIED');
 for(const sourceUrl of ['blob:https://example.com/1','data:text/plain,secret','https://user:pass@example.com/'])assert.throws(()=>validateSubmission({idempotencyKey:'validation-test',sourceUrl,destination:location}));
 for(const key of ['../escape','a/../b','/root','a\\b','a//b','.redown-transfer/x'])assert.throws(()=>validateKey(key));
 assert.throws(()=>validateSubmission({idempotencyKey:'validation-test',sourceUrl:'https://example.com',destination:location,resume:true}),/RESUME_UNSUPPORTED/);
 await t.test('206 without requested range rejected',async t=>{const h=await harness(t,(q,r)=>{r.writeHead(206,{'content-range':'bytes 2-4/9'});r.end('abc');});await h.submit();assert.equal((await h.service.tick()).errorCode,'SOURCE_206');});
 await t.test('source changed on retry',async t=>{let n=0;const h=await harness(t,(q,r)=>{r.writeHead(200,{etag:++n===1?'"one"':'"two"'});r.end('abc');},{fault:async p=>{if(p==='before:commit'&&n===1){const e=Error('simulated reset');e.code='SIMULATED_RESET';e.retryable=true;throw e;}}});await h.submit();assert.equal((await h.service.tick()).state,'retry-wait');h.advance();assert.equal((await h.service.tick()).errorCode,'SOURCE_CHANGED');});
});
test('auth isolation, destination scope, quota, replay and projection redaction',async t=>{
 const h=await harness(t,(q,r)=>r.end('abc'));assert.equal((await fetch(h.url+'/v2/jobs')).status,401);
 assert.equal((await h.submit({destination:{...location,key:'outside/a'}})).status,403);
 const accepted=await h.submit({sourceUrl:h.fixture.url+'/data?signature=secret'});assert.equal(accepted.status,202);
 const other=await fetch(h.url+'/v2/jobs/'+accepted.job.jobId,{headers:{authorization:'Bearer other-token'}});assert.equal(other.status,404);
 const otherCancel=await fetch(h.url+'/v2/jobs/'+accepted.job.jobId+'/cancel',{method:'POST',headers:{authorization:'Bearer other-token'}});assert.equal(otherCancel.status,404);
 const exported=exportJSONL(h.ledger,'tenant-a');assert.ok(!exported.includes('secret'));assert.ok(!exported.includes('signature'));
 assert.equal(readProjectionJSONL(exported).records.length,1);assert.equal(readProjectionJSONL(exported+'{"incomplete"').incompleteTail,true);
 assert.equal(migrateV1({schemaVersion:1,jobId:'legacy',state:'completed'}).state,'unverified');
});
test('lease fencing, concurrent claims, cancellation before completion, existing equal-size content never verified',async t=>{
 const h=await harness(t,(q,r)=>r.end('abc'));const a=await h.submit();const job=h.ledger.claim();
 const other=new Ledger(h.path,{now:()=>100000});assert.equal(other.claim(),null);other.close();
 h.advance();const next=h.ledger.claim();assert.notEqual(job.lease,next.lease);await assert.rejects(h.ledger.checkpoint(job.jobId,job.lease,'preflight',{},0),/LEASE_LOST/);
 h.advance();h.ledger.cancel(a.job.jobId,'tenant-a');assert.equal((await h.service.tick()).state,'cancelled');
 assert.equal(h.gateway.bucket.published,0);
 await t.test('skip unrelated content',async t=>{const h=await harness(t,(q,r)=>r.end('abc'));await h.gateway.bucket.put(location.key,Buffer.from('xyz'));await h.submit();const j=await h.service.tick();assert.equal(j.state,'skipped');assert.equal(j.verification,undefined);});
});
test('readback hash mismatch and missing read permission preserve unverified outcome',async t=>{
 for(const condition of ['corrupt','readDenied'])await t.test(condition,async t=>{
  const h=await harness(t,(q,r)=>r.end('abc'));h.gateway.bucket[condition]=true;await h.submit();let j=await h.service.tick();
  while(j.state==='retry-wait'){h.advance();j=await h.service.tick();}
  assert.equal(j.state,'unverified');assert.equal(j.cleanup,'not-applicable');
 });
});
test('crash checkpoints recover through durable lease takeover and destination reconciliation',async t=>{
 for(const point of ['before:preflight','after:preflight','before:transferring','after:transferring','before:part','after:part-effect','before:final-part','after:final-part','before:commit','after:commit','before:verifying','after:verifying','after:verified'])await t.test(point,async t=>{
  let failed=false;const bytes=Buffer.alloc(5*1024*1024+3,71);
  const h=await harness(t,(q,r)=>r.end(bytes),{fault:async p=>{if(p===point&&!failed){failed=true;const e=Error('SIMULATED_CRASH');e.crash=true;throw e;}}});
  const a=await h.submit();await assert.rejects(h.service.tick(),/SIMULATED_CRASH/);assert.equal(failed,true);
  h.advance();const result=await h.service.tick();const j=result||h.ledger.get(a.job.jobId);
  assert.equal(j.state,'verified');assert.equal(j.verification.destinationDigest,digest(bytes));assert.equal(h.gateway.bucket.published,1);
 });
});
test('independent plain JavaScript consumer requires no Chrome, Redown or build tools',()=>{
 const r=spawnSync(process.execPath,['examples/transfer/consumer.mjs'],{encoding:'utf8'});assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).version,'0.1.0');
});

test('lost durable acknowledgment can be replayed without a duplicate job or transfer',async t=>{
 let lost=false;const h=await harness(t,(q,r)=>r.end('abc'),{fault:async p=>{if(p==='after:accept'&&!lost){lost=true;throw Error('SIMULATED_LOST_ACK');}}});
 assert.equal((await h.submit()).status,400);assert.equal(h.ledger.list().length,1);
 const replay=await h.submit();assert.equal(replay.status,202);assert.equal(h.ledger.list().length,1);
 assert.equal((await h.service.tick()).state,'verified');assert.equal(h.gateway.bucket.published,1);
});
test('cancellation after publication resolves as verified and never promises deletion',async t=>{
 let h;h=await harness(t,(q,r)=>r.end('abc'),{fault:async p=>{if(p==='after:commit'){const j=h.ledger.list()[0];h.ledger.cancel(j.jobId,'tenant-a');}}});
 await h.submit();const j=await h.service.tick();assert.equal(j.state,'verified');assert.equal(j.cancel,true);assert.equal(j.cleanup,'not-applicable');
});
test('streamed unknown-length quota, network timeout, destination race and permission gates',async t=>{
 await t.test('stream quota',async t=>{const h=await harness(t,(q,r)=>{r.writeHead(200);r.end(Buffer.alloc(4096));});
  const j=h.ledger.submit({sourceUrl:h.fixture.url+'/data',destination:location,idempotencyKey:'small-byte-limit'},'tenant-a',{maxBytes:1024});
  assert.equal((await h.service.tick()).errorCode,'BYTE_BUDGET_EXCEEDED');assert.equal(h.gateway.bucket.published,0);
 });
 await t.test('timeout',async t=>{const h=await harness(t,(q,r)=>{});h.source.timeoutMs=20;await h.submit();assert.equal((await h.service.tick()).state,'retry-wait');});
 await t.test('race',async t=>{let h;h=await harness(t,(q,r)=>r.end('abc'),{fault:async p=>{if(p==='before:commit')await h.gateway.bucket.put(location.key,Buffer.from('xyz'));}});await h.submit();assert.equal((await h.service.tick()).errorCode,'DESTINATION_RACE');
  assert.equal(await (await import('node:fs/promises')).readFile(h.gateway.bucket.path(location.key),'utf8'),'xyz');
 });
 for(const allowBrowserFallback of [true,false])await t.test('browser gate '+allowBrowserFallback,async t=>{
  const h=await harness(t,(q,r)=>assert.fail('browser gate fetched source'));await h.submit({requestedMode:'browser-assisted',policy:{allowBrowserFallback}});
  const j=await h.service.tick();assert.equal(j.state,'needs-browser');assert.equal(j.policy.allowBrowserFallback,allowBrowserFallback);assert.equal(h.gateway.bucket.published,0);
 });
 await t.test('pending quota',async t=>{const h=await harness(t,(q,r)=>r.end('abc'));const spec={sourceUrl:h.fixture.url+'/data',destination:location,idempotencyKey:'first-limit-key'};
  h.ledger.submit(spec,'tenant-a',{maxPending:1});assert.throws(()=>h.ledger.submit({...spec,idempotencyKey:'second-limit-key'},'tenant-a',{maxPending:1}),/QUEUE_BUDGET_EXCEEDED/);
 });
});

test('separate remote executor process crashes after publication; browser detached and restarted executor verifies without re-fetch',async t=>{
 const {spawn}=await import('node:child_process');const root=await mkdtemp(join(tmpdir(),'transfer-process-'));
 const bytes=Buffer.alloc(6*1024*1024+1,137);let sourceRequests=0;
 const fixture=await listen((q,r)=>{sourceRequests++;r.end(bytes);}),gateway=await gatewayFixture();const children=[];
 t.after(async()=>{for(const child of children)if(child.exitCode===null){child.kill('SIGKILL');await new Promise(r=>child.once('exit',r));}await fixture.close();await gateway.close();await rm(root,{recursive:true,force:true});});
 const config={database:join(root,'jobs.sqlite'),destination:location,gateway:gateway.url};
 async function start(extra={}) {const child=spawn(process.execPath,['tests/helpers/executor-process.mjs',JSON.stringify({...config,...extra})],{stdio:['ignore','pipe','pipe']});children.push(child);
  const ready=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',b=>{output+=b;const m=output.match(/READY (\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});child.once('exit',code=>reject(Error('executor exited '+code)));});return {child,url:ready};}
 const first=await start({crashAt:'after:commit'});const exit=new Promise(r=>first.child.once('exit',r));
 const accepted=await (await fetch(first.url+'/v2/jobs',{method:'POST',headers:{authorization:'Bearer fixture-token','content-type':'application/json'},body:JSON.stringify({sourceUrl:fixture.url+'/data',destination:location,idempotencyKey:'process-recovery-test'})})).json();
 assert.equal(accepted.durable,true);assert.equal(await exit,86);
 // There is no remaining client connection. Start another executor over the same durable volume.
 const second=await start();let job;const deadline=Date.now()+10000;
 do {await new Promise(r=>setTimeout(r,50));job=(await (await fetch(second.url+'/v2/jobs/'+accepted.job.jobId,{headers:{authorization:'Bearer fixture-token'}})).json()).job;}
 while(job.state!=='verified'&&Date.now()<deadline);
 assert.equal(job.state,'verified');assert.equal(job.verification.destinationDigest,digest(bytes));assert.equal(sourceRequests,1);assert.equal(gateway.bucket.published,1);
 console.log(JSON.stringify({evidence:'separate-process-local-R2-fixture',crashExit:86,bytes:bytes.length,sha256:digest(bytes),sourceRequests,browserDetached:true}));
});

test('later multipart and proof checkpoints also recover after crashes',async t=>{
 for(const when of ['before:transferring','after:transferring'])for(const ordinal of [2,3,4])await t.test(when+' #'+ordinal,async t=>{
  let count=0;const bytes=Buffer.alloc(5*1024*1024+7,37);const h=await harness(t,(q,r)=>r.end(bytes),{fault:async p=>{if(p===when&&++count===ordinal){const e=Error('SIMULATED_CHECKPOINT_CRASH');e.crash=true;throw e;}}});
  await h.submit();await assert.rejects(h.service.tick(),/SIMULATED_CHECKPOINT_CRASH/);h.advance();const j=await h.service.tick();assert.equal(j.state,'verified');assert.equal(j.verification.destinationDigest,digest(bytes));
 });
});
test('uncertain R2 create, multipart completion and final publication effects reconcile without false success',async t=>{
 for(const point of ['before-create','after-create','before-complete','after-complete','before-put','after-put'])await t.test(point,async t=>{
  const h=await harness(t,(q,r)=>r.end('abc'));let failed=false;
  h.gateway.bucket.fault=async p=>{if(p===point&&!failed){failed=true;throw Error('SIMULATED_R2_LOST_RESPONSE');}};
  await h.submit();let j=await h.service.tick();while(j.state==='retry-wait'){h.advance();j=await h.service.tick();}
  assert.equal(failed,true);assert.equal(j.state,'verified');assert.equal(j.verification.destinationDigest,digest(Buffer.from('abc')));assert.equal(h.gateway.bucket.published,1);
 });
});
