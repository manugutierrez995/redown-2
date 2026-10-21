import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const code=await readFile(new URL('../extension/menu-reorder.js',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
function harness({fail=false}={}){
  const dom=new JSDOM('<main></main>',{runScripts:'outside-only'});dom.window.eval(code);
  const items=[{id:'one',children:[{id:'kept'}],prefix:'original/path'},{id:'two'},{id:'three'}],saved=[];
  const root=dom.window.document.querySelector('main'),rows=items.map(item=>{
    const row=dom.window.document.createElement('article');row.dataset.id=item.id;
    const input=dom.window.document.createElement('input');input.value='unsaved draft';
    row.append(dom.window.RedownReorder.attach(row,{items:()=>items,item,save:async()=>{if(fail)throw Error('save failed');saved.push(items.map(x=>x.id));}}),input);root.append(row);return row;
  });
  return {dom,items,saved,root,rows};
}
test('keyboard reorder persists sibling order, preserves drafts/branch and ignores boundaries',async()=>{
  const h=harness(),handle=h.rows[0].querySelector('button');
  handle.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await settle();
  assert.deepEqual(h.items.map(x=>x.id),['two','one','three']);
  assert.deepEqual(h.saved,[['two','one','three']]);
  assert.deepEqual([...h.root.children].map(x=>x.dataset.id),['two','one','three']);
  assert.equal(h.rows[0].querySelector('input').value,'unsaved draft');
  assert.equal(h.items[1].prefix,'original/path');assert.equal(h.items[1].children[0].id,'kept');
  h.rows[1].querySelector('button').dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowUp'}));await settle();
  assert.equal(h.saved.length,1);h.dom.window.close();
});
test('failed persistence restores original array and DOM order',async()=>{
  const h=harness({fail:true});
  h.rows[0].querySelector('button').dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'ArrowDown'}));await settle();
  assert.deepEqual(h.items.map(x=>x.id),['one','two','three']);
  assert.deepEqual([...h.root.children].map(x=>x.dataset.id),['one','two','three']);h.dom.window.close();
});
test('pointer drop reorders at visible insertion marker and cancellation leaves order unchanged',async()=>{
  const h=harness(),handle=h.rows[0].querySelector('button');
  h.rows.forEach((row,i)=>row.getBoundingClientRect=()=>({top:i*100,bottom:(i+1)*100,height:100}));
  const pointer=(type,y)=>handle.dispatchEvent(new h.dom.window.MouseEvent(type,{button:0,clientY:y,bubbles:true}));
  pointer('pointerdown',20);pointer('pointermove',260);
  assert.ok(h.rows[2].classList.contains('reorder-after'));
  pointer('pointerup',260);await settle();assert.deepEqual(h.items.map(x=>x.id),['two','three','one']);
  pointer('pointerdown',20);pointer('pointermove',120);pointer('pointercancel',120);await settle();
  assert.deepEqual(h.items.map(x=>x.id),['two','three','one']);assert.equal(h.saved.length,1);h.dom.window.close();
});

test('native Simple context menu follows saved section and additional destination order',async()=>{
  const {default:vm}=await import('node:vm');
  const background=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
  const created=[];
  const profiles=[
    {id:'a',type:'cloudflare-r2',bucketName:'alpha',menuLabel:'Alpha',menuOrder:1,simpleOptions:[{id:'second',prefix:'two',label:'Second'},{id:'first',prefix:'one',label:'First'}]},
    {id:'b',type:'cloudflare-r2',bucketName:'beta',menuLabel:'Beta',menuOrder:0}
  ];
  const ctx=vm.createContext({ROOT_MENU_ID:'REDOWN',getProfiles:async()=>profiles,RedownNestedLocations:{menuMode:()=> 'simple'},addMenuControls:()=>{},chrome:{contextMenus:{removeAll:async()=>{},create:x=>created.push(x)},storage:{local:{get:async()=>({rightClickMode:'simple',simpleLabelFallback:'menu'})}}}});
  vm.runInContext(background.slice(background.indexOf('async function buildMenus() {'),background.indexOf('function addMenuControls(mode)')),ctx);
  await vm.runInContext('buildMenus()',ctx);
  assert.deepEqual(created.filter(x=>x.id!=='REDOWN').map(x=>x.title),['Beta','Alpha','Second','First']);
});

test('drag continues outside grip and gaps are valid insertion targets',async()=>{
 const h=harness(),handle=h.rows[0].querySelector('button');
 h.rows.forEach((row,i)=>row.getBoundingClientRect=()=>({top:i*120,bottom:i*120+100,height:100}));
 handle.dispatchEvent(new h.dom.window.MouseEvent('pointerdown',{button:0,clientY:20,bubbles:true}));
 h.dom.window.document.dispatchEvent(new h.dom.window.MouseEvent('pointermove',{clientY:230,clientX:40,bubbles:true}));
 assert.ok(h.root.classList.contains('reorder-list-dragging'));assert.ok(h.dom.window.document.querySelector('.reorder-ghost'));
 h.dom.window.document.dispatchEvent(new h.dom.window.MouseEvent('pointerup',{clientY:230,bubbles:true}));await settle();
 assert.deepEqual(h.items.map(x=>x.id),['two','one','three']);assert.equal(h.saved.length,1);
 assert.equal(h.dom.window.document.querySelector('.reorder-ghost'),null);assert.equal(h.root.classList.contains('reorder-list-dragging'),false);h.dom.window.close();
});
test('Escape cancels lifted drag without saving or leaving compact cards behind',async()=>{
 const h=harness(),handle=h.rows[0].querySelector('button');
 h.rows.forEach((row,i)=>row.getBoundingClientRect=()=>({top:i*100,bottom:(i+1)*100,height:100}));
 handle.dispatchEvent(new h.dom.window.MouseEvent('pointerdown',{button:0,clientY:20,bubbles:true}));
 h.dom.window.document.dispatchEvent(new h.dom.window.MouseEvent('pointermove',{clientY:260,bubbles:true}));
 h.dom.window.document.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();
 assert.deepEqual(h.items.map(x=>x.id),['one','two','three']);assert.equal(h.saved.length,0);assert.equal(h.root.classList.contains('reorder-list-dragging'),false);assert.equal(h.dom.window.document.querySelector('.reorder-ghost'),null);h.dom.window.close();
});
