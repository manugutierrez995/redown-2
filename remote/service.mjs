import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {executeTransfer,TransferError} from '../packages/transfer-core/index.mjs';
import {Ledger,publicJob,exportJSONL} from './store.mjs';
import {HttpSource} from './adapters/http-source.mjs';
import {R2Gateway} from './adapters/r2-gateway.mjs';
export const nodeHash={create(){const h=createHash('sha256');return {update:b=>h.update(b),digest:()=>h.digest('hex')};}};
export function authenticate(header,tenants) {
  if(typeof header!=='string'||!header.startsWith('Bearer '))return null;
  const candidate=Buffer.from(header.slice(7));
  return tenants.find(t=>{const token=Buffer.from(t.token);return token.length===candidate.length&&timingSafeEqual(token,candidate);})||null;
}
async function jsonBody(request) {
  let size=0;const chunks=[];
  for await(const chunk of request){size+=chunk.length;if(size>16384)throw new TransferError('REQUEST_BUDGET');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new TransferError('INVALID_JSON');}
}
export function createService({ledger,tenants,source,destinationFor,partBytes=8*1024*1024,fault,now=Date.now}) {
  const rates=new Map();let running=false;
  const server=http.createServer(async(req,res)=>{
    const reply=(status,body,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(type==='application/json'?JSON.stringify(body):body);};
    const tenant=authenticate(req.headers.authorization,tenants);
    if(!tenant)return reply(401,{error:'UNAUTHORIZED'});
    const rate=rates.get(tenant.id)||{at:now(),count:0};if(now()-rate.at>=60000){rate.at=now();rate.count=0;}
    rates.set(tenant.id,rate);if(++rate.count>600)return reply(429,{error:'RATE_LIMIT'});
    try {
      const url=new URL(req.url,'http://service');
      if(req.method==='POST'&&url.pathname==='/v2/jobs') {
        const input=await jsonBody(req);
        const d=input.destination;
        if(!tenant.destinations.some(s=>s.accountId===d?.accountId&&s.bucket===d?.bucket&&d.key?.startsWith(s.prefix||'')))throw new TransferError('DESTINATION_SCOPE');
        const job=ledger.submit(input,tenant.id,tenant.limits);
        await fault?.('after:accept'); // Lost response replays same idempotency key.
        return reply(202,{durable:true,job:publicJob(job)});
      }
      if(req.method==='GET'&&url.pathname==='/v2/jobs')return reply(200,{jobs:ledger.list(tenant.id).map(publicJob)});
      if(req.method==='GET'&&url.pathname==='/v2/export')return reply(200,exportJSONL(ledger,tenant.id),'application/x-ndjson');
      const m=url.pathname.match(/^\/v2\/jobs\/([a-f0-9-]{36})(\/cancel|\/events)?$/);
      if(!m)return reply(404,{error:'NOT_FOUND'});
      const job=ledger.get(m[1],tenant.id);if(!job)return reply(404,{error:'NOT_FOUND'});
      if(req.method==='GET')return reply(200,m[2]==='/events'?{events:ledger.events(job.jobId,tenant.id)}:{job:publicJob(job)});
      if(req.method==='POST'&&m[2]==='/cancel')return reply(200,{job:publicJob(ledger.cancel(job.jobId,tenant.id))});
      return reply(405,{error:'METHOD'});
    } catch(e) {return reply(e.code==='DESTINATION_SCOPE'?403:e.code==='IDEMPOTENCY_CONFLICT'?409:e.code==='QUEUE_BUDGET_EXCEEDED'?429:400,{error:e.code||'INVALID_REQUEST'});}
  });
  async function tick() {
    if(running)return null;const job=ledger.claim();if(!job)return null;running=true;
    const heartbeat=setInterval(()=>{try{ledger.heartbeat(job.jobId,job.lease);}catch{}},Math.max(10,ledger.leaseMs/3));heartbeat.unref();
    try {return await executeTransfer(job,{store:ledger,source,destination:destinationFor(job),hash:nodeHash,clock:{now},partBytes,fault});}
    finally {clearInterval(heartbeat);running=false;}
  }
  return {server,tick};
}
export function fromConfig(config) {
  if(!Array.isArray(config.tenants)||!config.tenants.length||config.tenants.some(t=>!t.id||typeof t.token!=='string'||t.token.length<32))throw Error('INVALID_TENANT_CONFIG');
  const ledger=new Ledger(config.database);
  const source=new HttpSource({allowedHosts:config.allowedSourceHosts});
  const gateways=config.gateways.map(g=>{if(new URL(g.url).protocol!=='https:')throw Error('GATEWAY_HTTPS_REQUIRED');return new R2Gateway(g);});
  if(new Set(config.tenants.map(t=>t.id)).size!==config.tenants.length||new Set(config.tenants.map(t=>t.token)).size!==config.tenants.length)throw Error('DUPLICATE_TENANT_CONFIG');
  for(const t of config.tenants)if(!Array.isArray(t.destinations)||t.destinations.some(d=>!gateways.some(g=>g.accountId===d.accountId&&g.bucket===d.bucket)))throw Error('DESTINATION_CONFIG_MISSING');
  const service=createService({ledger,tenants:config.tenants,source,destinationFor(job){
    const gateway=gateways.find(g=>g.accountId===job.destination.accountId&&g.bucket===job.destination.bucket);
    if(!gateway)throw new TransferError('DESTINATION_UNCONFIGURED');return gateway;
  }});
  return {...service,ledger};
}
