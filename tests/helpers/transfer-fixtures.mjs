// Local R2-compatible binding fixture. Actual gateway and R2Gateway client run unchanged.
import {mkdtemp,mkdir,writeFile,readFile,stat,rm,open,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {createReadStream} from 'node:fs';
import http from 'node:http';
import gateway,{UploadSession} from '../../remote/gateway/index.mjs';
export async function listen(handler) {
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {server,url:'http://127.0.0.1:'+server.address().port,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
export class FakeR2 {
 constructor(root){this.root=root;this.metadata=new Map();this.sessions=new Map();this.partSizes=[];this.readDenied=false;this.corrupt=false;this.published=0;this.fault=async()=>{};}
 path(key){return join(this.root,createHash('sha256').update(key).digest('hex'));}
 async head(key){try{const size=(await stat(this.path(key))).size;return {size,customMetadata:this.metadata.get(key)||{}};}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async get(key){if(this.readDenied&&!key.startsWith('.redown-transfer/'))throw Error('simulated read denial');const h=await this.head(key);if(!h)return null;return {...h,body:Readable.toWeb(createReadStream(this.path(key)))};}
 async put(key,body,options={}) {
  await this.fault('before-put');
  // Atomic create-if-absent fixture: filesystem exclusive creation, not a racy head+put.
  let file;try{file=await open(this.path(key),options.onlyIf?'wx':'w');}catch(e){if(e.code==='EEXIST')return null;throw e;}
  try{if(body instanceof Uint8Array)await file.writeFile(body);else for await(const chunk of body)await file.write(chunk);}
  finally{await file.close();}
  this.metadata.set(key,options.customMetadata||{});if(!key.startsWith('.redown-transfer/'))this.published++;
  if(this.corrupt&&!key.startsWith('.redown-transfer/')){const f=await open(this.path(key),'r+');await f.write(Buffer.from([99]),0,1,0);await f.close();}
  await this.fault('after-put');return await this.head(key);
 }
 async delete(key){await rm(this.path(key),{force:true});this.metadata.delete(key);}
 async createMultipartUpload(key){await this.fault('before-create');const id=randomUUID();const dir=join(this.root,id);await mkdir(dir);this.sessions.set(id,{key,dir});await this.fault('after-create');return {uploadId:id};}
 resumeMultipartUpload(key,id){const s=this.sessions.get(id);if(!s||s.key!==key)throw Error('missing upload');const self=this;return {
  async uploadPart(number,bytes){self.partSizes.push(bytes.length);await writeFile(join(s.dir,String(number)),bytes);return {partNumber:number,etag:createHash('sha256').update(bytes).digest('hex')};},
  async complete(parts){await self.fault('before-complete');const file=await open(self.path(key),'w');try{for(const p of parts)for await(const chunk of createReadStream(join(s.dir,String(p.partNumber))))await file.write(chunk);}finally{await file.close();}await rm(s.dir,{recursive:true,force:true});await self.fault('after-complete');},
  async abort(){await rm(s.dir,{recursive:true,force:true});}
 };}
}
export async function gatewayFixture() {
 const root=await mkdtemp(join(tmpdir(),'transfer-r2-')),bucket=new FakeR2(root),sessions=new Map();
 const env={GATEWAY_TOKEN:'gateway-test-secret',TRANSFER_BUCKET:bucket,UPLOADS:{idFromName:n=>n,get(n){
  if(!sessions.has(n)) {const values=new Map();let chain=Promise.resolve();const state={storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAlarm:async()=>{}},blockConcurrencyWhile(fn){const next=chain.then(fn);chain=next.catch(()=>{});return next;}};sessions.set(n,new UploadSession(state,env));}
  return sessions.get(n);
 }}};
 const server=await listen(async(req,res)=>{try{const body=req.method==='POST'?Readable.toWeb(req):undefined;
  const response=await gateway.fetch(new Request('http://gateway'+req.url,{method:req.method,headers:req.headers,body,duplex:'half'}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();
 }catch{res.writeHead(500);res.end();}});
 return {...server,bucket,root,close:async()=>{await server.close();await rm(root,{recursive:true,force:true});}};
}
