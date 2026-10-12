// Dedicated destination gateway; never fetches source URLs. Not the legacy STORAGE/ASSETS Worker.
function key(value) {
  if(typeof value!=='string'||!value||new TextEncoder().encode(value).length>1024||/[\\\x00-\x1f\x7f]/.test(value)||value.startsWith('/')||value.startsWith('.redown-transfer/')||value.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('INVALID_KEY');
  return value;
}
function uploadIdentity(input) {
  if(!/^[a-f0-9-]{36}$/.test(input.jobId)||!/^[a-f0-9-]{36}$/.test(input.attempt))throw Error('INVALID_UPLOAD');
  return input.jobId+'/'+input.attempt;
}
async function boundedBody(request,max) {
  const reader=request.body?.getReader();if(!reader)throw Error('EMPTY_BODY');
  let total=0;const chunks=[];
  try {for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('BODY_BUDGET');chunks.push(value);}}
  finally {await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export default {
  async fetch(request,env) {
    if(request.method!=='POST')return Response.json({error:'METHOD'},{status:405});
    if(!env.GATEWAY_TOKEN||request.headers.get('authorization')!=='Bearer '+env.GATEWAY_TOKEN)return Response.json({error:'AUTH'},{status:401});
    try {
      const command=request.headers.has('x-transfer-command')?JSON.parse(decodeURIComponent(request.headers.get('x-transfer-command'))):
        JSON.parse(new TextDecoder().decode(await boundedBody(request,16384)));
      if(command.action==='inspect'||command.action==='read') {
        const object=await (command.action==='inspect'?env.TRANSFER_BUCKET.head(key(command.key)):env.TRANSFER_BUCKET.get(key(command.key)));
        if(command.action==='inspect')return Response.json({object:object?{size:object.size,jobId:object.customMetadata?.transferJob,digest:object.customMetadata?.sha256}:null});
        if(!object)return Response.json({error:'NOT_FOUND'},{status:404});
        return new Response(object.body,{headers:{'content-length':String(object.size),'cache-control':'no-store'}});
      }
      const upload=command.upload||{jobId:command.jobId,attempt:command.attempt};
      const id=env.UPLOADS.idFromName(uploadIdentity(upload));
      const headers=new Headers(request.headers);headers.set('x-transfer-command',encodeURIComponent(JSON.stringify({...command,upload})));
      return env.UPLOADS.get(id).fetch(new Request('https://upload-session/',{method:'POST',headers,body:request.headers.has('x-transfer-command')?request.body:null,duplex:'half'}));
    } catch {return Response.json({error:'INVALID_COMMAND'},{status:400});}
  }
};
export class UploadSession {
  constructor(state,env){this.state=state;this.env=env;this.serial=Promise.resolve();}
  async fetch(request) {
    // Serialize within the active instance; awaited storage gates persist checkpoints.
    // Avoid blockConcurrencyWhile around long I/O (platform 30-second block limit).
    const operation=this.serial.then(async()=>{
      try {
        const c=JSON.parse(decodeURIComponent(request.headers.get('x-transfer-command'))), identity=uploadIdentity(c.upload);
        let session=await this.state.storage.get('session');
        const stage='.redown-transfer/'+identity;
        const bucket=this.env.TRANSFER_BUCKET;
        if(c.action==='begin') {
          if(!session) {
            const upload=await bucket.createMultipartUpload(stage);
            session={stage,uploadId:upload.uploadId,parts:[],complete:false};
            await this.state.storage.put('session',session);
            // Long-lived cleanup alarm; no expiration of job intent in executor.
            await this.state.storage.setAlarm(Date.now()+24*3600000);
          }
          return Response.json({upload:c.upload});
        }
        if(!session)return Response.json({error:'SESSION_MISSING'},{status:404});
        const multipart=bucket.resumeMultipartUpload(stage,session.uploadId);
        if(c.action==='part') {
          if(session.complete||!Number.isSafeInteger(c.number)||c.number<1||c.number>10000)throw Error('PART');
          const bytes=await boundedBody(request,8*1024*1024);
          const part=await multipart.uploadPart(c.number,bytes);
          session.parts=session.parts.filter(p=>p.partNumber!==c.number).concat(part).sort((a,b)=>a.partNumber-b.partNumber);
          await this.state.storage.put('session',session);
          return Response.json({part});
        }
        if(c.action==='commit') {
          const target=key(c.key),proof=c.evidence;
          if(proof.jobId!==c.upload.jobId||!/^[a-f0-9]{64}$/.test(proof.digest)||!Number.isSafeInteger(proof.bytes)||proof.bytes<0)throw Error('PROOF');
          const prior=await bucket.head(target);
          if(prior?.customMetadata?.transferJob===proof.jobId)return Response.json({published:true});
          if(!session.complete) {
            // Lost complete response: exact immutable staging key is independently inspectable.
            if(!await bucket.head(stage))await multipart.complete(session.parts);
            session.complete=true;await this.state.storage.put('session',session);
          }
          const object=await bucket.get(stage);
          if(!object||object.size!==proof.bytes)throw Error('STAGE_SIZE');
          const result=await bucket.put(target,object.body,{onlyIf:{etagDoesNotMatch:'*'},
            customMetadata:{transferJob:proof.jobId,sha256:proof.digest},httpMetadata:{contentType:'application/octet-stream'}});
          await bucket.delete(stage);await this.state.storage.deleteAlarm();
          return Response.json({published:Boolean(result)});
        }
        if(c.action==='cleanup') {
          if(!session.complete&&!session.aborted)await multipart.abort();
          session.aborted=true;await this.state.storage.put('session',session);
          await bucket.delete(stage);await this.state.storage.deleteAlarm();
          return Response.json({ok:true});
        }
        return Response.json({error:'ACTION'},{status:400});
      } catch {return Response.json({error:'R2_EFFECT_FAILED'},{status:503});}
    });
    this.serial=operation.catch(()=>{});return operation;
  }
  async alarm() {
    const s=await this.state.storage.get('session');if(!s)return;
    if(!s.complete)await this.env.TRANSFER_BUCKET.resumeMultipartUpload(s.stage,s.uploadId).abort();
    await this.env.TRANSFER_BUCKET.delete(s.stage);
  }
}
