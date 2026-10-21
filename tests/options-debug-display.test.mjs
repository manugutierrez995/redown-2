import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
function harness(){
  const dom=new JSDOM(html,{runScripts:'outside-only'});
  const calls=[],saved=[];
  const context=vm.createContext({document:dom.window.document,window:dom.window,debugModeEnabled:false,profiles:[],currentAccountId:'account',onboardingConnected:true,onboardingBucketState:'loading',
    $:id=>dom.window.document.getElementById(id),
    setStatus:(id,text)=>{dom.window.document.getElementById(id).textContent=text;},
    send:async msg=>{calls.push(msg);return {ok:true,buckets:[{name:'test-bucket'}]};},
    addBucketPreset:(...args)=>calls.push(args),chrome:{storage:{local:{set:async value=>saved.push(value)}}}});
  vm.runInContext(source.slice(source.indexOf('function isSetupDestination('),source.indexOf('function applyDebugMode(){')),context);
  vm.runInContext(source.slice(source.indexOf('async function refreshBuckets(){'),source.indexOf('async function addBucketPreset(')),context);
  vm.runInContext(source.slice(source.indexOf('function applyDebugMode(){'),source.indexOf('(async()=>{\n  const stored=await chrome.storage.local.get(["profiles"')),context);
  return {dom,context,calls,saved};
}
test('debug-only sections start hidden and toggle exists only inside header disclosure',()=>{
  const h=harness(),d=h.dom.window.document;
  for(const id of ['rfis-section','add-github'])assert.equal(h.dom.window.getComputedStyle(d.getElementById(id)).display,'none');
  assert.ok(d.querySelector('header details:not([open]) #debug-mode-enabled'));
  assert.equal(d.querySelectorAll('#debug-mode-enabled').length,1);
  assert.equal(d.querySelector('.debug-settings'),null);
  assert.equal(d.querySelector('header summary').textContent,'');
  const panel=d.getElementById('nested-menu-editor-panel');
  assert.equal(h.dom.window.getComputedStyle(panel).display,'none','hidden attribute wins over author layout styles');
  h.dom.window.close();
});
test('bucket name button selects without provisioning; debug reveals separate repair action',async()=>{
  const h=harness(),d=h.dom.window.document;
  await vm.runInContext('refreshBuckets()',h.context);
  const name=d.querySelector('.bucket-select'),repair=d.querySelector('.bucket-prepare');
  assert.equal(name.textContent,'test-bucket');
  assert.equal(h.dom.window.getComputedStyle(repair).display,'none');
  name.click();assert.equal(name.getAttribute('aria-pressed'),'true');
  assert.equal(h.calls.length,1,'selection only uses the original bucket listing');
  const toggle=d.getElementById('debug-mode-enabled');toggle.checked=true;
  toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.ok(d.documentElement.classList.contains('debug-mode'));
  assert.notEqual(h.dom.window.getComputedStyle(repair).display,'none');
  repair.click();assert.equal(h.calls[1][0],'test-bucket');assert.equal(h.calls[1][1].forceRepair,true);
  assert.equal(h.saved[0].debugModeEnabled,true);
  toggle.checked=false;toggle.dispatchEvent(new h.dom.window.Event('change'));
  assert.equal(h.dom.window.getComputedStyle(repair).display,'none');
  h.dom.window.close();
});

