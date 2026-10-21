# Session recovery, manual refresh and pointer dragging

## Source findings and corrections

The previous drag implementation only accepted a pointer inside a sibling's rectangle and required passing its full midpoint. Large expanded destination cards could extend beyond the viewport; gaps were not valid drop targets. Pointer listeners also lived on the small grip. The corrected implementation listens on the document for the active pointer, lifts a compact drag label, temporarily compacts sibling cards, accepts nearest insertion positions including gaps, scrolls continuously near viewport edges, and supports Escape/cancel cleanup. The original DOM, drafts, sibling-only ordering and failed-save rollback remain. No R2 path movement is introduced.

The connection banner previously called a stored access token connected before verifying it. API recovery only retried HTTP 401, missing explicit authentication errors returned with HTTP 403. Login did not request offline_access. These are source-confirmed mechanisms; they are not proof of the precise live grant or provider response behind the user's report.

- Authorization now requests offline_access, preserving existing resource scopes. Existing grants may need one Reconnect to obtain renewal credentials. Client-side code cannot synthesize a missing refresh token or change the OAuth client's permitted grant types.
- The common API helper renews and retries once on 401 or explicit 403 token/authentication errors. Ordinary permission-denied 403 responses are not refreshed. Settings and service-worker refreshes share the existing token lock; login storage and explicit disconnect now use that same lock to avoid credential races.
- invalid_grant or expired credentials without a refresh token retain configuration and expose Reconnect without requiring a disconnect. Transient renewal failures retain credentials and remain retryable. No secrets are logged.
- The connection banner is green only after a successful account access check. Failed checks appear in the hero, Cloudflare panel and menu status; recovery can open sign-in directly.
- A shared Refresh locations button is always present in the right-click preset header for both Simple and Nested, in addition to the existing per-account Nested refresh. It checks access, refreshes both editors and releases its busy state on completion/error. Existing Explorer reads use the corrected common API recovery path.

Public provider metadata was read from https://dash.cloudflare.com/.well-known/openid-configuration and advertised offline_access and refresh_token. Endpoint reference: https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/. No live account/grant configuration was inspected or changed.

## Verification

- 13 focused tests pass, including explicit-403 recovery, permission-denial non-retry, shared-context renewal, invalid-grant handling, transient recovery, locked login storage, manual refresh/error banner behavior, pointer events outside the grip, gap drops and Escape cleanup.
- Real headless Chromium dragged the first of two actual tall settings profile cards after the second and verified the saved profiles order. Existing synthetic three-row mouse dragging also passes. These are local mocked extension fixtures, not the user's installed Chrome session.
- Browser settings checks at 1366, 900, 768, 390 and 320px, plus Nested mobile, show no overflowing controls or page errors.
- Full suite: 132 tests, 105 pass, same 27 pre-existing failing names. npm run check and git diff --check pass. Frozen historical evidence was not rewritten.
- Live Cloudflare authorization, long-duration renewal and real transfers remain unverified. User revocation, missing client refresh-grant permission and network outages can still require renewed authorization or retry; no perpetual-login guarantee is claimed.
