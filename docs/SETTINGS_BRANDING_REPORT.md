# Settings favicon and scrolling mascot

Uses the owner's root `favicon.png` to produce bundled 16/32/48/128 PNG extension icons. The manifest declares toolbar/action icons explicitly; settings and popup HTML link the 32px favicon. Notification icon uses the bundled 128px asset. Original root artwork remains untouched.

The owner's `transparent.png` supplies an optimized settings mascot. It is fixed bottom-left, 96px wide (64px on narrow screens), decorative and pointer-transparent. Initially visible, it starts a 750ms fade after 1.8 seconds without scrolling, returns on document or nested-pane scrolling, hides on page exit/backgrounding, and is hidden while Lightbox is open. Reduced-motion preferences remove transitions. No new permissions or remote image requests are needed.

Verification: ten focused mascot/default-display tests passed, including deterministic idle/scroll/visibility timing and PNG dimensions/favicon/manifest declarations; npm run check and git diff --check passed. Source artwork thumbnails inspected. No rendered Chrome toolbar or installed-extension visual acceptance run was performed in this environment. Reload REDOWN in chrome://extensions and reopen settings to refresh manifest/icon state.
