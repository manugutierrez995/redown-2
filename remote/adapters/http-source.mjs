import http from 'node:http';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {TransferError} from '../../packages/transfer-core/index.mjs';
// Conservative policy: IPv6 is rejected rather than incompletely classifying mapped addresses.
export function publicIPv4(address) {
  if(isIP(address)!==4||address==='168.63.129.16')return false;
  const [a,b]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&[0,168].includes(b)||a===100&&b>=64&&b<=127||a===198&&[18,19,51].includes(b)||a===203&&b===0);
}
export class HttpSource {
  constructor({allowedHosts=[],timeoutMs=30000,totalMs=3600000,resolve=lookup,fixtureLoopback=false}={}) {
    this.allowedHosts=new Set(allowedHosts);this.timeoutMs=timeoutMs;this.totalMs=totalMs;this.resolve=resolve;this.fixtureLoopback=fixtureLoopback;
  }
  async address(url) {
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash)throw new TransferError('NEEDS_BROWSER');
    if(!this.fixtureLoopback&&(url.protocol!=='https:'||url.port&&url.port!=='443'))throw new TransferError('SOURCE_POLICY');
    if(!this.allowedHosts.has(url.hostname))throw new TransferError('SOURCE_HOST_DENIED');
    const records=isIP(url.hostname)?[{address:url.hostname,family:isIP(url.hostname)}]:await this.resolve(url.hostname,{all:true});
    if(!records.length||records.some(r=>!publicIPv4(r.address)&&!(this.fixtureLoopback&&r.address==='127.0.0.1')))
      throw new TransferError('SSRF_BLOCKED');
    return records[0];
  }
  async open(raw,{validator,maxBytes}) {
    let url=new URL(raw),response;
    for(let hop=0;hop<=5;hop++) {
      const address=await this.address(url);
      response=await new Promise((resolve,reject)=>{
        const req=(url.protocol==='https:'?https:http).get(url,{
          agent:false,lookup:(_host,_opts,callback)=>callback(null,address.address,address.family),
          headers:{'accept-encoding':'identity','user-agent':'PortableTransfer/0.1',...(validator?{'if-match':validator}:{})}},resolve);
        req.setTimeout(this.timeoutMs,()=>req.destroy(new TransferError('SOURCE_TIMEOUT',true)));
        req.on('error',e=>reject(e.code==='SOURCE_TIMEOUT'?e:new TransferError('SOURCE_NETWORK',true)));
      });
      if(![301,302,303,307,308].includes(response.statusCode))break;
      const next=response.headers.location;response.destroy();
      if(!next||hop===5)throw new TransferError('REDIRECT_LIMIT');url=new URL(next,url);
    }
    const status=response.statusCode;
    if(status!==200){response.destroy();throw new TransferError('SOURCE_'+status,[429,500,502,503,504].includes(status));}
    if(response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'){response.destroy();throw new TransferError('ENCODING_UNSUPPORTED');}
    const etag=response.headers.etag;
    if(validator&&etag!==validator){response.destroy();throw new TransferError('SOURCE_CHANGED');}
    const rawLength=response.headers['content-length'];const length=rawLength===undefined?null:Number(rawLength);
    if(length!==null&&(!Number.isSafeInteger(length)||length<0||length>maxBytes)){response.destroy();throw new TransferError('BYTE_BUDGET_EXCEEDED');}
    const timer=setTimeout(()=>response.destroy(new TransferError('SOURCE_TIMEOUT',true)),this.totalMs);timer.unref();
    const body=(async function*(){try{for await(const chunk of response)yield new Uint8Array(chunk.buffer,chunk.byteOffset,chunk.byteLength);}
      catch(e){throw e instanceof TransferError?e:new TransferError('SOURCE_STREAM_RESET',true);}
      finally{clearTimeout(timer);response.destroy();}})();
    return {body,length,validator:etag&&!etag.startsWith('W/')?etag:undefined,close(){clearTimeout(timer);response.destroy();}};
  }
}
