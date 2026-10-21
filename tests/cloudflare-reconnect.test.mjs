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
    loadExplorerInventory:async()=>calls.push('explorer'),setStatus:(id,text)=>{dom.window.document.getElementById(id).textContent=text;},safeUiMessage:x=>x,friendlyError:x=>String(x)
  });
  vm.runInContext(source.slice(source.indexOf('async function refreshLocationEditors(){'),source.indexOf('async function refreshBuckets(){')),ctx);
  const a=vm.runInContext('refreshCloudflare()',ctx),b=vm.runInContext('refreshCloudflare()',ctx);
  assert.equal(a,b);
  await a;
  assert.deepEqual(calls,['buckets','simple','nested','explorer']);
  assert.equal(cache.size,0);assert.equal(otherCache.size,0);
  assert.equal(ctx.currentAccountId,'retained-account');
  const send=ctx.send;
  ctx.send=async()=>({ok:false,error:'Cloudflare session expired. Reconnect Cloudflare.'});
  assert.equal(await vm.runInContext('refreshCloudflare()',ctx),false);
  assert.equal(dom.window.document.getElementById('connect-cloudflare').hidden,false);
  assert.match(dom.window.document.getElementById('hero-status').textContent,/session expired/);
  assert.match(dom.window.document.getElementById('menu-location-status').textContent,/session expired/);
  ctx.send=send;
  const refresh=dom.window.document.getElementById('refresh-menu-locations');refresh.click();
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(refresh.disabled,false);
  assert.match(dom.window.document.getElementById('menu-location-status').textContent,/refresh finished/);
  assert.doesNotMatch(dom.window.document.getElementById('menu-location-status').textContent,/session expired|Connect Cloudflare/);
  ctx.rightClickMode='simple';
  dom.window.document.getElementById('right-click-mode-status').className='status bad';
  vm.runInContext(source.slice(source.indexOf('function renderRightClickMode(){'),source.indexOf('async function chooseRightClickMode(')),ctx);
  vm.runInContext('renderRightClickMode()',ctx);
  assert.equal(dom.window.document.getElementById('right-click-mode-status').className,'meta');
  assert.match(dom.window.document.getElementById('right-click-mode-status').textContent,/Simple menu active/);
  dom.window.close();
});
