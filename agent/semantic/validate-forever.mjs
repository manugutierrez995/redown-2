import {Model,createForeverApiFromModel} from './vendor/forever-works-0.1/src/model.js';
import {FOREVER_PIN} from './bridge.mjs';
import {safePath} from './io.mjs';
// This is the pinned actual upstream reference implementation, not a ReDown imitation.
// Published JSON Schema validation is independent (tests/semantic-schema-conformance.py).
export function validateForeverProposal(proposal){
  if(proposal?.foreverVersion!=='0.1'||proposal?.foreverApiVersion!=='0.1'||proposal?.upstreamCommit!==FOREVER_PIN)return {valid:false,error:{code:'unsupported-forever-version'}};
  const paths=Object.values(proposal.manifest?.records||{}).flat();
  if(paths.some(p=>!safePath(p)||!Object.hasOwn(proposal.files||{},p))||new Set(paths).size!==paths.length||Object.keys(proposal.files||{}).length!==paths.length)return {valid:false,error:{code:'invalid-proposal-manifest'}};
  const model=new Model(proposal.manifest,paths.map(p=>proposal.files[p]));
  const api=createForeverApiFromModel(model);
  return {...api.validateModel(),layer:'actual-upstream-javascript-reference',upstreamCommit:FOREVER_PIN,discovery:api.describe(),schemaCompatibility:'requires-independent-published-schema-validation',reviewStatus:'unreviewed',authority:'proposed',certified:false};
}
