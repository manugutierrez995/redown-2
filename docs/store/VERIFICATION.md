# Synced store candidate verification

Date: 20 October 2026. Branch: `chrome-web-store`. Version: **0.5.14**.

## Scope

Merged main through `60504d65ab366659a71e95ba4f757faac52416fc`, preserving store-only PNG icons, notification icon path, release version, packaging and documentation. The merged options.js matches main exactly. Options HTML differs from main only in the displayed version badge. The store manifest and icon assets retain their intended release changes.

## Executed results

| Check | Result |
| --- | --- |
| `npm run check` | Passed |
| Focused lightbox, reorder, reconnect, session, private-file and debug-display tests | **29 passed, 0 failed** |
| Full `npm test` | **141 tests: 114 passed, 27 failed** |
| Failing-name comparison with prior 132-test/27-failure baseline | Same failing names; no new failing names |
| `git diff --check` | Passed |
| Package rebuilt twice | Identical SHA-256 |
| ZIP integrity, allowlisted assets, icon dimensions, root manifest | Passed; 23 files |
| Browser UI fixtures | Passed as described below |

**ZIP:** `dist/redown-chrome-0.5.14.zip`

**SHA-256:** `d78780f95e33408c26cf1ea7696381ea7400f296e2618b811795e32a955768b0`

`dist/chrome-package.json` contains per-file hashes and packaging-only status. Build outputs are generated locally, not committed. Existing unexplained/stale-fixture and frozen-hash failures remain visible; unchanged failing names do not make the suite green or prove all 27 failures harmless.

## Browser verification boundary

Actual options files, including a run served from the extracted ZIP, were exercised in Chromium with mocked Chrome storage and Cloudflare responses. Checks covered repeated Expand/Collapse, Expand → Lightbox → Escape, intact arrow labels, delayed image retention and corner progress, real right-click Zoom in, next-image swap, keyboard navigation and return to pane. Footer checks at 1366, 1024, 390 and 320 widths found zero gap between pagination and the file-column bottom, no file-column horizontal overflow, a single desktop pagination row, and bounded folder buttons. Page error lists were empty.

These are browser UI tests of packaged files, **not** an installed Chrome extension acceptance test or live account verification. They do not establish service-worker lifecycle, private R2 access, every media codec, or store-ID OAuth compatibility.

## Readiness decision

**The requested fixes are transferred and the package builds correctly. The branch is not yet cleared for public store submission.** Remaining gates:

- Live clean-profile login, expiry/renewal, restart and next-day access tests with the real store extension ID.
- Published accurate privacy policy and support contact/URL; completed dashboard disclosures and permissions audit.
- Publisher registration/verification, real reviewer test resources/access and listing/promotional images.
- Third-party full-license inventory, contribution/redistribution rights, security/remote-code audit and supported transfer workflow acceptance.
- Failure-by-failure triage of the 27 existing full-suite failures and resolution of release-critical defects.

See [store status](README.md) and the [complete pre-submission checklist](../PRE_SUBMISSION_CHECKLIST.md). No store account action, publication, cloud deployment or private remote-data access occurred during this verification.
