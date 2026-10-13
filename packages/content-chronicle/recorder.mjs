// Metadata recorder independent of transfer. Ports own durability; no transfer invocation.
import {capture,exportSnapshot,importSnapshot} from './index.mjs';
export function createChronicleRecorder({append,limit=64,schedule=fn=>setTimeout(fn,25),onGap=()=>{}}){
 let queue=[],running=null,scheduled=false,gaps=0;
 function observe(input){try{if(queue.length>=limit)throw Error('overflow');queue.push(capture(input));
  if(!scheduled){scheduled=true;schedule(()=>{scheduled=false;void flush();});}return true;
 }catch{gaps++;try{onGap({status:'recording-gap',count:gaps});}catch{}return false;}}
 async function flush(){if(running)return running;const batch=queue.splice(0,limit);
  running=(async()=>{for(let attempt=1;attempt<=3;attempt++){try{if(batch.length)await append(importSnapshot(exportSnapshot(batch)));return {recorded:batch.length,gaps};}catch{}}
  gaps+=batch.length;try{onGap({status:'recording-gap',count:gaps});}catch{}return {recorded:0,gaps};})().finally(()=>{running=null;});return running;}
 return {observe,flush,health:()=>({pending:queue.length,gaps})};
}
