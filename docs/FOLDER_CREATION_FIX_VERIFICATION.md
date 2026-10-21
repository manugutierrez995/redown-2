# Simple folder creation correction

The Simple location editor's overescaped regular expression rejected ordinary name characters, including zero, f and x. Corrected it to reject path separators and control characters while accepting ordinary names such as new02, folder, x-files, spaces and Unicode. Creation at bucket root sends an empty parent prefix; nested creation retains its exact parent.

Added a 60-second UI confirmation deadline. A stalled request now releases Create, retains the typed name and explains that creation is unconfirmed: refresh locations before retrying. This does not cancel the background operation or claim that an uncertain remote write failed. A successful response arriving after the row/location was replaced clears the Creating status without changing the new location. Duplicate clicks on the busy button are ignored.

Verification on 2026-10-21: npm run check passed. Eight Simple location tests passed, including valid root names, invalid segments, a simulated stall and refresh during creation. Full suite: 151 tests, 124 passed, the same 27 existing failures. Prior onboarding, header activation and icon-only Debug access remain in the parent revision. No live Cloudflare/browser reproduction was available, so the screenshot-specific remote cause remains unverified; this change fixes confirmed local validation and progress-state defects.
