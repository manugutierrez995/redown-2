// Opt-in, sanitized DOM reproduction. Loads current source into an isolated VM with mocked messaging.
// Not an installed Chrome or live R2 observation; no token, profile or user content is read.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<20;i++)await tick();}
export async function reproduceChildRace(){
  const source=await readFile(new URL('../../extension/options.js',import.meta.url),'utf8');
  const begin=source.indexOf('function uploadBuilderChildren('),end=source.indexOf('function renderWorkspaceProfiles()',begin);
  if(begin<0||end<begin)throw Error('missing-source-anchor');
  const dom=new JSDOM('<select id="local-prefix"></select><div id="local-location-builder"></div><div id="local-location-hint"></div>',{url:'https://fixture.invalid',runScripts:'outside-only'});
  const state={target:{accountId:'fixture-account',bucketName:'alpha'},calls:[]};let release;
  const context=vm.createContext({document:dom.window.document,uploadLocationPrefixes:[],uploadLocationSegments:[''],uploadLocationLoadVersion:0,uploadLocationTargetKey:'',uploadTarget:()=>({...state.target}),uploadProfile:()=>({folders:{files:'unverified-saved-prefix'}}),$:id=>dom.window.document.getElementById(id),ensureUploadLocationOption:()=>{},ensureUploadProfile:async()=>({}),ensureProfileMenuPrefixes:async()=>{},send:async message=>{
    state.calls.push({type:message.type,bucket:message.bucketName,parent:message.parentPrefix});
    if(message.type!=='cfFolderChildren')throw Error('unexpected-fixture-operation');
    if(message.bucketName==='alpha'&&message.parentPrefix==='images')return new Promise(resolve=>{release=resolve;});
    return {ok:true,children:message.bucketName==='beta'?['videos']:['images']};
  }});
  try{
    vm.runInContext(source.slice(begin,end),context,{timeout:1000});
    await vm.runInContext('loadUploadLocations({preserve:false})',context);await settle();
    const first=dom.window.document.querySelector('.upload-path-select');first.value='images';first.dispatchEvent(new dom.window.Event('change'));await settle();
    dom.window.document.querySelector('.upload-path-add').click();await settle();
    if(!release)throw Error('fixture-request-not-started');
    state.target={accountId:'fixture-account',bucketName:'beta'};
    await vm.runInContext('loadUploadLocations({preserve:false})',context);await settle();
    release({ok:true,children:['old-alpha-child']});await settle();
    const cache=Array.from(context.uploadLocationPrefixes),options=[...dom.window.document.querySelector('.upload-path-select').options].map(x=>x.value);
    return {reproductionVersion:'0.1',scope:'mocked-dom-current-source',status:cache.some(x=>x.includes('old-alpha-child'))?'fail':'pass',cache,options,messageCount:state.calls.length,competingExplanation:'Provider correctness, Chrome runtime and live R2 remain unknown.',browserStatus:'browser-unverified'};
  }finally{dom.window.close();}
}
