# Browser download handoff to R2 — implementation specification

## Goal
Allow a user to right-click a download-triggering button (including JavaScript-driven anchors with href="#"), select REDOWN → a Cloudflare R2 destination, and have the actual resulting file saved to that destination. This document specifies implementation work; it is not evidence that the feature is complete.

## Architectural principle
Use Chrome's native download pipeline as an *identifier of the real artifact*, not as a byte-stream API. Prefer a server-to-server transfer when a replayable HTTP URL exists. For non-replayable browser-local artifacts (blob:, data:, JSZip/FileSaver-generated ZIPs), use an explicit, bounded, permissioned browser-byte bridge.

## Route A — browser download recognition / URL handoff
1. On REDOWN right-click action, persist a short-lived intent keyed by tabId, frameId if available, chosen R2 profile/bucket/prefix, timestamp, and clicked element hint. Do not treat href="#" or the page URL as an asset.
2. Trigger the intended download only through a user-authorized interaction strategy (e.g. page-side click initiated with the relevant permissions and a narrowly-scoped script). Guard against triggering unintended actions and tab navigation. Never indiscriminately intercept other downloads.
3. Use chrome.downloads.onCreated/onChanged to associate the next applicable download with the pending intent. Verify tab/referrer where available; disambiguate concurrent downloads; expire unmatched intents.
4. If finalUrl/url is an HTTP(S) resource accessible to a Cloudflare Worker, hand it to the existing ingestCloudflareAtPrefix path while retaining original filename. For authenticated or transient URLs, explicitly detect failed replay; never transmit browser cookies, auth headers, or URL secrets to an unexpected host.
5. Only after verified R2 success, offer an opt-in setting to cancel/erase redundant local downloads. For the initial version retain the native download if transfer fails. Note that pausing does not expose partial file bytes and a Worker transfer does not resume browser TCP transfer.
6. Surface Preparing → Identifying → Sending to R2 → Verifying → Completed / Failed states; log failures and source behavior.

## Route B — locally generated files
1. For blob:/data:/FileSaver/JSZip outputs, do not send the opaque blob URL to the remote Worker: the Worker cannot dereference it.
2. Use a separately permissioned content/page bridge to capture bytes originating from the user-initiated download; restrict to the specific tab and active short-lived intent. Do not monkeypatch every tab by default.
3. Prefer stream/chunk-based bounded memory rather than whole-file base64 runtime messages. Evaluate extension offscreen documents, transferable streams, bounded chunks, and Worker upload endpoints against MV3 restrictions; design for service-worker suspension/restart. Be transparent when the browser API cannot intercept a generated download and provide a clearly labeled user-triggered fallback.
4. Reuse R2 prepared-profile and authenticated upload facilities; support multipart upload if required for large generated ZIPs. Do not expose tokens to webpage JS or untrusted domains.
5. Verify final object size/key and report real completion before claiming success.

## Current repository touchpoints
- extension/manifest.json: MV3 downloads/contextMenus permissions present; scripting, offscreen and per-site permissions not yet declared.
- extension/background.js: selectedUrl, contextMenus.onClicked, ingestCloudflareAtPrefix, recordTransfer; existing Worker remote ingest.
- extension/options.js: local File-to-R2 upload behavior can inform byte-upload path.
- tests/: create isolated download-matching, URL handoff, blob bridge, concurrent-tab, cancellation, failure and security tests.

## Non-negotiable tests
- Plain direct .zip link; JS button which redirects to .zip; href="#" that creates a Blob ZIP; concurrent unrelated browser download; same tab multiple actions; expiring intent; Worker URL requiring browser session; 401/403; cross-site redirect; >100 MB ZIP/memory pressure; MV3 worker suspend/restart; cancel/retry; filename; destination prefix; confirm R2 object exists before deleting local file.
- No arbitrary click automation on unrelated web elements; no blind page-wide injection; no forced browser download cancellations; no silent leakage of credentials; no success notification before object commit.

## Acceptance
Right-click a supported download button → select existing REDOWN R2 destination → save exactly the generated ZIP to R2 with its original filename; ordinary HTTP files use remote ingest; browser-generated files use explicit bounded local-byte upload; failures preserve original download and clearly explain limits. Test behavior on a local JSZip fixture, then test permitted real-world sites manually.

## Agent handoff
Implement this vertically in the repository rather than only scaffolding. Keep existing Simple/Nested right-click destinations and authentication flows working. Add architecture/API/debug documentation and runnable tests. Commit changes where permitted; if blocked, save complete diff/patch and handoff documenting uncommitted work.
