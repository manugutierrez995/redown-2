// Portable segmented metadata archive. Ports supply SHA-256; no I/O or credentials.
import {exportSnapshot,importSnapshot,toJSONL,fromJSONL} from './index.mjs';
export async function createArchive(events,{scope,revision,complete=false,segmentEvents=200,sha256}={}){
 if(!scope||typeof scope.accountId!=='string'||typeof scope.region!=='string'||typeof revision!=='string'||!revision||revision.length>128||typeof sha256!=='function')throw Error('ARCHIVE_SCOPE_REQUIRED');
 if(!Number.isInteger(segmentEvents)||segmentEvents<1||segmentEvents>500)throw Error('SEGMENT_BUDGET');
 const validated=importSnapshot(exportSnapshot(events)),segments=[];
 for(let i=0;i<validated.length;i+=segmentEvents){const jsonl=toJSONL(validated.slice(i,i+segmentEvents)),checksum=await sha256(jsonl);if(!/^[a-f0-9]{64}$/.test(checksum))throw Error('CHECKSUM_REQUIRED');segments.push({id:'segment-'+segments.length,jsonl,checksum,count:Math.min(segmentEvents,validated.length-i)});}
 return {manifest:{format:'redown.chronicle.archive.v1',schemaVersion:1,scope:{accountId:scope.accountId,region:scope.region},revision,complete,coverage:'provided-events-only',redaction:'URL queries/fragments omitted; source history remains private',events:validated.length,segments:segments.map(({id,checksum,count})=>({id,checksum,count}))},segments};
}
export async function restoreArchive(archive,{sha256,maxSegments=500}={}){
 const m=archive?.manifest;if(m?.format!=='redown.chronicle.archive.v1'||m.schemaVersion!==1||!Array.isArray(m.segments)||m.segments.length>maxSegments||typeof sha256!=='function')throw Error('INVALID_ARCHIVE');
 let bytes=0;const events=[];for(const expected of m.segments){const part=archive.segments?.find(s=>s.id===expected.id);if(!part||typeof part.jsonl!=='string'||(bytes+=part.jsonl.length)>50_000_000||await sha256(part.jsonl)!==expected.checksum)throw Error('CHECKSUM_MISMATCH');const records=fromJSONL(part.jsonl);if(records.length!==expected.count)throw Error('SEGMENT_COUNT');if(events.length+records.length>100000)throw Error("EVENT_BUDGET");events.push(...records);}
 const validated=importSnapshot(exportSnapshot(events));if(validated.length!==m.events)throw Error('ARCHIVE_COUNT');return {events:validated,scope:m.scope,revision:m.revision,complete:m.complete,executable:false,cleanupEligible:false};
}
export function createHistoryVault({putImmutable,read,sha256}){
 let status={state:'disabled',generation:null};
 return {status:()=>({...status}),async backup(events,config){
  if(config?.optIn!==true)return {state:'disabled'};
  if(!config.accountId||!config.bucket||!/^history\/[a-zA-Z0-9_-]+\/$/.test(config.prefix||'')||!/^generation-[a-zA-Z0-9_-]{1,80}$/.test(config.generation||''))throw Error('EXPLICIT_VAULT_SCOPE_REQUIRED');
  const root=config.prefix+config.generation+'/';
  try{const archive=await createArchive(events,{scope:{accountId:config.accountId,region:config.region||'unknown'},revision:config.generation,complete:false,sha256});
   for(const part of archive.segments)await putImmutable({...config,key:root+part.id+'.jsonl',value:part.jsonl});
   const manifest=JSON.stringify(archive.manifest);await putImmutable({...config,key:root+'manifest.json',value:manifest});
   // Readback of exact manifest and each segment is independent from PUT acknowledgment.
   const restored=JSON.parse(await read({...config,key:root+'manifest.json'}));const parts=[];
   for(const p of restored.segments)parts.push({...p,jsonl:await read({...config,key:root+p.id+'.jsonl'})});
   await restoreArchive({manifest:restored,segments:parts},{sha256});status={state:'backed-up-readback',generation:config.generation};
  }catch{status={state:'backup-failed',generation:config.generation};}return {...status};
 },shouldIndex(key,config){return !key.startsWith(config.prefix);}};
}
