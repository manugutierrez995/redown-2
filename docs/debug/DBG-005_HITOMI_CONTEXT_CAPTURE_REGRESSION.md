# DBG-005 — Hitomi right-click routes to HTML / appears inert

Status: user-confirmed working Hitomi right-click version (2026-10-12); automated Chrome/R2 regression test still pending.
Date: 2026-10-12.

## Reported observations
- Right-click Hitomi Download → Redown destination sometimes does nothing.
- Other attempts saved a Hitomi HTML document (starting `<!DOCTYPE html>`) in R2 rather than a gallery ZIP.
- Ordinary Upload from Computer and R2 Explorer were being modified around the same period.

## Source-backed causal chain
1. Menu entries are created with IDs such as `quick:`, `simple-option:`, `nested:` and `tree:` by `buildMenus` in `extension/background.js`.
2. `chrome.contextMenus.onClicked` previously only invoked `initiateHitomiCapture` after checking the page URL against a narrow set of directory prefixes AND requiring the clicked link URL to match a handful of patterns. A perfectly valid gallery page/link combination can miss that branch.
3. Such a miss falls through to `selectedUrl(info)`, which prefers `info.linkUrl`, and thence the ordinary R2 URL-ingest path. That yields HTML if the source is a Hitomi page, matching the reported incorrect output.
4. The condition was present in the initial Hitomi addition (`47cb87b`) and was repeatedly adjusted (`be0a69a`, `8fe70ae`, `5a01dca`) without a live Chrome/R2 regression test. It cannot be conclusively established which commit first broke the previously observed *successful* behavior, because that observation was not preserved as a passing test.
5. Independent second gate: the MAIN-world `URL.createObjectURL` hook filtered out Blobs with empty MIME values, even though valid ZIP bytes can have empty MIME metadata.
6. Independent third gate: the queue's `capturing` state and the in-memory intent's 180-second block can reject rapid reattempts. There is no installed Chrome runtime trace here to prove this is the user's current blocker.

## Corrections
- `becdb6c3ba8c50faea0910029205e46a7cbcb590`: gallery-page, non-media right-click destination triggers capture independently of link href; HTML fall-through guarded.
- `d81ad077413e0c8b1fa7d6af71bc915a80f6e889`: permit nonempty ZIP blobs with omitted content type into capture hook.
- Persistent queue previously added at `efb8270`; queue metadata is not durable ZIP bytes.
- No changes to Explorer or local-file upload logic.

## Verification required before closure
- Right-click the actual Hitomi Download control on a known gallery and capture a sanitized contextMenu event: pageUrl, linkUrl kind (no full private URL), srcUrl-present flag, menuId prefix, tabId-presence. Never record OAuth tokens.
- Observe `initiateHitomiCapture` call, injected script execution and Blob creation event.
- Validate generated payload begins with ZIP signature, and ends in verified R2 object with correct size and transfer-history status.
- Test missed capture, second click, service-worker suspension, tab removal, and one-hour queue retention.
- End-to-end confirmation is currently unavailable. Source review and JS syntax do not prove successful remote upload.

## 2026-10-12 — Confirmed `/imageset/` false negative

User provided an exact failed gallery URL of the form `https://hitomi.la/imageset/...-3725749.html#` and the error `Hitomi HTML pages cannot be uploaded as gallery ZIPs`. This proves the context-menu click reached the safety guard but did not reach `initiateHitomiCapture`. The prior `isGalleryDocument` allowlist omitted `imageset`, despite this being a valid gallery prefix. Commit `d615923d37215b3838830d6ae03ef01db4378d49` adds `imageset` to the eligible capture routing. The `#` fragment is irrelevant to pathname matching. User-reported successful transfer around 4 AM is observational evidence, not a reproducible repository acceptance test. Verify end-to-end ZIP upload in installed Chrome before closing the incident.

## 2026-10-12 — Working Hitomi checkpoint (user-confirmed)

**User reports the current installed version works for the Hitomi right-click flow.** Preserve this as a known-good *user-tested* baseline before future changes. The current source baseline includes the `/imageset/` routing correction (`d615923d37215b3838830d6ae03ef01db4378d49`) and the later bucket-selection separation (`2fdf6edb838da9b496da36f940a5e668e1adafa0`). Reference baseline: `2fdf6edb838da9b496da36f940a5e668e1adafa0`, subject to confirmation that the installed unpacked extension corresponds to that checkout. This is the user's confirmation, not an automated live Chrome/R2 acceptance test. Do not regress right-click menu dispatch, `/imageset/` classification, ZIP Blob capture, target R2 bucket routing, or queue recording. When investigating later issues, compare against this checkpoint first.
