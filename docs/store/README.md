# Chrome Web Store candidate branch

Branch: `chrome-web-store`. Candidate version: **0.5.14**.

This branch is prepared for packaging and release work. **Do not describe it as approved or fully submission-ready yet.** The [complete pre-submission checklist](../PRE_SUBMISSION_CHECKLIST.md) remains the acceptance authority.

## Prepared here

- PNG manifest/action icons at 16, 32, 48 and 128 pixels, rasterized from REDOWN's existing SVG; notification icon also uses PNG.
- Manifest and visible settings version updated together.
- Manifest/README descriptions distinguish direct cloud transfer from browser-assisted/local paths.
- Standard-library Python packaging script with an explicit runtime allowlist, referenced HTML asset checks, PNG dimensions, ZIP integrity, per-file hashes and archive digest.
- The noncommercial project license and existing font/model-viewer notices remain included. Extra untracked fonts and development files cannot enter via the package allowlist.
- Listing draft and reviewer walkthrough below.

## Build locally

```sh
npm run check
python scripts/package_chrome_store.py
```

Output: `dist/redown-chrome-0.5.14.zip` and `dist/chrome-package.json`. Python 3 is required. On Windows, `py scripts/package_chrome_store.py` may be used. Extract the ZIP and load that extracted directory in a separate Chrome profile for candidate testing. Rebuilding without source changes produces the same ZIP digest.

The script validates packaging, not remote-code compliance, security, privacy accuracy, OAuth, actual transfers or store acceptance. Update the explicit file list whenever a runtime dependency changes.

## Outstanding launch and submission gates

- Publish an accurate privacy policy and provide support contact/URL. No publisher contact or hosted policy has been invented on this branch.
- Complete the actual data-flow/security audit and dashboard privacy answers. Include tokens, URLs, filenames, contents, history and optional index observations.
- Finish minimum-permission justification; no permission was removed speculatively because authentication and site-capture regressions are material risks.
- Establish the actual store item ID and verify its Cloudflare redirect against the registered OAuth client. The existing manifest key is retained pending that verification.
- Demonstrate real refresh-token issuance/renewal or honest reconnect behavior after expiry, restart and next-day use. This client rejects `offline_access`; it must not be added again without verified client support.
- Run the clean-profile workflow matrix, particularly Simple/Nested menu reorder, deep nested destinations, Explorer, private preview/download and supported transfer paths.
- Classify the known full-suite failures; focused passing tests are not a green full suite.
- Complete third-party license inventory, including full notices for the bundled model-viewer dependency tree. Existing embedded notices are preserved, not represented as complete clearance.
- Confirm rights to publish contributions and license/store distribution compatibility. Internal business use currently requires separate commercial permission.
- Produce sanitized actual-product screenshots and the required small promotional image; verify current store image specifications.
- Complete publisher registration/verification, dashboard fields and reviewer access/setup instructions.

## Listing draft

**Name:** REDOWN

**Summary:** Save remote files to Cloudflare R2 or GitHub, organize destinations, and browse your cloud files.

**Purpose:** Save remote files to user-selected cloud destinations and manage those destinations from Chrome.

**Description draft:** REDOWN adds right-click destinations for saving remote files to your cloud storage. Configure simple destinations or nested folder menus, browse your R2 files, and upload files from your computer. Supported direct transfers run through a Cloudflare Worker. Some supported sites or transfer modes use browser-assisted processing instead. A Cloudflare account with suitable R2/Worker access is required for R2 features, and cloud-provider charges may apply. GitHub destinations are currently an advanced/debug feature; verify their supported release scope before using this draft in the store.

Do not submit this draft unchanged until live tests confirm each advertised feature. Do not claim universal website support, guaranteed deduplication, durable restart-safe queues or that all transfers bypass the computer.

## Reviewer walkthrough draft

1. Install the candidate into a clean Chrome profile. Open REDOWN settings.
2. Connect Cloudflare using an account with the required R2 and Worker capabilities; follow the authorization prompt.
3. Choose a disposable test bucket or explicitly create/provision a test destination. Resource creation and possible provider charges must be explained beforehand.
4. Configure a Simple destination and an additional option; reorder with mouse and repeated arrow keys.
5. Switch to Nested mode, choose existing locations, add sibling folders and deeper branches, and verify reorder preserves children and target paths. Use Refresh locations as a recovery check.
6. Use an authorized benign direct-file URL supplied with the final submission. Save it using REDOWN's right-click destination. Verify the object bytes and destination independently in R2.
7. Open Explorer, browse the bucket, refresh, preview/download the test file, then close/reopen settings and repeat after session expiry.
8. Describe the expected result, cleanup procedure, known limits and support route in the dashboard's testing instructions. Supply any restricted review access through the supported private mechanism, never in committed source.

A real benign test URL, public privacy/support links, publisher details and any reviewer access prerequisites are still required. This document intentionally contains no personal credentials.
