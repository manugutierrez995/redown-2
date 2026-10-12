import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const compare=(a,b)=>a<b?-1:a>b?1:0;
export const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function canonical(v){
  if(Array.isArray(v))return v.map(canonical);
  if(object(v))return Object.fromEntries(Object.keys(v).sort(compare).map(k=>[k,canonical(v[k])]));
  return v;
}
export const serialize=v=>JSON.stringify(canonical(v),null,2)+'\n';
export const safePath=p=>typeof p==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(p)
  &&!p.split('/').some(x=>x==='.'||x==='..'||x.startsWith('.env')||['.git','.aws','.codex','.agents','node_modules','work'].includes(x))
  &&!/(?:secret|credential|private-key)/i.test(p);
export function readScoped(root,path,max=8*1024*1024){
  if(!safePath(path))throw Error('unsafe-path');
  const base=realpathSync(root),target=realpathSync(resolve(base,path)),rel=relative(base,target);
  if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||!safePath(rel))throw Error('unsafe-path');
  const stat=statSync(target);
  if(!stat.isFile())throw Error('invalid-file');
  if(stat.size>max)throw Error('file-too-large');
  const bytes=readFileSync(target);
  if(bytes.length>max)throw Error('file-too-large');
  return bytes;
}
export function decode(bytes){return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
// A conservative tripwire, not a proof that author-reviewed records contain no PII.
export const secretLike=text=>/(?:Bearer\s+[A-Za-z0-9._-]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:token|password|secret)\s*[=:]\s*["']?[A-Za-z0-9_+\/-]{16,})/i.test(text);
