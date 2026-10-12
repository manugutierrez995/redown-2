import {digest,serialize} from './io.mjs';
import {structure} from './schema.mjs';
// No eager conversion. Retain original bytes alongside auditable normalized representation.
export function normalizeSnapshot(originalBytes){
  const original=Buffer.from(originalBytes);if(original.length>4*1024*1024)throw Error('model-too-large');
  const model=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original));
  if(model.semanticGraphVersion!=='0.1')throw Error('unsupported-graph-version');
  if(structure(model).length)throw Error('invalid-graph');
  const normalized={...model,entities:[...model.entities].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),edges:[...model.edges].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
  const normalizedBytes=serialize(normalized);
  return {originalBytes:original,normalizedBytes,audit:{transform:'redown.semantic.normalize.0.1',fromVersion:'0.1',toVersion:'0.1',originalDigest:digest(original),normalizedDigest:digest(normalizedBytes),authority:'unchanged',losslessOptionalFields:true}};
}
