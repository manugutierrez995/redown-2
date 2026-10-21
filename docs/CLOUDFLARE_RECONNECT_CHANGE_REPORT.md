# Automatic location refresh after Cloudflare reconnect

Source-confirmed cause: the OAuth success handler called refreshCloudflare, which refreshed only the main accounts/bucket area and Explorer. Simple selectors retained failed lookups from their initial render, while Nested needed its separate Refresh locations action. The storage change listener did not react to Cloudflare credentials.

Changes:
- Successful account refresh now refreshes existing Simple bucket/folder controls and Nested locations before Explorer inventory.
- Credential changes from another extension context trigger the same refresh. Concurrent requests share one in-flight refresh.
- Simple controls retain creation drafts, selected paths and DOM outside their selectors. Generation checks reject stale bucket-list responses.
- Nested refresh preserves drafts/collapse state and queues behind active edits. Failed readiness checks are retried against current Cloudflare listings.
- Current account selection is preserved when still available. Existing location caches are invalidated.
- No new provisioning, folder creation or transfer operation was added. Existing Nested validation saves remain in place.

Verification (2026-10-20):
- Three new regression tests pass: failed Simple lookup recovery with draft/path preservation; failed Nested lookup recovery with draft/path preservation and no create/provision dispatch; coalesced account/bucket/editor/Explorer refresh and cache invalidation.
- Full suite: 119 tests, 92 pass, same 27 pre-existing failing names as the previous main baseline. Frozen historical evidence assertions were not updated.
- npm run check and git diff --check pass.
- Live Chrome OAuth and Cloudflare listing behavior remain unverified in this environment.
