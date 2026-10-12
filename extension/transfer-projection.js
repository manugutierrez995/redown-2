// Disposable IndexedDB UI projection. It cannot enqueue or resume remote jobs.
(function(root){
  async function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('redown-transfer-projection',2);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('jobs'))r.result.createObjectStore('jobs',{keyPath:'jobId'});};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function reconcile(jobs){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction('jobs','readwrite'),store=tx.objectStore('jobs');
    store.clear();for(const job of jobs)store.put(job);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
  root.RedownTransferProjection={reconcile};
})(globalThis);
