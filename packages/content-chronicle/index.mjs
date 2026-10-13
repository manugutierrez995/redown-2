// Portable API; the same domain implementation runs in the extension and Node.
import '../../extension/chronicle-domain.js';
export const {FORMAT,MAX_EVENTS,safeUrl,capture,exportSnapshot,importSnapshot,lookup,toJSONL,fromJSONL,toProvenance}=globalThis.RedownChronicleDomain;
