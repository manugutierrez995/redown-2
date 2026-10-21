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
  const context=vm.createContext({document:dom.window.document,debugModeEnabled:false,profiles:[],currentAccountId:'account',
    $:id=>dom.window.document.getElementById(id),
    setStatus:(id,text)=>{dom.window.document.getElementById(id).textContent=text;},
    send:async msg=>{calls.push(msg);return {ok:true,buckets:[{name:'test-bucket'}]};},
    addBucketPreset:(...args)=>calls.push(args),chrome:{storage:{local:{set:async value=>saved.push(value)}}}});
  vm.runInContext(source.slice(source.indexOf('async function refreshBuckets(){'),source.indexOf('async function addBucketPreset(')),context);
  vm.runInContext(source.slice(source.indexOf('function applyDebugMode(){'),source.indexOf('(async()=>{\n  const stored=await chrome.storage.local.get(["profiles"')),context);
  return {dom,context,calls,saved};
}
test('debug-only sections start hidden in CSS and switch remains last',()=>{
  const h=harness(),d=h.dom.window.document;
  for(const id of ['rfis-section','add-github'])assert.equal(h.dom.window.getComputedStyle(d.getElementById(id)).display,'none');
  assert.ok(d.querySelector('.wrap > section:last-child #debug-mode-enabled'));
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
