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
