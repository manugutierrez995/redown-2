/* Redown explicit Hitomi gallery download capture. Loaded in isolated world. */
(() => {
  if (globalThis.__redownHitomiCaptureInstalled) return;
  globalThis.__redownHitomiCaptureInstalled = true;
  let busy = false;
  window.addEventListener("message", async event => {
    if (event.source !== window || event.data?.kind !== "redown-hitomi-blob-ready" || busy) return;
    const url = event.data.url;
    if (typeof url !== "string" || !url.startsWith("blob:")) return;
    busy = true;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not read generated ZIP");
      const blob = await response.blob();
      const fileName = String(event.data.filename || document.title || "hitomi-gallery").replace(/[\\/:*?"<>|]/g, "_").slice(0,120) + ".zip";
      const start = await chrome.runtime.sendMessage({type:"hitomiCaptureStart",filename:fileName,size:blob.size});
      if (!start?.ok) throw new Error(start?.error || "R2 capture unavailable");
      const chunkSize = 256 * 1024;
      for (let offset = 0; offset < blob.size; offset += chunkSize) {
        const bytes = new Uint8Array(await blob.slice(offset,offset+chunkSize).arrayBuffer());
        let binary = "";
        for (let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
        const result = await chrome.runtime.sendMessage({type:"hitomiCaptureChunk",id:start.id,data:btoa(binary)});
        if (!result?.ok) throw new Error(result?.error || "ZIP transfer interrupted");
      }
      const done = await chrome.runtime.sendMessage({type:"hitomiCaptureFinish",id:start.id});
      if (!done?.ok) throw new Error(done?.error || "R2 upload failed");
    } catch (error) {
      await chrome.runtime.sendMessage({type:"hitomiCaptureError",error:error.message}).catch(()=>{});
    } finally { busy = false; }
  });
})();
