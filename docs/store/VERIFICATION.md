# Candidate preparation verification

Date: 20 October 2026. Branch: `chrome-web-store`. Version: 0.5.14.

- `npm run check`: passed.
- Focused menu-reorder, Cloudflare reconnect/session/files and default/debug-display run: **22 passed, 0 failed**.
- `git diff --check`: passed.
- Package built twice with identical SHA-256: `55a802a218e4c4e5d52f5815fbbc4cd1b9e6a9a71c1ef6c7bce083596618d5c8`.
- ZIP: 23 explicitly selected runtime/license/font/icon files, root manifest, valid ZIP integrity and matching referenced HTML resources. Per-file hashes are generated in `dist/chrome-package.json`.
- Icon 128 PNG visually inspected after Chromium rasterization of the existing SVG. Script validates PNG signatures and declared dimensions for all four sizes.
- Visible settings version matches manifest 0.5.14.

This run did not rerun the entire suite, install through the Chrome Web Store, establish publisher identity, publish a privacy policy, or exercise real Cloudflare accounts/transfers. Previous known suite failures remain documented in the pre-submission checklist and earlier change reports. All outstanding release gates are in README.md in this directory.

References checked for this preparation:

- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/extensions/reference/manifest/icons
