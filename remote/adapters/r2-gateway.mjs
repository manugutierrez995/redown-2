import {TransferError} from '../../packages/transfer-core/index.mjs';
export class R2Gateway {
  constructor({url,token,accountId,bucket,fetchImpl=fetch,timeoutMs=60000,diagnostics,traceId="gateway"}) {Object.assign(this,{url,token,accountId,bucket,fetchImpl,timeoutMs,diagnostics,traceId});}
  observe(code,details={}) {try{const pending=this.diagnostics?.emit(code,this.traceId,details);pending?.catch?.(()=>{});}catch{} }
  scope(location) {if(location.accountId!==this.accountId||location.bucket!==this.bucket)throw new TransferError('DESTINATION_SCOPE');}
  async request(action,data,bytes) {
    let response;
    try {response=await this.fetchImpl(this.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(this.timeoutMs),
      headers:{authorization:'Bearer '+this.token,'content-type':bytes?'application/octet-stream':'application/json',
        ...(bytes?{'x-transfer-command':encodeURIComponent(JSON.stringify({action,...data}))}:{})},
      body:bytes||JSON.stringify({action,...data})});}
    catch {this.observe('REDOWN.R2.UPLOAD.NETWORK_UNKNOWN',{action});throw new TransferError('DESTINATION_NETWORK',true);}
    if(!response.ok){this.observe(response.status===503?'REDOWN.R2.UPLOAD.RESPONSE_503':'REDOWN.R2.UPLOAD.HTTP_REJECTED',{status:response.status,action});throw new TransferError('DESTINATION_'+response.status,[429,500,502,503,504].includes(response.status));}
    return response;
  }
  async inspect(location) {this.scope(location);return (await (await this.request('inspect',{key:location.key})).json()).object;}
  async read(location) {this.scope(location);return (await this.request('read',{key:location.key})).body;}
  async begin(location,jobId,attempt) {this.scope(location);return (await (await this.request('begin',{jobId,attempt})).json()).upload;}
  async part(upload,number,bytes) {return (await (await this.request('part',{upload,number},bytes)).json()).part;}
  async commit(upload,location,evidence) {this.scope(location);return (await (await this.request('commit',{upload,key:location.key,evidence})).json()).published;}
  async cleanup(upload) {await this.request('cleanup',{upload});}
}
