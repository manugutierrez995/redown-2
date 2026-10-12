# DBG-004 — Upload from Computer: mixed successes and Failed to fetch

Recorded 2026-10-12. Status: investigating; source instrumentation committed, live Chrome/R2 verification pending.

## Reported observations
User reported a 16-file local ZIP batch with 3 successful uploads and 13 failures. Among 13 failed files: 4 pre-existing exact keys, 3 absent exact keys, 6 existence checks unknown because lookup failed. Failures displayed "Failed to fetch". All files reported below 100 MB. This report does not include private filenames, object keys, tokens or bucket identifiers.

## Source-confirmed trace
Upload from Computer in extension/options.js -> RedownCloudflareApi.request -> fetch PUT api.cloudflare.com/client/v4/accounts/.../r2/buckets/.../objects/... . This is distinct from the extension-deployed STORAGE Worker. Exact-key inspection uses cfObjects -> listObjectsPage in background.js -> Cloudflare management API. A rejected overwrite alone cannot explain errors for keys known absent. JavaScript fetch failures without a Response have no HTTP status and could represent several browser/network causes, including CORS or transport failure. This is NOT proof of a provider outage or memory limit.

## Bounded corrective diagnostic
Commit db3edb1c8f1a59911753d032ae13d2d4cb95cfc7 augments only Upload from Computer: records request failure category and elapsed time, performs a post-failure exact-key listing, records remote size where available, and retains the before-existence result. Identical remote size is marked *completion unconfirmed*, not successful, because an old object may have the same size. A failed lookup is unknown, not absent. No credentials or file bytes are added to records.

## Hypotheses requiring falsification
- H1: browser-to-Cloudflare PUT fails before an HTTP response (CORS/network). Compare DevTools network error with a successful PUT; verify extension host permissions.
- H2: request times out/aborts. Record error.name and elapsed time; reproduce with a slow known-good upload.
- H3: write succeeds but the response is lost. Compare object metadata, update time and independent content integrity; mere size match is insufficient.
- H4: Cloudflare request rejection with HTTP response. Capture sanitized status and errors, not keys or credentials.

## Verification gaps
No installed Chrome session, authenticated R2 access, provider logs or successful end-to-end acceptance was available during this code inspection. New code was read back from GitHub; automated tests and semantic/debug CLI execution were not run here. The existing semantic and debug API readers are offline and inspect-only, so this narrative is a pending case note, not an independently validated canonical incident journal. Do not mark resolved without automated and live-browser outcomes.

## 2026-10-12 follow-up — browser transport evidence and round-robin mitigation

**User-observed browser evidence:** DevTools reported repeated `net::ERR_NETWORK_CHANGED` on direct `PUT` requests to the Cloudflare R2 Object API. Other R2 object listing requests also intermittently failed. This identifies a browser-level network-change abort for the captured requests, not an existing-object conflict or an R2 Worker memory diagnosis. Why the network changed remains unknown. Separately, the model-viewer WebAssembly CSP exception is unrelated to ZIP uploads.

**Mitigation in source:** commits `aa02c4aaea64acac5f27954f84ba5a47689a2dab` and `774d1e31ba1114f1f47d813fa326b135473d2334` implement a page-scoped round-robin local upload queue. Transient failures return to the tail; successful files leave the queue; backoff grows to approximately 60 seconds plus jitter. Non-retryable errors are reported without indefinite retries. PUT overwrites exact existing keys. Upload from Computer is the only transfer workflow modified by these queue commits.

**Limits:** No persisted queue, no browser-restart recovery, no multipart/chunk resume, and no guarantee that connectivity will return. The options page must remain open. Lost HTTP responses may mean remote write status is uncertain; neither object presence nor equal size proves upload completion. Confirm with independent verification before deleting a local original. Automated tests and live installed-Chrome/R2 checks are pending. Historical observations above retain their original scope and should not be retroactively reclassified.

## 2026-10-12 behavior change — confirmed existing files skipped

Commit `ed6d3fab1cc535ff1e618b2ad9892c17c736031b` changes only Upload from Computer: when the exact object key is confirmed present by the existing lookup, the local file is skipped as a non-error and counted separately. Unknown/incomplete lookups do not cause a skip. The retry queue remains for actual upload failures. This reverses the earlier owner preference to overwrite on a match. The existence check is not an atomic conditional write: another client could create the object between lookup and PUT. File contents/sizes are not compared for skip eligibility. Live browser/R2 verification pending.

## 2026-10-12 separate Hitomi context-menu regression investigation

A reported Hitomi download-button right-click action was not reaching the expected Redown capture behavior. Source inspection found the context-menu Hitomi interception previously required the click target to have no link URL, `#`, or an ending `#`. A download anchor with a `javascript:` URL therefore fell through to ordinary source URL ingestion instead of gallery capture. Commit `be0a69a0d3809fc3ef6b5811903a69fd6694cad0` explicitly routes JavaScript/download-gallery links on Hitomi pages to the capture path, and records capture-start exceptions in transfer history as well as console logging. This change is isolated from local upload retry behavior. Whether the user's Hitomi page in fact uses such an anchor remains unverified; Chrome browser acceptance testing is required. Existing 64 MiB capture limit and capture-to-Worker path are unchanged.

## 2026-10-12 — Existing bucket tile triggered unnecessary Worker deployment

