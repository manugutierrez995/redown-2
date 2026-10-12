import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSemanticApi} from '../agent/semantic/api.mjs';
import {Model} from '../agent/semantic/vendor/forever-works-0.1/src/model.js';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/semantic/0.1/model.json',import.meta.url)));
test('archived hostile fixtures produce stable errors on the released decoder',()=>{
 const cases=JSON.parse(readFileSync(new URL('./fixtures/semantic/0.1/hostile-cases.json',import.meta.url)));
 for(const c of cases){const m=fixture();
  if(c.mutation==='missing-endpoint')m.edges[0].to='missing.id';
  if(c.mutation==='duplicate-id')m.entities.push(m.entities[0]);
  if(c.mutation==='forged-browser')m.entities[0].evidenceStatus='observed-in-browser';
  if(c.mutation==='unsafe-path')m.entities[0].sourceRefs=[{path:'../credentials',symbol:'x',role:'source',sha256:'a'.repeat(64)}];
  if(c.mutation==='future-version')m.semanticGraphVersion='0.2';
  if(c.mutation==='private-record')m.entities[0].extra='Bearer abcdefghijklmnopqrstuvwxyz';
  assert.equal(createSemanticApi({model:m}).query('listEntities').error.code,c.expected,c.name);
 }
});
// Independent graph representation: repeated relational joins, no adjacency cache or production walker.
function relationalTrace(model,start,direction,depth){let found=new Set([start]),front=new Set([start]);for(let d=0;d<depth;d++){const next=new Set();for(const edge of model.edges){if(direction!=='in'&&front.has(edge.from)&&!found.has(edge.to))next.add(edge.to);if(direction!=='out'&&front.has(edge.to)&&!found.has(edge.from))next.add(edge.from);}for(const id of next)found.add(id);front=next;}return [...found].sort();}
test('replacement relational reader preserves directed depth semantics across rewrite fixtures',()=>{
 const m=fixture();m.edges.push({...m.edges[0],id:'fixture.reverse',from:'fixture.test',to:'fixture.intent'});
 const api=createSemanticApi({model:m});
 for(const start of m.entities.map(x=>x.id))for(const direction of ['in','out','both'])for(const depth of [0,1,2,3,8]){
  const actual=api.query('traceDependencies',{id:start,direction,depth,limit:100}).data.entities.items.map(e=>e.id);
  assert.deepEqual(actual,relationalTrace(m,start,direction,depth));
 }
 const changed=structuredClone(m);for(const e of changed.entities)e.extensions={'org.example':{implementation:'rewritten language and source layout'}};
 assert.deepEqual(createSemanticApi({model:changed}).query('traceDependencies',{id:'fixture.capability',depth:8}).data.entities.items.map(e=>e.id),relationalTrace(m,'fixture.capability','both',8));
});
test('replacement evaluation remains partial when browser evidence is absent; failure dominates',()=>{
 const records=[{foreverVersion:'0.1',id:'redown.dependency.request-owner',kind:'dependency',dependencyName:'request owner',dependencyType:'semantic contract',purpose:'Reject stale writes.',reasonSelected:'Proposal from incident.',replacementClassification:'SEMANTIC',requiredCapabilities:['redown.capability.context'],protectedInvariants:['redown.invariant.freshness','redown.invariant.browser'],currentImplementation:'redown.implementation.counter'},
 {foreverVersion:'0.1',id:'redown.capability.context',kind:'capability',name:'Context',statement:'Bind destination.'},
 ...['freshness','browser'].map(id=>({foreverVersion:'0.1',id:'redown.invariant.'+id,kind:'invariant',name:id,statement:id,severity:'high'})),
 {foreverVersion:'0.1',id:'redown.implementation.counter',kind:'implementation',type:'fixture',technology:'generation counter',satisfiesCapabilities:['redown.capability.context']},
 {foreverVersion:'0.1',id:'redown.implementation.token',kind:'implementation',type:'fixture',technology:'opaque context token',satisfiesCapabilities:['redown.capability.context'],claims:[{requirement:'redown.capability.context',status:'pass'},{requirement:'redown.invariant.freshness',status:'pass'}]}];
 const model=new Model({foreverVersion:'0.1',projectId:'redown.replacement-proposal',records:{}},records);assert.deepEqual(model.validate(),[]);
 assert.equal(model.evaluateReplacement('redown.dependency.request-owner','redown.implementation.token').result,'partial');records.at(-1).claims.push({requirement:'redown.invariant.browser',status:'fail'});assert.equal(model.evaluateReplacement('redown.dependency.request-owner','redown.implementation.token').result,'fail');
});
test('large reachable graph stops at visited budget and pagination never hides truncation',()=>{
 const m=fixture();m.entities=[];m.edges=[];m.coverage=[];
 for(let i=0;i<700;i++){m.entities.push({...fixture().entities[0],id:'fixture.node.'+i});if(i)m.edges.push({...fixture().edges[0],id:'fixture.edge.'+i,from:'fixture.node.0',to:'fixture.node.'+i});}
 const r=createSemanticApi({model:m}).query('traceDependencies',{id:'fixture.node.0',depth:2,limit:10});assert.equal(r.data.truncated,true);assert.equal(r.data.entities.total,500);assert.equal(r.data.entities.items.length,10);
});

import {digest} from '../agent/semantic/io.mjs';
test('frozen APIs/fixtures stay byte-identical and all original incident journal prefixes survive',()=>{
 const frozen=JSON.parse(readFileSync(new URL('./fixtures/semantic/0.1/frozen-contracts.json',import.meta.url)));
 for(const [path,hash] of Object.entries(frozen.frozenFiles))assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url))),hash,path);
 for(const [path,prefix] of Object.entries(frozen.journalPrefixes))assert.equal(digest(readFileSync(new URL('../'+path,import.meta.url)).subarray(0,prefix.bytes)),prefix.sha256,path);
});
test('vendored actual upstream sources and schemas retain pinned hashes',()=>{
 const pin=JSON.parse(readFileSync(new URL('../agent/semantic/vendor/forever-works-0.1/UPSTREAM.json',import.meta.url)));
 for(const [path,info] of Object.entries(pin.files))assert.equal(digest(readFileSync(new URL('../agent/semantic/vendor/forever-works-0.1/'+path,import.meta.url))),info.sha256,path);
});