test('normal mode offers one setup action without exposing repair',async()=>{
  const h=harness(),d=h.dom.window.document;
  await vm.runInContext('refreshBuckets()',h.context);
  const use=d.querySelector('.bucket-use');
  assert.notEqual(h.dom.window.getComputedStyle(use).display,'none');
  use.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls[1][0],'test-bucket');
  assert.equal(h.calls[1].length,1,'normal setup must not force redeployment');
  h.dom.window.close();
});
test('R2 activation is an actionable neutral step, permission failures remain errors',async()=>{
  const h=harness(),d=h.dom.window.document;
  h.context.send=async()=>({ok:false,error:'Please sign up for R2 in the dashboard'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,false);
  assert.match(d.getElementById('r2-dashboard').href,/account\/r2\/overview/);
  h.context.send=async()=>({ok:false,error:'Permission denied'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,true);
  assert.equal(d.getElementById('cf-status').textContent,'Permission denied');
  h.context.send=async()=>({ok:true,buckets:[]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.match(d.getElementById('cf-status').textContent,/Create one/);
  h.dom.window.close();
});
test('successful provisioning refreshes destination editors and inventory before reporting ready',async()=>{
  const events=[];
  const context=vm.createContext({currentAccountId:'account',onboardingConnected:true,onboardingBucketState:'loading',cfAccounts:[{id:'account',name:'Account'}],profiles:[],
    setStatus:(id,message)=>events.push(message),
    send:async message=>{events.push(message.type);return {ok:true};},
    chrome:{storage:{local:{get:async()=>({profiles:[{type:'cloudflare-r2',accountId:'account',bucketName:'assets',workerUrl:'https://example.workers.dev',token:'fixture'}],rightClickMode:'simple'})}}},
    RedownNestedLocations:{menuMode:()=> 'simple'},
    renderProfiles:()=>events.push('profiles'),refreshLocationEditors:async()=>events.push('locations'),
    loadExplorerInventory:async()=>events.push('inventory')});
  vm.runInContext(source.slice(source.indexOf('function isSetupDestination('),source.indexOf('function applyOnboarding(')),context);
  vm.runInContext(source.slice(source.indexOf('async function addBucketPreset('),source.indexOf('async function loginRequest(')),context);
  assert.equal(await vm.runInContext('addBucketPreset("assets")',context),true);
  assert.deepEqual(events.slice(1,5),['cfProvision','profiles','locations','inventory']);
  assert.match(events.at(-1),/is ready/);
  events.length=0;
  assert.equal(await vm.runInContext('addBucketPreset("assets")',context),true);
  assert.ok(!events.includes('cfProvision'),'already configured bucket avoids deployment');
});

test('normal onboarding progressively reveals tools only for a completed destination; debug bypasses gating',async()=>{
  const h=harness(),d=h.dom.window.document;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  for(const id of ['right-click-presets','local-tools','downloads-zone']){
    // local-tools also has its existing disconnected hidden flag.
    assert.equal(h.dom.window.getComputedStyle(d.getElementById(id)).display,'none');
  }
  h.context.send=async()=>({ok:true,buckets:[]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.ok(d.getElementById('create-bucket').classList.contains('setup-go'));
  assert.equal(d.querySelector('#onboarding-step'),null);
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  h.context.profiles=[{type:'cloudflare-r2',bucketName:'assets'}];
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'),'bucket selection alone cannot unlock tools');
  h.context.profiles=[{type:'cloudflare-r2',workerUrl:'https://fixture.workers.dev',token:'fixture',explorerManaged:true}];
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'),'Explorer-only preparation cannot complete right-click setup');
  h.context.profiles[0].explorerManaged=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(!d.documentElement.classList.contains('onboarding-pending'));
  assert.notEqual(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  h.context.onboardingBucketState='loading';
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(!d.documentElement.classList.contains('storage-pending'),'returning users keep Storage during refresh');
  h.context.onboardingConnected=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  const toggle=d.getElementById('debug-mode-enabled');toggle.checked=true;
  toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.notEqual(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  toggle.checked=false;toggle.dispatchEvent(new h.dom.window.Event('change'));await Promise.resolve();
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('right-click-presets')).display,'none');
  h.dom.window.close();
});

test('activation stays in connection header; Storage appears only after R2 is available',async()=>{
  const h=harness(),d=h.dom.window.document;
  h.context.onboardingConnected=false;
  vm.runInContext('applyOnboarding()',h.context);
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('cloudflare-panel')).display,'none');
  assert.equal(d.getElementById('r2-setup').hidden,true);
  h.context.onboardingConnected=true;
  h.context.send=async()=>({ok:false,error:'Please sign up for R2'});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').closest('section').id,'connections');
  assert.equal(d.getElementById('r2-setup').hidden,false);
  assert.equal(h.dom.window.getComputedStyle(d.getElementById('cloudflare-panel')).display,'none');
  h.context.send=async()=>({ok:true,buckets:[{name:'assets'}]});
  await vm.runInContext('refreshBuckets()',h.context);
  assert.equal(d.getElementById('r2-setup').hidden,true);
  assert.ok(!d.documentElement.classList.contains('storage-pending'));
  assert.ok(!d.getElementById('create-bucket').classList.contains('setup-go'));
  assert.ok(d.querySelector('.bucket-use').classList.contains('setup-go'));
  assert.ok(d.documentElement.classList.contains('onboarding-pending'));
  h.dom.window.close();
});

test('settings disclosure dismisses outside and Escape restores focus',()=>{
  const h=harness(),d=h.dom.window.document;
  vm.runInContext(source.slice(source.indexOf('function wireSettingsDisclosure(){'),source.indexOf('function applyDebugMode(){')),h.context);
  const disclosure=d.getElementById('settings-disclosure');
  disclosure.open=true;
  d.getElementById('debug-mode-enabled').click();
  assert.equal(disclosure.open,true,'inside interaction retains disclosure');
  d.getElementById('connections').click();assert.equal(disclosure.open,false);
  disclosure.open=true;
  d.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(disclosure.open,false);
  assert.equal(d.activeElement,disclosure.querySelector('summary'));
  h.dom.window.close();
});
