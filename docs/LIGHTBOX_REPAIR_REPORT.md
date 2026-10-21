# Explorer lightbox repair

## Confirmed defects

- `setWorkspacePreviewLightbox` requested `$("#workspace-preview")`, although `$` wraps `getElementById`. The result was null, so the function returned without opening anything. The expanded-preview button had the same ID/selector mistake.
- The overlay is appended to `document.body`, outside the Explorer element that owns keyboard handling. Escape and arrow navigation from the overlay did not reach that handler.
- The overlay cloned the media once. Later preview selections updated the sidebar and revoked its previous blob URL while leaving the overlay stale. Cloning also discarded control event listeners, including the model reset handler.

## Changes

Use correct ID lookups; give the dialog its own Previous/Next buttons and keyboard handler; constrain keyboard Tab navigation to the panel's controls. Move the actual media into the stage with a return placeholder, restoring it and focus when closed. New preview requests clear the old stage, update the title and move in the successful new media; failures replace stale content with an error. Existing request-generation guards continue to reject late results. Selecting a folder closes the lightbox and cancels pending file preview work.

## Verification

- `npm run check`: passed.
- `node --test tests/lightbox.test.mjs tests/cloudflare-files.test.mjs`: **10 passed, 0 failed**.
- `git diff --check`: passed.
- Chromium running actual options files with mocked Chrome/API data: actual Lightbox button opens the stage, ArrowRight invokes navigation, a second image replaces the first, Escape closes, and the image returns to the sidebar. Panel bounds checked at widths 1366 and 390; no page errors. Narrow-screen screenshot visually inspected.

These checks establish the repaired UI behavior, not live OAuth/R2 availability, PDF plugin behavior, every media codec or glTF decoder compatibility. Full suite not rerun for this focused change. Repeat live private image/video/text/PDF and supported model tests on the exact store candidate before release. The separate `chrome-web-store` branch needs this main fix incorporated before rebuilding its candidate.
