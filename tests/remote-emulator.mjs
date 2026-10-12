// Explicit acceptance against Wrangler/Miniflare's local R2 + Durable Objects, never live R2.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {listen} from './helpers/transfer-fixtures.mjs';
import {Ledger,publicJob} from '../remote/store.mjs';
import {createService} from '../remote/service.mjs';
import {HttpSource} from '../remote/adapters/http-source.mjs';
import {R2Gateway} from '../remote/adapters/r2-gateway.mjs';
const gatewayUrl=process.argv[2]||'http://127.0.0.1:9891';
const root=await mkdtemp(join(tmpdir(),'redown-miniflare-'));const ledger=new Ledger(join(root,'jobs.sqlite'));
const bytes=Buffer.alloc(6*1024*1024+19,113);let requests=0;
const source=await listen((q,r)=>{requests++;if(q.url==='/empty')r.end();else r.end(bytes);});
const destination={accountId:'emulator',bucket:'replace-with-exact-bucket',key:'acceptance/'+randomUUID()+'.bin'};
const adapter=new R2Gateway({url:gatewayUrl,token:'gateway-test-secret',...destination});
const service=createService({ledger,tenants:[],partBytes:5*1024*1024,source:new HttpSource({allowedHosts:['127.0.0.1'],fixtureLoopback:true}),destinationFor:()=>adapter});
try {
 for(const [name,data] of [['data',bytes],['empty',Buffer.alloc(0)]]) {
  const spec={sourceUrl:source.url+'/'+name,idempotencyKey:randomUUID(),destination:{...destination,key:destination.key+'.'+name}};
  const accepted=ledger.submit(spec,'emulator-tenant');const job=await service.tick();
  assert.equal(job.state,'verified',JSON.stringify({state:job.state,error:job.errorCode}));
  const expected=createHash('sha256').update(data).digest('hex');assert.equal(job.verification.destinationDigest,expected);
  console.log(JSON.stringify({evidence:'Wrangler-Miniflare-local-R2-and-Durable-Objects',bytes:data.length,sha256:expected,ledger:publicJob(job)}));
  const same=ledger.submit({...spec,idempotencyKey:randomUUID()},'emulator-tenant');assert.equal((await service.tick()).state,'skipped');
 }
 const racedLocation={...destination,key:destination.key+'.race'};
 const contenderBytes=Buffer.from('competing-writer');
 const raceService=createService({ledger,tenants:[],partBytes:5*1024*1024,source:new HttpSource({allowedHosts:['127.0.0.1'],fixtureLoopback:true}),destinationFor:()=>adapter,
  fault:async point=>{if(point==='before:commit'){
   const jobId=randomUUID(),upload=await adapter.begin(racedLocation,jobId,randomUUID());
   await adapter.part(upload,1,contenderBytes);
   assert.equal(await adapter.commit(upload,racedLocation,{jobId,bytes:contenderBytes.length,digest:createHash('sha256').update(contenderBytes).digest('hex')}),true);
  }}});
 ledger.submit({sourceUrl:source.url+'/data',idempotencyKey:randomUUID(),destination:racedLocation},'emulator-tenant');
 const raced=await raceService.tick();assert.equal(raced.errorCode,'DESTINATION_RACE');
 let actual=Buffer.alloc(0);for await(const chunk of await adapter.read(racedLocation))actual=Buffer.concat([actual,chunk]);
 assert.deepEqual(actual,contenderBytes);
 assert.equal(requests,3);console.log('PASS: multipart, empty object, conditional publication race preserves competing writer, exact independent readback; no browser byte relay');
}finally{ledger.close();await source.close();await rm(root,{recursive:true,force:true});}
