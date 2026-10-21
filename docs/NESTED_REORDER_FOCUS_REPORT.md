# Nested menu reorder follow-up

The reorder save path disabled the focused grip, then tried to focus it before enabling it. Chrome moved focus to the page body, so subsequent arrow keys stopped moving the branch. Keep the grip focusable while the existing shared busy guard prevents concurrent saves.

Nested branch dragging now temporarily hides descendant rows and path captions instead of cropping each branch to 100px. This keeps the complete dragged row and insertion targets visible on narrow layouts; the saved hierarchy and expanded state are preserved.

Validation: seven menu-reorder tests pass; focused nested branch keyboard regression passes; npm run check and git diff --check pass. Actual options-page Chromium fixtures at widths 1366 and 390 verified two successive arrow moves, retained grip focus, lifted drag ghost and a pointer drop returning the branch before its siblings, with no page errors. Fixtures mock Chrome storage and Cloudflare responses, not a live connected extension.

The broader menu-reorder/nested-locations run passed 17 of 20 tests; three existing menu-mode extraction fixtures fail (two syntax errors and one stale menu expectation). These assertions were not changed.
