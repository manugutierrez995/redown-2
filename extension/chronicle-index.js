(function(root){
const {importSnapshot,exportSnapshot}=root.RedownChronicleDomain;
// One activation transaction replaces events and revision. Cache is never file truth.
function createChronicleIndex(indexedDB,{name='redown-chronicle-v1',diagnostics}={}){
 function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{
  const db=r.result;const s=db.createObjectStore('events',{keyPath:'id'});
  for(const [k,path] of [['overUrl','page.overUrl'],['siteItemId','siteItemId'],['filename','filename'],['size','size'],['destination',['destination.accountId','destination.bucket','destination.key']],['time','time']])s.createIndex(k,path);
  db.createObjectStore('meta',{keyPath:'id'});
 };r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('INDEX_UNAVAILABLE'));r.onblocked=()=>reject(Error('INDEX_MIGRATION_BLOCKED'));});}
 const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('INDEX_TRANSACTION_FAILED'));});
 async function activate(snapshot,{revision,complete=false}={}){const events=importSnapshot(snapshot);if(typeof revision!=='string'||revision.length>128)throw Error('REVISION_REQUIRED');
  const db=await open();try{const tx=db.transaction(['events','meta'],'readwrite'),finished=done(tx);const s=tx.objectStore('events');s.clear();events.forEach(e=>s.put(e));tx.objectStore('meta').put({id:'active',revision,complete,count:events.length,authority:'disposable-projection'});await finished;try{diagnostics?.emit("REDOWN.CHRONICLE.INDEX.ACTIVATED","index-activation",{count:events.length});}catch{}return {revision,count:events.length};}finally{db.close();}}
 async function read(store,key){const db=await open();try{const tx=db.transaction(store,'readonly'),finished=done(tx);const r=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);const data=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('INDEX_READ_FAILED'));});await finished;return data;}finally{db.close();}}
 return {activate,async export(){return exportSnapshot(await read('events'));},async freshness(expectedRevision){const m=await read('meta','active');return {status:!m?'missing':m.revision!==expectedRevision?'stale':m.complete?'current':'partial',metadata:m||null,fileExistence:'unknown'};}};
}

root.RedownChronicleIndex={createChronicleIndex};
})(globalThis);
