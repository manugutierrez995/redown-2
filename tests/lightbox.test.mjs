import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
function harness(){
 const dom=new JSDOM('<button id="opener">Open</button><div id="explorer" tabindex="0"><div class="explorer-body"><div id="workspace-preview"></div></div></div>',{runScripts:'outside-only'});
 const w=dom.window;w.eval(`var $=id=>document.getElementById(id);var workspacePreviewLightbox=false,workspacePreviewExpanded=false,workspacePreviewRequestId=0,workspacePreviewAbort=null,workspacePreviewUrl='';`);
 const navigated=[];w.navigatePreview=delta=>navigated.push(delta);w.formatBytes=n=>String(n);w.finishOperation=()=>{};w.explorerSource=()=>({});w.URL.revokeObjectURL=()=>{};
 w.RedownCloudflareApi={preview:async()=> 'blob:preview'};
 w.eval(source.slice(source.indexOf('function objectContentType('),source.indexOf('\n\nlet explorerAccounts')));
 return {dom,w,navigated,root:w.document.getElementById('workspace-preview')};
}
test('lightbox opens with real ID lookup, moves original media and restores it with listeners and focus',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'photo.png',size:2});
 const media=h.root.querySelector('.preview-media'),img=media.querySelector('img');let clicks=0;img.addEventListener('click',()=>clicks++);
 const opener=h.w.document.getElementById('opener');opener.focus();h.w.setWorkspacePreviewLightbox(true);
 assert.equal(h.w.workspaceLightboxOpen(),true);assert.equal(h.w.document.querySelector('.preview-lightbox-stage img'),img);
 img.click();assert.equal(clicks,1);assert.equal(h.w.document.body.classList.contains('preview-lightbox-open'),true);
 h.w.setWorkspacePreviewLightbox(false);assert.equal(h.root.querySelector('.preview-media'),media);assert.equal(h.w.document.activeElement,opener);assert.equal(h.w.document.querySelector('.preview-lightbox-layer'),null);h.dom.window.close();
});
test('dialog keyboard and buttons navigate; Escape closes and Tab stays inside',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'photo.png'});h.w.setWorkspacePreviewLightbox(true);
 const layer=h.w.workspaceLightboxLayer(),close=layer.querySelector('.preview-lightbox-close');
 close.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 layer.querySelector('[aria-label="Previous file"]').click();assert.deepEqual(h.navigated,[1,-1]);
 const last=layer.querySelector('[aria-label="Next file"]');last.focus();last.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(h.w.document.activeElement,close);
 close.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(h.w.workspaceLightboxOpen(),false);h.dom.window.close();
});
test('next preview replaces overlay media and title; failed next load preserves current media',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'first.png'});h.w.setWorkspacePreviewLightbox(true);
 await h.w.showWorkspacePreview({key:'second.png'});
 assert.equal(h.w.document.querySelector('.preview-lightbox-stage img').alt,'second.png');assert.equal(h.w.workspaceLightboxLayer().querySelector('.preview-title').textContent,'second.png');
 h.w.RedownCloudflareApi.preview=async()=>{throw Error('Read denied');};await h.w.showWorkspacePreview({key:'denied.png'});
 assert.equal(h.w.document.querySelector('.preview-lightbox-stage img').alt,'second.png');assert.match(h.w.document.querySelector('.preview-progress').textContent,/Read denied/);
 h.w.setWorkspacePreviewLightbox(false);assert.equal(h.root.querySelector('img').alt,'second.png');h.dom.window.close();
});
test('older asynchronous preview cannot overwrite a newer lightbox selection',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'first.png'});h.w.setWorkspacePreviewLightbox(true);
 let resolve;h.w.RedownCloudflareApi.preview=()=>new Promise(r=>resolve=r);const old=h.w.showWorkspacePreview({key:'slow.png'});
 h.w.RedownCloudflareApi.preview=async()=> 'blob:latest';await h.w.showWorkspacePreview({key:'latest.png'});resolve('blob:slow');await old;
 assert.equal(h.w.document.querySelector('.preview-lightbox-stage img').alt,'latest.png');h.dom.window.close();
});

test('pending image leaves current media and title visible, with corner feedback; wheel zoom resets on swap',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'first.png'});h.w.setWorkspacePreviewLightbox(true);
 const stage=h.w.document.querySelector('.preview-lightbox-stage'),first=stage.querySelector('img');
 stage.dispatchEvent(new h.w.WheelEvent('wheel',{deltaY:-300,bubbles:true,cancelable:true}));assert.match(first.style.transform,/scale\((?!1\))/);
 let resolve;h.w.RedownCloudflareApi.preview=()=>new Promise(r=>resolve=r);const pending=h.w.showWorkspacePreview({key:'next.png'});
 assert.equal(stage.querySelector('img'),first);assert.equal(h.w.workspaceLightboxLayer().querySelector('.preview-title').textContent,'first.png');assert.match(h.w.document.querySelector('.preview-progress').textContent,/Loading/);
 resolve('blob:next');await pending;assert.equal(stage.querySelector('img').alt,'next.png');assert.match(stage.querySelector('img').style.transform,/scale\(1\)/);assert.equal(h.w.document.querySelector('.preview-progress'),null);
 stage.dispatchEvent(new h.w.WheelEvent('wheel',{deltaY:-300,bubbles:true,cancelable:true}));stage.dispatchEvent(new h.w.MouseEvent('dblclick',{bubbles:true}));assert.match(stage.querySelector('img').style.transform,/scale\(1\)/);h.dom.window.close();
});

test('right-click image menu zooms in/out, fits, and Escape dismisses only the menu',async()=>{
 const h=harness();await h.w.showWorkspacePreview({key:'first.png'});h.w.setWorkspacePreviewLightbox(true);
 const stage=h.w.document.querySelector('.preview-lightbox-stage');
 const open=()=>stage.querySelector('img').dispatchEvent(new h.w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:20,clientY:20}));
 open();let menu=stage.querySelector('[role="menu"]');assert.deepEqual([...menu.querySelectorAll('button')].map(x=>x.textContent),['Zoom in','Zoom out','Fit to screen']);assert.equal(menu.children[1].disabled,true);
 menu.children[0].click();assert.match(stage.querySelector('img').style.transform,/scale\(1.25\)/);
 open();stage.querySelector('[role="menu"]').children[1].click();assert.match(stage.querySelector('img').style.transform,/scale\(1\)/);
 open();stage.querySelector('[role="menu"]').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(stage.querySelector('[role="menu"]'),null);assert.equal(h.w.workspaceLightboxOpen(),true);open();stage.querySelector('[role="menu"]').children[2].click();stage.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));assert.deepEqual(h.navigated,[-1]);h.dom.window.close();
});