Reported: Cloudflare setup bucket tile displays `Failed to fetch`, while the Explorer can still enumerate and browse R2. Source trace: `refreshBuckets` always called `addBucketPreset` on tile click, including a bucket with an existing profile; `addBucketPreset` sends `cfProvision` which deploys/redeploys the Worker, enables workers.dev and health-checks its endpoint. Explorer listing instead uses `cfBuckets` and `cfObjects` without the same deployment path. These are distinct operations; a working Explorer does not establish Worker health. Fix commit `1c52721675f4369eeb854269cc8ca26992500d27` makes clicks on preconfigured bucket tiles a non-deploying acknowledgement and exposes a separate explicit “Verify / repair Worker” control. New buckets still use provisioning. No browser integration verification performed. This fixes the accidental deployment trigger, not any underlying network instability or a broken Worker.

## 2026-10-12 — Bucket selection green then Failed to fetch

Observed report: selecting an R2 bucket briefly signals success, then another component reports `Failed to fetch`, although Explorer previously worked. Source analysis identified `browseWorkspace` handling of `cfObjects`: it retried only access/propagation errors and otherwise surfaced a network failure immediately. Commit `585733b0dd1ede28596873737f60a8be3cbe5d0d` adds bounded exponential backoff for transient network errors in Explorer listings, without triggering `ensurePrepared` Worker redeployment for those errors. The chosen bucket remains selected. This is a resilience improvement, not proof that the underlying local network is stable or that the reported status was exclusively from Explorer. Live browser verification pending.

## 2026-10-12 — Bucket setup discrepancy: saved vs unsaved profiles

Owner report: buckets `extended` and `hitomi` report configured, but selecting other existing R2 buckets returns `Failed to fetch`. Source inspection confirms **no bucket-name allowlist**: the green selection acknowledgement applies to any exact accountId/bucketName pair found in local `profiles`. A bucket visible to Cloudflare and Explorer can lack this Redown profile because `cfProvision` deploys a Worker, enables workers.dev, checks health and writes R2 prefixes *before* saving the profile. If any of those steps loses network connectivity, the R2 bucket remains but no prepared Redown profile is saved. This is not evidence those buckets are missing or denied.

Mitigation `c56b745cf77ed9536909e532bed3a0fa0cbda51a` retries the explicit provisioning request up to four times only for network-like errors, with bounded delays and a descriptive bucket-specific status; it does not mask non-transient failures or mark an unverified Worker ready. Correction `8de4d2639835cdbce60e3ec7315cd433ede14f47` makes the separate “Verify / repair Worker” control actually invoke preparation for an existing saved profile rather than being blocked by the selection safeguard. Existing bucket tile selection remains a no-deploy acknowledgement. Explorer behavior unchanged. **No live network / R2 or installed-extension verification.**

## 2026-10-12 — Hitomi right-click capture hardening

Commit `8fe70ae921e316faf10d0d03ec989adbb2aa625e` hardens gallery-specific context-menu detection for Hitomi links with same-page, generated blob, JavaScript, and fragment targets, rather than assuming `info.linkUrl` is absent or only `#`. It also records errors originating inside the isolated capture script as failed transfers, because Chrome notification failures could otherwise hide the real reason. Ordinary links on non-gallery pages and the entire local upload/Explorer implementations are unchanged. Background script syntax was checked after the commit. **Live browser Hitomi ZIP capture and R2 acceptance have not been verified**; this is a targeted repair and diagnostic improvement, not a confirmed end-to-end success.

## 2026-10-12 — Hitomi durable request queue (distinct from local upload queue)

Source commits `efb82701139328635b13ec1ba5064c161205702e` and `641b9553cf5073ba4110ead117d0230e8f7170f3` add a local-storage-backed `redownHitomiQueueV1` record for initiated Hitomi gallery transfers and extend matching to gallery/reader URL formats. The queue record retains the source URL, destination menu ID, tab ID, status, attempt history and scheduling details; no ZIP bytes or credentials are persisted. A one-minute Chrome alarm attempts to restart overdue/failed captures when the same original gallery tab still exists, while completed jobs remain marked complete. Queue entries are not erased after one hour. On browser restart a job can remain registered, but auto capture needs the original tab, an eligible page, and an available Worker; if the tab or URL is gone, it is marked `needs-tab` and requires user action. This is metadata persistence **not reliable background ZIP-byte persistence**. No successful end-to-end Hitomi/R2 browser test has been run. The 64 MiB initial capture limit still exists.

## 2026-10-12 — Cloudflare OAuth login follow-up GET aborted

A reported `Failed to fetch` during Cloudflare sign-in was investigated in `extension/cloudflare-auth.js`. The callback exchanges a single-use OAuth code for a token and then independently calls the Cloudflare `/accounts` endpoint. Previously any transient fetch failure on that second request caused `finishCloudflareLogin(..., "failed")` and discarded the successfully exchanged token. Commit `1b8d855e9f53fa985efaeecbe1f68343c9e071db` retries transport-only failures on the optional account-listing verification up to three times, then preserves the issued token and concludes OAuth login if that API request remains unreachable; HTTP permission errors still fail verification. A failed token exchange itself is not masked. This does not cure underlying `ERR_NETWORK_CHANGED`, and further API operations may fail until connectivity recovers. Source syntax checked; end-to-end Chrome and live Cloudflare OAuth not verified.

## 2026-10-12 — separately gated remote URL engine evidence

The new [portable remote engine report](../CODEX_PORTABLE_FULLY_REMOTE_TRANSFER_ENGINE_IMPLEMENTATION_REPORT.md)
records actual local HTTP→R2-compatible fixture and Wrangler/Miniflare transfers,
independent digest readback and separate executor-process recovery. Deliberate
crash/transport faults are **simulations**. This route transfers remote URLs on
server infrastructure and does not repair browser `ERR_NETWORK_CHANGED` for
Upload from Computer. Nineteen existing Upload/provider/Explorer local fixtures
passed; installed Chrome and live R2 verification remain pending. No incident
closure, local-byte persistence or local-file deletion is inferred.
