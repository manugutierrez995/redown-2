import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../extension/cloudflare-api.js',import.meta.url),'utf8');
const authSource=await readFile(new URL('../extension/cloudflare-auth.js',import.meta.url),'utf8');
function shared(){let queue=Promise.resolve();const state={cloudflareAuth:{accessToken:'old',refreshToken:'renew',expiresAt:Date.now()+3600000}};return {state,locks:{request(_name,fn){const p=queue.catch(()=>{}).then(fn);queue=p;return p;}}};}
function harness(fetchImpl,base=shared()){
 const context=vm.createContext({Headers,FormData,AbortSignal,URL,URLSearchParams,Blob,Date,navigator:{locks:base.locks},chrome:{storage:{local:{get:async()=>structuredClone(base.state),set:async value=>Object.assign(base.state,value)}}},fetch:fetchImpl});
 vm.runInContext(source,context);return {base,context,api:context.RedownCloudflareApi};
}
test('Cloudflare 403 authentication error refreshes once and retries the read',async()=>{
 let refreshes=0,reads=0;
 const h=harness(async(url,options)=>{
  if(url.endsWith('/oauth2/token')){refreshes++;return Response.json({access_token:'new',refresh_token:'rotated',expires_in:3600});}
  reads++;return options.headers.get('authorization')==='Bearer old'?Response.json({errors:[{code:10000,message:'Authentication error'}]},{status:403}):new Response('ok');
 });
 assert.equal((await h.api.request('/accounts')).status,200);assert.equal(refreshes,1);assert.equal(reads,2);assert.equal(h.base.state.cloudflareAuth.refreshToken,'rotated');
});
test('permission-denied 403 does not renew credentials or repeat the request',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return Response.json({errors:[{message:'Insufficient permissions'}]},{status:403});});
 assert.equal((await h.api.request('/accounts')).status,403);assert.equal(calls,1);
});
test('expired credentials shared by settings and worker rotate once under the shared lock',async()=>{
 const base=shared();base.state.cloudflareAuth.expiresAt=1;let refreshes=0;
 const fetchImpl=async url=>url.endsWith('/oauth2/token')?(refreshes++,Response.json({access_token:'new',refresh_token:'rotated',expires_in:3600})):new Response('ok');
 const a=harness(fetchImpl,base),b=harness(fetchImpl,base);
 await Promise.all([a.api.request('/accounts'),b.api.request('/buckets')]);assert.equal(refreshes,1);
});
test('invalid refresh grant preserves connection and requests reconnect without disconnect',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return Response.json({error:'invalid_grant'},{status:400});});h.base.state.cloudflareAuth.expiresAt=1;
 await assert.rejects(h.api.request('/accounts'),/Reconnect Cloudflare/);
 await assert.rejects(h.api.request('/accounts'),/Reconnect Cloudflare/);
 assert.equal(calls,1);assert.equal(h.base.state.cloudflareAuth.reconnectRequired,true);assert.equal(h.base.state.cloudflareAuth.refreshToken,'renew');
});
test('transient renewal failure retains credentials and can recover on the next refresh',async()=>{
 let outage=true;const h=harness(async url=>url.endsWith('/oauth2/token')?(outage?new Response('temporarily unavailable',{status:503}):Response.json({access_token:'new',expires_in:3600})):new Response('ok'));h.base.state.cloudflareAuth.expiresAt=1;
 await assert.rejects(h.api.request('/accounts'),/saved connection has been retained/);assert.equal(h.base.state.cloudflareAuth.reconnectRequired,undefined);
 outage=false;assert.equal((await h.api.request('/accounts')).status,200);
});
test('login token storage shares the refresh lock and clears reconnect state',async()=>{
 const base=shared();base.state.cloudflareAuth.reconnectRequired=true;
 const h=harness(async()=>new Response('ok'),base);
 vm.runInContext(authSource.slice(authSource.indexOf('async function storeCloudflareToken('),authSource.indexOf('// Keep the login window')),h.context);
 await vm.runInContext('storeCloudflareToken({access_token:"fresh-login",refresh_token:"fresh-renew",expires_in:3600})',h.context);
 assert.equal(base.state.cloudflareAuth.reconnectRequired,false);assert.equal(base.state.cloudflareAuth.accessToken,'fresh-login');
});
