// Browser- and provider-independent, read-only provenance model v0.1.
// No network, deletion, hashing, persistence or implicit transfer side effects.
export const FORMAT = "redown.chronicle.v1";
export const MAX_EVENTS = 100000;
const ROLES = new Set(["clicked-url","metadata-url","asset-url","redirect-url","generated-blob-url","other"]);
const SAFE = new Set(["http:","https:"]);
function plain(x){return x && typeof x==="object" && !Array.isArray(x);}
function str(x,n=2048){return typeof x==="string" && x.length>0 && x.length<=n;}
function fail(message){throw new TypeError("chronicle: "+message);}
export function safeUrl(input) {
  if (!str(input,8192)) return null;
  try {
    const u=new URL(input);
    if (!SAFE.has(u.protocol) || u.username || u.password) return null;
    // Provenance exports deliberately omit all URL queries and fragments:
    // signed URLs and tokens may appear under arbitrary parameter names.
    u.search="";u.hash="";
    return u.toString().slice(0,2048);
  } catch { return null; }
}
function checkEvent(e){
  if(!plain(e) || !str(e.id,128) || !str(e.time,64) || !Number.isFinite(Date.parse(e.time)))fail("invalid event identity or timestamp");
  if(!plain(e.page)||!str(e.page.overUrl)||!safeUrl(e.page.overUrl))fail("public http(s) overUrl required");
  if(e.page.title!==undefined && (typeof e.page.title!=="string"||e.page.title.length>512))fail("invalid title");
  if(!Array.isArray(e.references)||e.references.length>256)fail("bounded references required");
  for(const r of e.references){
    if(!plain(r)||!ROLES.has(r.role)||!str(r.url)||r.url!==safeUrl(r.url))fail("unsafe or unredacted reference URL");
  }
  if(e.page.overUrl!==safeUrl(e.page.overUrl))fail("unsafe or unredacted overUrl");
  if(e.filename!==undefined && (typeof e.filename!=="string"||e.filename.length>512))fail("invalid filename");
  if(e.size!==undefined && (!Number.isSafeInteger(e.size)||e.size<0))fail("invalid observed size");
  if(e.mime!==undefined && (typeof e.mime!=="string"||e.mime.length>128))fail("invalid type");
  if(e.destination!==undefined && (!plain(e.destination)||!["accountId","bucket","key"].every(k=>str(e.destination[k],2048))))fail("invalid destination");
  if(!["observed","partial","deferred","failed-to-record","reconciled"].includes(e.recording))fail("invalid recorder status");
  if(!["unknown","candidate","verified","mismatch"].includes(e.integrity))fail("invalid integrity status");
  return e;
}
function text(x,n){return typeof x==="string"?x.slice(0,n):undefined;}
export function capture(input){
  if(!plain(input))fail("capture requires an object");
  const overUrl=safeUrl(input.overUrl);
  if(!overUrl)fail("public page URL required; caller may record a gap instead");
  const refs=[];
  for(const r of (Array.isArray(input.references)?input.references:[]).slice(0,256)){
    if(!ROLES.has(r?.role))continue;
    const url=safeUrl(r.url);
    if(url)refs.push({role:r.role,url});
  }
  const out={id:input.id,time:input.time,page:{overUrl,...(text(input.title,512)!==undefined?{title:text(input.title,512)}:{})},references:refs,recording:input.recording||"observed",integrity:"unknown"};
  if(text(input.filename,512)!==undefined)out.filename=text(input.filename,512);
  if(Number.isSafeInteger(input.size)&&input.size>=0)out.size=input.size;
  if(text(input.mime,128)!==undefined)out.mime=text(input.mime,128);
  if(input.destination!==undefined)out.destination=input.destination;
  return checkEvent(out);
}
export function exportSnapshot(events){
  if(!Array.isArray(events)||events.length>MAX_EVENTS)fail("event limit exceeded");
  const ids=new Set();
  for(const e of events){checkEvent(e);if(ids.has(e.id))fail("duplicate event ID");ids.add(e.id);}
  const sorted=[...events].sort((a,b)=>a.id.localeCompare(b.id));
  return JSON.stringify({format:FORMAT,complete:true,events:sorted});
}
export function importSnapshot(json){
  if(typeof json!=="string"||json.length>50_000_000)fail("snapshot exceeds safe limit");
  let doc;try{doc=JSON.parse(json);}catch{fail("invalid JSON");}
  if(!plain(doc)||doc.format!==FORMAT||doc.complete!==true||!Array.isArray(doc.events))fail("unsupported or incomplete snapshot");
  // Create a validated, independent copy; never trust snapshot for destructive actions.
  return JSON.parse(exportSnapshot(doc.events)).events;
}
export function lookup(events,{overUrl,filename,size}={}){
  if(!Array.isArray(events))fail("events array required");
  const page=safeUrl(overUrl);
  if(!page)return {status:"unknown",count:0,matches:[]};
  const matches=events.filter(e=>{checkEvent(e);return e.page.overUrl===page;}).map(e=>({id:e.id,time:e.time,filename:e.filename??null,size:e.size??null,destination:e.destination??null,recognition:filename&&e.filename===filename&&size!==undefined&&e.size===size?"url-name-size":"page-url"}));
  return {status:matches.length?"possible-match":"unknown",count:matches.length,matches};
}
export function toJSONL(events){
  // Lossless event records; metadata only, no browser-dependent code.
  return importSnapshot(exportSnapshot(events)).map(e=>JSON.stringify(e)).join("\n")+(events.length?"\n":"");
}
export function fromJSONL(source){
  if(typeof source!=="string"||source.length>50_000_000)fail("journal too large");
  if(source && !source.endsWith("\n"))fail("incomplete journal tail");
  const events=source.split("\n").filter(Boolean).map(s=>{try{return JSON.parse(s);}catch{fail("invalid journal entry");}});
  return importSnapshot(exportSnapshot(events));
}
