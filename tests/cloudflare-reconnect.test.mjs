import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
test('verified reconnect refreshes both editors and Explorer, coalescing concurrent refresh requests',async()=>{
  const dom=new JSDOM(html,{runScripts:'outside-only'}),calls=[];
  const simple=dom.window.document.createElement('div');simple.className='cloudflare-location-refresh';
  simple.refreshCloudflareLocations=async()=>calls.push('simple');dom.window.document.body.append(simple);
  const cache=new Map([['stale',[]]]),otherCache=new Map([['stale',[]]]);
  const ctx=vm.createContext({document:dom.window.document,
    $:id=>dom.window.document.getElementById(id),
    chrome:{storage:{local:{get:async()=>({cloudflareAuth:{accessToken:'verified'}})}}},
    profiles:[],cfAccounts:[],currentAccountId:'retained-account',
    defaultLocationPrefixCache:cache,presetLocationCache:otherCache,
    RedownNestedEditor:{refresh:()=>calls.push('nested')},
    send:async()=>({ok:true,accounts:[{id:'another-account'},{id:'retained-account'}]}),
    refreshBuckets:async()=>calls.push('buckets'),
    loadExplorerInventory:async()=>calls.push('explorer'),setStatus:()=>{},safeUiMessage:x=>x,friendlyError:x=>String(x)
  });
  vm.runInContext(source.slice(source.indexOf('async function refreshLocationEditors(){'),source.indexOf('async function refreshBuckets(){')),ctx);
  const a=vm.runInContext('refreshCloudflare()',ctx),b=vm.runInContext('refreshCloudflare()',ctx);
  assert.equal(a,b);
  await a;
  assert.deepEqual(calls,['buckets','simple','nested','explorer']);
  assert.equal(cache.size,0);assert.equal(otherCache.size,0);
  assert.equal(ctx.currentAccountId,'retained-account');
  dom.window.close();
});
