// Single-writer durable diagnostic journal, outside disposable browser cache.
import {open,readFile,stat,truncate} from 'node:fs/promises';
import '../../extension/diagnostic-core.js';
import {exportSnapshot} from './index.mjs';
const C=globalThis.RedownDiagnosticCore;
export class FileJournal {
 constructor(path,{maxBytes=32*1024*1024,diagnostics,recordKind="diagnostic"}={}){this.path=path;this.maxBytes=maxBytes;this.diagnostics=diagnostics;this.recordKind=recordKind;this.serial=Promise.resolve();}
 valid(records){try{return this.recordKind==='chronicle'?Boolean(exportSnapshot(records)):C.validate(records).valid;}catch{return false;}}
 identity(e){return this.recordKind==='chronicle'?e.id:e.eventId;}
 async recover(){
  let text;try{if((await stat(this.path)).size>this.maxBytes)throw Error('JOURNAL_BUDGET');text=await readFile(this.path,'utf8');}catch(e){if(e.code==='ENOENT')return {events:[],tailCorrupt:false,validBytes:0};throw e;}
  if(Buffer.byteLength(text)>this.maxBytes)throw Error('JOURNAL_BUDGET');
  const events=[],byId=new Map();let validBytes=0,tailCorrupt=false;
  for(const line of text.split(/(?<=\n)/)){
   if(!line)continue;
   try{if(!line.endsWith('\n')||Buffer.byteLength(line)>C.LIMITS.lineBytes)throw Error();const e=JSON.parse(line);
    if(!this.valid([e]))throw Error();
    if(byId.has(this.identity(e))){if(JSON.stringify(byId.get(this.identity(e)))!==JSON.stringify(e))throw Error('ID_CONFLICT');}
    else{byId.set(this.identity(e),e);events.push(e);}validBytes+=Buffer.byteLength(line);
   }catch{tailCorrupt=true;break;}
  }if(tailCorrupt){try{this.diagnostics?.emit("REDOWN.CHRONICLE.RECOVERY.TAIL_CORRUPT","journal-recovery",{validBytes});}catch{}}return {events,tailCorrupt,validBytes};
 }
 append(events){const task=this.serial.then(async()=>{
  if(!this.valid(events))throw Error('INVALID_EVENTS');const recovered=await this.recover();
  if(recovered.tailCorrupt)throw Error('TAIL_REPAIR_REQUIRED');
  const existing=new Map(recovered.events.map(e=>[this.identity(e),JSON.stringify(e)]));const fresh=[];
  for(const e of events){const old=existing.get(this.identity(e)),line=JSON.stringify(e);if(old&&old!==line)throw Error('ID_CONFLICT');if(!old){fresh.push(e);existing.set(this.identity(e),line);}}
  const data=fresh.map(e=>JSON.stringify(e)+'\n').join('');if(recovered.validBytes+Buffer.byteLength(data)>this.maxBytes)throw Error('JOURNAL_BUDGET');
  const f=await open(this.path,'a',0o600);try{await f.writeFile(data);await f.sync();}finally{await f.close();}return fresh.length;
 });this.serial=task.catch(()=>{});return task;}
 // Explicit repair command is outside the reader API. Preserve original journal before using it.
 async repairTail(){const r=await this.recover();if(r.tailCorrupt){await truncate(this.path,r.validBytes);const f=await open(this.path,'a');try{await f.sync();}finally{await f.close();}}return r;}
 async load(){const r=await this.recover();if(r.tailCorrupt)throw Error('TAIL_CORRUPT');return r.events;}
}

export class ChronicleFileJournal extends FileJournal {constructor(path,options={}){super(path,{...options,recordKind:"chronicle"});}}
