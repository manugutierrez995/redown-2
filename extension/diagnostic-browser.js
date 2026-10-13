/* Browser adapter only. No HTTP, source retrieval, provisioning or deletion. */
(function(root){
 'use strict';
 const C=root.RedownDiagnosticCore,SETTINGS='redownDebugSettingsV1',JOURNAL='redownDiagnosticJournalV1',HISTORY='redownChronicleV1';
 const projection=root.indexedDB&&root.RedownChronicleIndex?root.RedownChronicleIndex.createChronicleIndex(root.indexedDB,{diagnostics:{emit:(...args)=>emit(...args)}}):null;
 let settings={enabled:false,retentionHours:24},historyQueue=[],historyScheduled=false,historySerial=Promise.resolve();
 const recorder=root.RedownDiagnosticRecorder.createRecorder({enabled:false,
  async append(batch){const s=await chrome.storage.local.get(JOURNAL),old=s[JOURNAL]||[];const byId=new Map(old.map(e=>[e.eventId,e]));
   for(const e of batch){const previous=byId.get(e.eventId);if(previous&&JSON.stringify(previous)!==JSON.stringify(e))throw Error('ID_CONFLICT');byId.set(e.eventId,e);}
   const cutoff=Date.now()-settings.retentionHours*3600000;let events=[...byId.values()].filter(e=>Date.parse(e.occurredAt)>=cutoff);
   if(events.length>1000){const dropped=events.length-999;events=events.slice(-999);events.push(C.event('REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',{traceId:'retention',eventId:crypto.randomUUID()},{dropped,reason:'retention-limit'}));}
   await chrome.storage.local.set({[JOURNAL]:events});
  },async load(){return (await chrome.storage.local.get(JOURNAL))[JOURNAL]||[];}
 });
 const ready=chrome.storage.local.get(SETTINGS).then(s=>{if(s[SETTINGS])settings={enabled:s[SETTINGS].enabled===true,retentionHours:[1,24,72].includes(s[SETTINGS].retentionHours)?s[SETTINGS].retentionHours:24};recorder.setEnabled(settings.enabled);}).catch(()=>{});
 function emit(code,traceId,details={},ctx={}){try{return recorder.emit(code,traceId||'unattributed',details,ctx);}catch{return false;}}
 async function flushHistory(){const batch=historyQueue.splice(0,64);if(!batch.length)return;
  const work=historySerial.then(async()=>{const s=await chrome.storage.local.get(HISTORY),byId=new Map((s[HISTORY]||[]).map(e=>[e.id,e]));for(const e of batch)byId.set(e.id,e);const events=[...byId.values()].slice(-500);await chrome.storage.local.set({[HISTORY]:events});
   if(projection){try{await projection.activate(root.RedownChronicleDomain.exportSnapshot(events),{revision:batch.at(-1).id,complete:false});}catch{emit('REDOWN.CHRONICLE.INDEX.UNAVAILABLE',batch[0].id);}}});
  historySerial=work.catch(()=>{emit('REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',batch[0].id,{count:batch.length,reason:'chronicle-write-rejected'});});await historySerial;
 }
 function observe(input){try{if(historyQueue.length>=64){emit('REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',input.id,{reason:'chronicle-overflow'});return false;}
  // Names/titles and exact destinations are omitted from default capture; URL role history remains sensitive.
  const safe={...input};delete safe.title;delete safe.filename;delete safe.destination;
  historyQueue.push(root.RedownChronicleDomain.capture(safe));if(!historyScheduled){historyScheduled=true;setTimeout(()=>{historyScheduled=false;void flushHistory();},25);}return true;
 }catch{emit('REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',input.id,{reason:'invalid-observation'});return false;}}
 async function handle(message){await ready;
  if(message.type==='diagnosticSettings'){
   if(message.enabled!==undefined){settings={enabled:message.enabled===true,retentionHours:[1,24,72].includes(message.retentionHours)?message.retentionHours:24};await chrome.storage.local.set({[SETTINGS]:settings});recorder.setEnabled(settings.enabled);}
   return {ok:true,settings,health:recorder.health()};
  }
  if(message.type==='diagnosticExport'){
   await recorder.flush();await flushHistory();const events=(await chrome.storage.local.get(JOURNAL))[JOURNAL]||[];
   const pending=recorder.snapshot();const all=[...events,...pending].filter((e,i,a)=>a.findIndex(x=>x.eventId===e.eventId)===i);
   const stored=await chrome.storage.local.get(['redownRemoteOutboxV1','redownHitomiQueueV1','redownRemoteProjectionV2']);
   const queue={remotePending:(stored.redownRemoteOutboxV1||[]).length,hitomiPending:(stored.redownHitomiQueueV1||[]).filter(j=>j.status!=='complete').length,remoteCachedJobs:(stored.redownRemoteProjectionV2||[]).length,liveExecutorObserved:false};
   return {ok:true,bundle:C.bundle(all,{...recorder.health(),queue},{applicationVersion:chrome.runtime?.getManifest?.()?.version})};
  }
  if(message.type==='chronicleExport'){await flushHistory();const events=(await chrome.storage.local.get(HISTORY))[HISTORY]||[];return {ok:true,snapshot:root.RedownChronicleDomain.exportSnapshot(events),complete:false,scope:'browser-profile-only',coverage:'last-500-observations'};}
  throw Error('UNKNOWN_DIAGNOSTIC_REQUEST');
 }
 root.RedownDiagnostics={emit,observe,ready,recorder,handle,handles:m=>['diagnosticSettings','diagnosticExport','chronicleExport'].includes(m?.type)};
})(globalThis);
