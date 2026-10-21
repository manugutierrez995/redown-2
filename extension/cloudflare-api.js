/* Authenticated Cloudflare requests shared by settings and the service worker. */
(() => {
  const API = "https://api.cloudflare.com/client/v4";
  async function boundedFetch(url, options = {}) {
    const {timeoutMs = 30000, ...fetchOptions} = options;
    return fetch(url, {...fetchOptions, signal: AbortSignal.any([
      ...(fetchOptions.signal ? [fetchOptions.signal] : []), AbortSignal.timeout(timeoutMs)
    ])});
  }
  async function auth(rejectedToken) {
    return navigator.locks.request("redown-cloudflare-token", async () => {
      let {cloudflareAuth: current} = await chrome.storage.local.get("cloudflareAuth");
      if (!current?.accessToken) throw new Error("Connect Cloudflare first.");
      if(current.reconnectRequired)throw new Error("Cloudflare authorization needs renewal. Click Reconnect Cloudflare; disconnecting is not required.");
      if (current.accessToken !== rejectedToken && (!current.expiresAt || Date.now() < current.expiresAt - 60000)) return current;
      if (!current.refreshToken){
        await chrome.storage.local.set({cloudflareAuth:{...current,reconnectRequired:true}});
        throw new Error("Cloudflare session expired without a refresh token. Click Reconnect Cloudflare; disconnecting is not required.");
      }
      const response = await boundedFetch("https://dash.cloudflare.com/oauth2/token", {
        method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({grant_type:"refresh_token",client_id:"d9db0f71eb24cd2eed86b50a650a045e",refresh_token:current.refreshToken})
      });
      const body = await response.json().catch(()=>({}));
      if (!response.ok || !body.access_token){
        if(body.error==='invalid_grant'){
          await chrome.storage.local.set({cloudflareAuth:{...current,reconnectRequired:true}});
          throw new Error("Cloudflare authorization needs renewal. Click Reconnect Cloudflare; disconnecting is not required.");
        }
        throw new Error("Cloudflare access could not be renewed right now. Retry; your saved connection has been retained.");
      }
      current = {...current,reconnectRequired:false,accessToken:body.access_token,refreshToken:body.refresh_token || current.refreshToken,
        expiresAt:body.expires_in ? Date.now()+Number(body.expires_in)*1000 : null};
      await chrome.storage.local.set({cloudflareAuth:current});
      return current;
    });
  }
  async function authenticationRejected(response){
    if(response.status===401)return true;
    if(response.status!==403)return false;
    if(/invalid_token/i.test(response.headers.get("www-authenticate")||""))return true;
    const body=await response.clone().json().catch(()=>({}));
    return (body.errors||[]).some(error=>/authentication error|invalid (?:access )?token|(?:access )?token (?:has )?expired/i.test(error.message||""));
  }
  async function request(path, options = {}) {
    let token = await auth();
    const run = current => {
      const headers = new Headers(options.headers || {});
      headers.set("authorization", `Bearer ${current.accessToken}`);
      if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type","application/json");
      return boundedFetch(API+path,{...options,headers});
    };
    let response = await run(token);
    if (await authenticationRejected(response) && token.refreshToken) {
      await response.body?.cancel();
      token = await auth(token.accessToken);
      response = await run(token);
    }
    return response;
  }
  function objectPath({accountId,bucketName},key) {
    if (!accountId || !bucketName || !key) throw new Error("Choose a bucket and file first.");
    return `/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${String(key).split("/").map(encodeURIComponent).join("/")}`;
  }
  async function preview(source,key,type,signal) {
    const response = await request(objectPath(source,key),{signal});
    if (!response.ok) throw new Error(`Cloudflare could not read this file (${response.status}).`);
    const limit = 64*1024*1024;
    if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw new Error("This file is too large for an inline preview. Use Download."); }
    const reader = response.body.getReader();
    const chunks=[]; let size=0;
    try {
      while (true) {
        const {done,value}=await reader.read(); if(done) break;
        size+=value.byteLength;
        if(size>limit) throw new Error("This file is too large for an inline preview. Use Download.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return URL.createObjectURL(new Blob(chunks,{type}));
  }
  async function download(source,key,filename) {
    const current = await auth();
    return chrome.downloads.download({url:API+objectPath(source,key),
      headers:[{name:"Authorization",value:`Bearer ${current.accessToken}`}],
      filename:String(filename || key.split("/").pop()).replace(/[\\/:*?"<>|\x00-\x1f]/g,"_"),saveAs:true});
  }
  globalThis.RedownCloudflareApi={request,preview,download,boundedFetch};
})();
