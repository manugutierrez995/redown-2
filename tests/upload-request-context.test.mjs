import test from 'node:test';
import assert from 'node:assert/strict';
import {reproduceChildRace} from '../agent/semantic/reproduction.mjs';
test('DBG-003 child requests released after bucket switch cannot contaminate current shared cache',async()=>{
 const result=await reproduceChildRace();assert.equal(result.status,'pass',JSON.stringify(result));assert.deepEqual(result.cache,['videos']);assert.deepEqual(result.options,['','videos']);assert.equal(result.browserStatus,'browser-unverified');
});

import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<20;i++)await tick();}
for(const stage of ['profile','creation'])test(`DBG-003 late ${stage} completion cannot alter the new bucket view`,async()=>{
 const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function uploadBuilderChildren('),source.indexOf('function renderWorkspaceProfiles()'));
 const dom=new JSDOM('<select id="local-prefix"></select><div id="local-location-builder"></div><div id="local-location-hint"></div>',{url:'https://fixture.invalid',runScripts:'outside-only'});
 let target={accountId:'fixture',bucketName:'alpha'},release,prefixCalls=0;
 const delayed=()=>new Promise(resolve=>{release=resolve;});
 const context=vm.createContext({document:dom.window.document,uploadLocationPrefixes:[],uploadLocationSegments:[''],uploadLocationLoadVersion:0,uploadLocationTargetKey:'',uploadTarget:()=>({...target}),uploadProfile:()=>({}),$:id=>dom.window.document.getElementById(id),ensureUploadLocationOption:()=>{},send:async()=>({ok:true,children:target.bucketName==='alpha'?['images']:['videos']}),ensureUploadProfile:stage==='profile'?delayed:async()=>({}),ensureProfileMenuPrefixes:async()=>{prefixCalls++;if(stage==='creation')await delayed();}});
 try{
  vm.runInContext(code,context);await vm.runInContext('loadUploadLocations({preserve:false})',context);await settle();
  const select=dom.window.document.querySelector('.upload-path-select');select.value='images';dom.window.document.querySelector('.upload-path-add').click();await settle();assert.equal(typeof release,'function');
  target={accountId:'fixture',bucketName:'beta'};await vm.runInContext('loadUploadLocations({preserve:false})',context);await settle();const hint=dom.window.document.getElementById('local-location-hint').textContent;
  release({});await settle();assert.deepEqual(Array.from(context.uploadLocationPrefixes),['videos']);assert.deepEqual(Array.from(context.uploadLocationSegments),['']);assert.equal(dom.window.document.querySelectorAll('.upload-path-row').length,1);assert.equal(dom.window.document.getElementById('local-location-hint').textContent,hint);assert.equal(prefixCalls,stage==='profile'?0:1);
 }finally{dom.window.close();}
});
