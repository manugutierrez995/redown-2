# Visual menu ordering

Replaced numeric Order fields and separate Move up/down buttons with reusable drag handles. Simple profile sections and additional destinations, Nested account sections, bucket roots and sibling folder branches can be reordered. Handles support pointer dragging (including touch pointer events) and Up/Down keys. Dragging gives an insertion marker; saving happens on drop, with cancellation and failed-save rollback. Existing input drafts and DOM nodes remain intact.

Ordering persists through the existing profiles/menuOrder, simpleOptions array and nestedMenu sibling arrays. Existing background storage listeners rebuild native menus. Legacy menuOrder values are honored on initial render; the pre-existing sort-after-filter display mismatch was corrected. Simple/Nested profile order stays synchronized in the DOM. Folder reordering is restricted to the same parent and carries the whole subtree; no R2 paths, files or folders are moved. No background message contract changed.

Verification:
- Four shared/native-order tests pass: keyboard persistence/draft/path preservation; failed-save rollback; pointer drop and cancel; actual native Simple builder respecting persisted order.
- Nested integration verifies sibling reorder persistence and descendant/path preservation without create/provision messages.
- Real headless Chromium mouse drag with pointer capture moves first sibling after third and records that exact saved array.
- Full settings browser fixture at 1366, 900, 768, 390 and 320 pixels: no overflowing controls or page errors. Nested mobile also inspected at 390 pixels. Browser fixtures use synthetic local state, not a live Chrome account or Cloudflare.
- Full suite: 124 tests, 97 pass, same 27 pre-existing failing names. Frozen evidence hashes were not changed. npm run check (now including menu-reorder.js) and git diff --check pass.
- Live Chrome context-menu display and touch hardware interaction remain unverified; source inspection and native-menu fixture confirm saved ordering is consumed by the existing builder.
