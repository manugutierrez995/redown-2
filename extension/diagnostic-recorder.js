/* Bounded, asynchronous recorder. Adapter errors never propagate to byte transfers. */
(function(root){
 'use strict';
 const C=root.RedownDiagnosticCore;
 function createRecorder({append,load=async()=>[],enabled=true,maxQueue=C.LIMITS.queue,maxAttempts=3,schedule=fn=>setTimeout(fn,25),now=()=>new Date().toISOString(),projection}={}){
  if(!Number.isInteger(maxQueue)||maxQueue<1||maxQueue>C.LIMITS.queue||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)throw Error('INVALID_RECORDER_BUDGET');
  const preceding=new Map();
  let pending=[],gaps=0,failures=0,serial=0,scheduled=false,running=null,drainRequested=false,enabledState=enabled;
  const session=globalThis.crypto?.randomUUID?.()||'session-'+Date.now();
  function make(code,traceId,details,ctx={}){const e=C.event(code,{...ctx,traceId,eventId:session+':'+(++serial),occurredAt:now(),causalLinks:ctx.causalLinks|| (preceding.has(traceId)?[preceding.get(traceId)]:[])},details);preceding.set(traceId,e.eventId);if(preceding.size>128)preceding.delete(preceding.keys().next().value);return e;}
  function gap(traceId,reason,count=1,lost=[]){gaps+=count;const e=make('REDOWN.CHRONICLE.JOURNAL.RECORDING_GAP',traceId,{reason,count},{causalLinks:lost.slice(0,16)});
    // Reserved bounded summary: replace the last queue slot; never grow beyond budget.
    if(pending.length>=maxQueue)pending[pending.length-1]=e;else pending.push(e);}
  function emit(code,traceId,details={},ctx={}){
   if(!enabledState)return false;
   if(running)drainRequested=true;
   try{if(pending.length>=maxQueue){gap(traceId,'queue-overflow');return false;}pending.push(make(code,traceId,details,ctx));
    if(!scheduled){scheduled=true;schedule(()=>{scheduled=false;void flush();});}return true;
   }catch{gaps++;return false;}
  }
  async function flush(){
   if(running)return running;
   running=(async()=>{
    const batch=pending.splice(0,maxQueue);if(!batch.length)return {persisted:0,gaps};
    const trace=batch[0].traceId;let persisted=false;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
     try{await append(batch);persisted=true;break;}catch(error){failures++;
      if(attempt===1)batch.push(make(error?.name==='QuotaExceededError'?'REDOWN.CHRONICLE.JOURNAL.QUOTA_EXHAUSTED':'REDOWN.CHRONICLE.JOURNAL.WRITE_FAILED',trace,{attempt}));
      if(attempt<maxAttempts && batch.length<C.LIMITS.events)batch.push(make('REDOWN.CHRONICLE.JOURNAL.RETRY',trace,{attempt}));
     }
    }
    if(!persisted){gap(trace,'append-exhausted',batch.length,batch.map(e=>e.eventId));return {persisted:0,gaps};}
    try{await append([make('REDOWN.CHRONICLE.JOURNAL.APPENDED',trace,{count:batch.length})]);}catch{gap(trace,'ack-record-failed');}
    if(projection){try{await projection(await load());}catch{emit('REDOWN.CHRONICLE.INDEX.UNAVAILABLE',trace);}}
    return {persisted:batch.length,gaps};
   })().catch(()=>({persisted:0,gaps:++gaps})).finally(()=>{running=null;if(drainRequested&&pending.length){drainRequested=false;schedule(()=>{void flush();});}});return running;
  }
  return {emit,flush,setEnabled(value){enabledState=Boolean(value);},health(){return {pending:pending.length,gaps,failures,enabled:enabledState};},snapshot:()=>pending.slice(),async export(){await flush();const saved=await load(),all=[...saved,...pending].filter((e,i,a)=>a.findIndex(x=>x.eventId===e.eventId)===i);return C.bundle(all,this.health());}};
 }
 root.RedownDiagnosticRecorder={createRecorder};
})(globalThis);
