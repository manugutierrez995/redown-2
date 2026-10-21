# Options visual design

## Design and scope

A slate/navy page canvas is distinct from raised section panels, inset forms, and controls. Lavender marks primary actions, focus and selection. The options page has navigation anchors and separate zones for connection, buckets, right-click destinations, upload, Explorer and downloads. Debug Mode remains the final section, with experimental index, GitHub settings and Worker controls hidden in the default view.

Changes edit the existing page styles and markup; no framework, theme dependency or separate override stylesheet was introduced. Upload and Explorer retain their original IDs and handlers under the existing connection-controlled local-tools wrapper. Simple profile and extra-destination grids now give the path editor adequate width, with compact reorder controls and stacked mobile layouts. Narrow Explorer views prioritize file name and size rather than clipping metadata columns. Keyboard focus and reduced-motion preferences are supported.

## Typography

DM Sans is bundled locally, under the SIL Open Font License. The single variable WOFF subset is approximately 94 KB; its source, Unicode coverage and license are recorded in extension/fonts/. No runtime Google Fonts request or new package dependency is needed. The displayed version badge now matches manifest version 0.5.13.

## Verification

- Headless Chromium rendered actual options HTML/CSS/JS with local synthetic profiles and mocked Chrome/Cloudflare interfaces. Requests outside the local fixture host were blocked. This is visual/layout evidence, not live OAuth or remote storage verification.
- Inspected full-page desktop and mobile Simple/Nested screenshots. Measured 1366, 900, 768, 390 and 320 pixel viewports: document width equals viewport width; visible controls and panels remain within viewport bounds. Nested mobile was additionally inspected at 390 pixels. Local font loaded; final fixture run produced zero page errors.
- Existing Debug Mode and reconnect regression tests pass.
- Full suite: 119 tests, 92 pass, same 27 existing failing names as the preceding main. Historical evidence hashes were not refreshed.
- npm run check and git diff --check pass.
- Actual user Chrome state, Cloudflare OAuth, transfers and deployed Worker behavior were not exercised.
