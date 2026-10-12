import {readFileSync} from 'node:fs';
import {object} from './io.mjs';
const schema=JSON.parse(readFileSync(new URL('./schemas/0.1/graph.schema.json',import.meta.url),'utf8'));
// Deliberately limited to assertions in the versioned schema; independent JSON Schema tests also run.
export function structure(value){
  const errors=[];
  function check(s,v,path){
    const match=t=>t==='object'?object(v):t==='array'?Array.isArray(v):t==='integer'?Number.isInteger(v):typeof v===t;
    const bad=()=>errors.push({code:'invalid-structure',location:path});
    if(s.type&&!match(s.type)){bad();return;}
    if(s.const!==undefined&&v!==s.const)bad();
    if(s.enum&&!s.enum.includes(v))bad();
    if(typeof v==='string'&&((s.pattern&&!new RegExp(s.pattern).test(v))||(s.maxLength&&[...v].length>s.maxLength)))bad();
    if(Array.isArray(v)){if(v.length>(s.maxItems??Infinity))bad();else v.forEach((x,i)=>check(s.items,x,path+'['+i+']'));}
    if(object(v)){for(const k of s.required||[])if(!Object.hasOwn(v,k))errors.push({code:'invalid-structure',location:path+'.'+k});for(const [k,child]of Object.entries(s.properties||{}))if(Object.hasOwn(v,k))check(child,v[k],path+'.'+k);}
  }
  check(schema,value,'graph');return errors;
}
