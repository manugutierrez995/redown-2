import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const script=await readFile(new URL('../extension/settings-mascot.js',import.meta.url),'utf8');
test('mascot idles, returns on nested scrolling, and hides when page is hidden',()=>{
 const dom=new JSDOM('<img class="settings-mascot"><div id="nested"></div>',{runScripts:'outside-only'}),w=dom.window;
 const timers=new Map();let id=0;w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};w.clearTimeout=i=>timers.delete(i);
 let hidden=false;Object.defineProperty(w.document,'hidden',{get:()=>hidden});w.eval(script);
 const mascot=w.document.querySelector('img');assert.ok(mascot.classList.contains('is-visible'));
 assert.equal([...timers.values()][0].ms,1800);[...timers.values()][0].fn();assert.ok(!mascot.classList.contains('is-visible'));
 w.document.getElementById('nested').dispatchEvent(new w.Event('scroll'));assert.ok(mascot.classList.contains('is-visible'));assert.equal(timers.size,1);
 hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.ok(!mascot.classList.contains('is-visible'));assert.equal(timers.size,0);
 hidden=false;w.document.dispatchEvent(new w.Event('visibilitychange'));assert.ok(mascot.classList.contains('is-visible'));
 w.dispatchEvent(new w.Event('pagehide'));assert.equal(timers.size,0);assert.ok(!mascot.classList.contains('is-visible'));dom.window.close();
});
test('tab favicon and toolbar icons point to correctly sized packaged PNGs',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));
 for(const icons of [manifest.icons,manifest.action.default_icon])for(const [size,path] of Object.entries(icons)){
   const bytes=await readFile(new URL('../extension/'+path,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),Number(size));assert.equal(bytes.readUInt32BE(20),Number(size));
 }
 const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');assert.match(html,/rel="icon"[^>]+href="icons\/icon32.png"/);assert.match(html,/pointer-events:none/);assert.match(html,/prefers-reduced-motion/);
});
