/* Opt-in Debug Mode; user-initiated offline export only. DOM content is always text. */
(async()=>{
 const $=id=>document.getElementById(id),status=$('diagnostic-status');
 if(!status)return;
 async function send(message){const r=await chrome.runtime.sendMessage(message);if(!r?.ok)throw Error('Diagnostics unavailable');return r;}
 async function refresh(){const r=await send({type:'diagnosticSettings'});$('diagnostic-enable').checked=r.settings.enabled;$('diagnostic-retention').value=String(r.settings.retentionHours);status.textContent=r.settings.enabled?'Debug Mode ON — sanitized boundary observations are recorded.':'Debug Mode OFF';}
 async function configure(){try{await send({type:'diagnosticSettings',enabled:$('diagnostic-enable').checked,retentionHours:Number($('diagnostic-retention').value)});await refresh();}catch{status.textContent='Could not save Debug Mode settings.';}}
 $('diagnostic-enable').addEventListener('change',configure);$('diagnostic-retention').addEventListener('change',configure);
 async function download(bundle,format){const text=format==='jsonl'?bundle.events.map(e=>JSON.stringify(e)).join('\n')+'\n':JSON.stringify(bundle,null,2);
  const url=URL.createObjectURL(new Blob([text],{type:format==='jsonl'?'application/x-ndjson':'application/json'}));const a=document.createElement('a');a.href=url;a.download='redown-sanitized-diagnostics.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 $('diagnostic-export').addEventListener('click',async()=>{try{const {bundle}=await send({type:'diagnosticExport'});await download(bundle,'json');status.textContent='Sanitized offline bundle exported; missing stages are explicitly unknown.';}catch{status.textContent='Export failed; captured records remain in this browser profile.';}});
 $('diagnostic-jsonl').addEventListener('click',async()=>{try{const {bundle}=await send({type:'diagnosticExport'});await download(bundle,'jsonl');}catch{status.textContent='JSONL export failed.';}});
 $('diagnostic-refresh').addEventListener('click',async()=>{try{const {bundle}=await send({type:'diagnosticExport'});const box=$('diagnostic-timeline');box.replaceChildren();
  for(const trace of bundle.traces){const section=document.createElement('details'),head=document.createElement('summary');head.textContent=trace.traceId;section.append(head);
   for(const event of bundle.events.filter(e=>e.traceId===trace.traceId)){const line=document.createElement('p');line.textContent=event.occurredAt+' '+event.stage+' '+event.code+' — '+event.message;section.append(line);}
   const missing=document.createElement('p');missing.textContent='Not observed: '+trace.coverage.filter(s=>s.status==='not-observed').map(s=>s.stage).join(', ');section.append(missing);box.append(section);}
 }catch{status.textContent='Timeline unavailable.';}});
 await refresh().catch(()=>{status.textContent='Diagnostics unavailable until the extension background starts.';});
})();
