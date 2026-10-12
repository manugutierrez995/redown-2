import {digest,serialize} from './io.mjs';
export const FOREVER_PIN='230c67fa7e27577c53b6f7895df442a2ab24e4cb';
const buckets={intent:'intent',capability:'capabilities',invariant:'invariants',implementation:'implementations',evidence:'evidence',decision:'decisions'};
// Export proposals using actual v0.1 kinds. A lesson is a decision proposal, not a new normative kind.
export function exportProposal(entities,edges,origin){
  const ids=new Set(entities.map(x=>x.id));
  const related=(id,type,kind)=>edges.filter(e=>e.from===id&&e.type===type&&ids.has(e.to)).map(e=>entities.find(x=>x.id===e.to)).filter(x=>x?.kind===kind).map(x=>x.id).sort();
  const records=[],omitted=[];
  for(const entity of entities){
    let kind=entity.kind==='lesson'?'decision':entity.kind==='component'?'implementation':entity.kind;
    if(!buckets[kind]){omitted.push({id:entity.id,reason:'No safe normative projection for this project-specific kind.'});continue;}
    const record={foreverVersion:'0.1',id:entity.id,kind,provenance:{sourceType:'agent-proposed',reviewStatus:'unreviewed',confidence:0,sourceReference:origin},extensions:{'org.redown':{status:'proposed',sourceEntity:entity,edges:edges.filter(e=>e.from===entity.id||e.to===entity.id),authority:'Export never constitutes intent acceptance.',confidenceMeaning:'Required numeric field is a conservative lower bound, not a measured probability.'}}};
    if(kind==='intent')Object.assign(record,{name:entity.id,statement:entity.purpose,purpose:[entity.purpose],relatedCapabilities:related(entity.id,'realizes','capability'),status:'proposed'});
    if(kind==='capability')Object.assign(record,{name:entity.id,statement:entity.purpose,relatedInvariants:related(entity.id,'requires','invariant'),status:'proposed'});
    if(kind==='invariant')Object.assign(record,{name:entity.id,statement:entity.purpose,severity:'high'});
    if(kind==='implementation')Object.assign(record,{type:'source-component',technology:'Current ReDown implementation; replaceable subject to reviewed contracts.',satisfiesCapabilities:[],replaceability:'unknown'});
    if(kind==='evidence')Object.assign(record,{type:'source-or-historical-reference',source:entity.sourceRefs[0]?.path||origin,statementSupported:entity.purpose,confidence:0,immutableReference:entity.sourceRefs[0]?.sha256||digest(serialize(entity)),timestampVersion:origin});
    if(kind==='decision')Object.assign(record,{title:entity.id,status:'proposed',context:entity.applicability?.join(' ')||entity.purpose,decision:entity.purpose,rationale:'Review source, counterevidence and scope before reuse; no automatic authority promotion.'});
    records.push(record);
  }
  records.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const files={};const manifest={foreverVersion:'0.1',projectId:'redown.learning-proposal',records:{},extensions:{'org.redown':{status:'proposed',upstreamCommit:FOREVER_PIN,origin}}};
  for(const r of records){const path='records/'+r.id+'.json';files[path]=r;(manifest.records[buckets[r.kind]]||=[]).push(path);}
  return {status:'proposed',reviewStatus:'unreviewed',foreverVersion:'0.1',foreverApiVersion:'0.1',upstreamCommit:FOREVER_PIN,compatibility:{status:'blocked-by-published-schema',code:'upstream-version-pattern',note:'Pinned published schemas reject documented foreverVersion 0.1; the reference library accepts it. Independent validation records both results. No compatibility certification.'},manifest,files,omitted};
}
