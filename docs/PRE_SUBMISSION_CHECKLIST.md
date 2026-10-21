# REDOWN — Chrome Web Store Pre-submission Checklist

Preparation baseline: 20 October 2026. This is a release gate and working checklist, not a declaration of compliance or store approval.

Branch packaging progress is tracked in [store preparation status](store/README.md). Checklist boxes still require candidate-specific evidence.

**Current decision: prepare the submission; hold public launch until the blocking checks below have evidence.** Recent interface and reorder fixes have focused automated and mocked-browser coverage. Long-lived Cloudflare sessions and a fresh store-installed user's complete workflow remain unverified.

## How to use this page

Leave an item unchecked until its acceptance condition has been demonstrated on the exact release candidate. Record the commit, Chrome version, date, result, and a sanitized evidence link. A source inspection, mocked test, live unpacked-extension test, and store-installed test are different kinds of evidence; identify which one you have.

Use **Blocker** for anything that prevents a working, accurately disclosed submission. Use **Launch gate** for REDOWN's own quality requirements. These labels do not claim Google mandates every product test listed here. A limited beta still requires applicable store policies and privacy disclosures.

| Priority | Current gap | Completion evidence |
| --- | --- | --- |
| Blocker | Manifest declares `icon.svg`; manifest icons do not support SVG | PNG assets declared and verified in the actual packaged extension |
| Blocker | No dedicated published privacy policy identified in the repository audit | Public policy URL, actual data inventory, matching dashboard disclosures |
| Blocker | Final store identity and Cloudflare redirect compatibility unverified | Authorization succeeds from the store candidate using its real extension ID |
| Launch gate | Session expiry/recovery remains a reported problem | Live expiry, refresh, restart and reconnect tests below pass |
| Launch gate | Core flows need a clean-profile acceptance run | Signed-off workflow matrix on the candidate package |
| Blocker | Listing, permissions explanations and reviewer instructions unfinished | Completed dashboard fields and a reviewer-reproducible setup |
| Launch gate | Full test suite has known failures | Current results and individual failure classification; no unexplained critical failure |

## 1. Define the release and its promises

- [ ] Choose the release commit, manifest version, intended audience and initial visibility. Record them in the release record at the end of this page.
- [ ] Write one clear purpose statement. Suggested starting point: “Save remote files to your own cloud storage and organize their destinations from Chrome.” Confirm that every shipped feature fits the final statement.
- [ ] Decide whether GitHub destinations are supported in this release. Being hidden behind Debug Mode does not remove shipped code, permissions, or disclosure obligations. Either support and test them, or deliberately exclude them from the release package through a reviewed change.
- [ ] Identify supported transfer paths: direct Worker-to-R2, browser-assisted fallback, local file upload, and GitHub transfers where included. Publish only the paths actually supported.
- [ ] Correct unconditional claims in the README, manifest description and listing that files never pass through the computer. Explain the distinction between direct cloud transfers and browser-assisted/local upload paths.
- [ ] State prerequisites plainly: Cloudflare account, R2 availability, authorization and any Worker/bucket setup. Describe potential Cloudflare charges without promising a universally free service.
- [ ] Keep planned capabilities out of the listing: durable restart-safe queues, guaranteed deduplication, universal website support, and other roadmap items need their own evidence before promotion.

- [ ] Review the [licensing terms](LICENSING.md), confirm rights to license original contributions, complete the third-party notices inventory, and verify store distribution rights. Determine separate terms for business users before marketing workplace use.

## 2. Developer account and submission ownership

Google references: [registration](https://developer.chrome.com/docs/webstore/register), [publishing](https://developer.chrome.com/docs/webstore/publish), [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

- [ ] Register the publishing account and complete the one-time registration payment required by the dashboard. Verify the current amount there.
- [ ] Enable the required two-step verification and complete any identity/contact verification requested for this account.
- [ ] Confirm the publisher name, developer email and support contact. Use a monitored address that can receive review and policy notices.
- [ ] Establish who controls the publishing account, Cloudflare OAuth registration, support domain and recovery methods.
- [ ] Choose the dashboard's appropriate distribution/visibility settings for the first release. Do not assume “unlisted” bypasses review.
- [ ] Upload a draft when needed to establish the actual item identity, without treating upload as authorization to launch publicly.

## 3. Package, manifest and assets

Google references: [manifest icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons), [store images](https://developer.chrome.com/docs/webstore/images), [publishing](https://developer.chrome.com/docs/webstore/publish).

- [ ] Replace the manifest's SVG icon declaration with PNG files. Supply a 128×128 store/package icon and appropriately sized toolbar/extension icons such as 16, 32 and 48 pixels. Verify sharpness on light and dark surfaces.
- [ ] Validate Manifest V3, service-worker entry point, popup, settings page, script order and every referenced asset in the final ZIP.
- [ ] Build the ZIP from the intended contents of `extension/`, with `manifest.json` at the archive root. Do not ZIP the whole development repository.
- [ ] Exclude credentials, personal configuration, test fixtures, temporary downloads, source-control files and unnecessary development material. Preserve required third-party notices and bundled font licensing.
- [ ] Review the currently untracked `extension/fonts/dm-sans-variable.ttf` before packaging; it is not the intended bundled WOFF deliverable. Do not let an accidental extra file enter the release archive.
- [ ] Keep locally bundled fonts and scripts available offline; verify no page depends on a development server or runtime Google Fonts fetch.
- [ ] Review the manifest `key` and real store extension ID deliberately. Do not remove or replace identity-related configuration casually; validate OAuth after the decision.
- [ ] Increment the version for the release and keep displayed version information consistent. Check update compatibility with existing profiles and settings.
- [ ] Record the archive file list and SHA-256 digest so the reviewed package can be identified exactly.
- [ ] Install/test the packaged candidate through a supported test distribution path. An HTML fixture displaying the options page does not establish that the extension installs correctly.

## 4. Permission audit

Google reference: [privacy fields and minimum permissions](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

For each entry below, locate the actual shipped caller, explain its user-visible purpose, determine whether narrower or optional access works, and test any change. These are audit prompts, not completed dashboard justifications.

| Current permission | Evidence to collect |
| --- | --- |
| `contextMenus` | Native REDOWN destination menus and their click handlers |
| `notifications` | Which user-triggered events produce notifications; whether still needed |
| `storage` | Profiles, preferences, credentials, history and experimental index ownership |
| `identity` | Cloudflare redirect/authentication usage |
| `webNavigation` | Exact OAuth callback navigation events and their filtering |
| `alarms` | Actual scheduled background work; remove if obsolete |
| `downloads` | Browser-assisted/local download paths and their necessity |
| `scripting` | User-triggered supported-site capture and the exact injected bundled files |

| Current host access | Evidence to collect |
| --- | --- |
| `api.cloudflare.com` | Authenticated account, R2 and Worker operations |
| `dash.cloudflare.com` | OAuth navigation/authentication need; determine whether host permission is required |
| `*.workers.dev` | Requests to user-configured/provisioned Workers; assess narrower/optional access |
| `api.github.com` | GitHub destination feature if shipped |
| `hitomi.la` | Site-specific capture feature if shipped; audit purpose and user initiation |

- [ ] Finish the caller-to-permission mapping and remove unused access rather than inventing a justification.
- [ ] Explain every remaining permission and host pattern accurately in the dashboard.
- [ ] Confirm the installation permission prompt matches what the listing explains.
- [ ] Check that denied or revoked access produces useful recovery instructions without repeated unwanted prompts.
- [ ] Review site-specific integrations and listing examples against current content policies. Use benign, authorized test files and screenshots; do not infer acceptance or rejection solely from a hostname.

## 5. Privacy, data handling and security review

Google references: [user data requirements](https://developer.chrome.com/docs/webstore/user_data), [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [dashboard disclosures](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

- [ ] Build an actual data inventory: OAuth tokens, GitHub/Worker credentials, account/bucket identifiers, source URLs, object names and paths, local file contents, transfer history, preferences, diagnostics, and optional index observations.
- [ ] For each category record where it originates, where it is stored, recipients, purpose, retention, deletion and whether it leaves the browser. Inspect code and network behavior before writing privacy claims.
- [ ] Publish an accessible privacy policy with contact details and effective date. Cover actual access, storage, use, sharing and deletion, including Cloudflare/GitHub requests and remote-source fetches.
- [ ] Complete dashboard data-use answers consistently with that inventory. Do not equate “no developer analytics server” with “no user data handled.”
- [ ] Explain local versus cloud deletion. Disconnecting an account must not imply that remote buckets, objects or Workers were deleted unless that operation actually occurs.
- [ ] Verify disconnect behavior: local credential removal, revocation attempt and treatment of history/profiles. Document remaining cloud resources and recovery implications.
- [ ] Check tokens and private data do not appear in console output, status text, exported diagnostics, screenshots or error reports. Redact signed URLs and authorization headers.
- [ ] Review credential storage and extension message boundaries. Verify requests are validated and malicious strings in filenames, labels and API errors render as text.
- [ ] Review provisioned Worker authentication and public/private object access using test resources. Confirm private data does not become publicly readable without the intended explicit action.
- [ ] Audit transfers that fetch arbitrary URLs for unintended network access, redirects, credential forwarding and size/resource limits. Record the actual enforcement boundary.
- [ ] Audit scripts, dynamic imports, injected code, WASM, `eval` and generated-code paths for Manifest V3 policy/CSP compatibility. An external file fetch is not automatically executable remote code; inspect how the response is used.
- [ ] Explain the provisioned Worker architecture to reviewers. Worker source embedded in the package and deployed to Cloudflare is distinct from remotely downloaded JavaScript executed inside Chrome; review the actual implementation against policy rather than claiming blanket exemption.
- [ ] Keep experimental index collection and previews opt-in as intended. Verify default behavior and disclose what observations are retained when enabled.

## 6. Cloudflare authorization and session release gate

**This is the highest-priority live reliability check.** A green connection banner and a successful consent popup are insufficient evidence of working R2 access or durable renewal.

- [ ] Verify the actual store ID and `chrome.identity.getRedirectURL("cloudflare")` callback match an allowed redirect in the registered Cloudflare client.
- [ ] Complete first-time login from a clean profile; confirm account, bucket and folder requests succeed afterward.
- [ ] Verify the exact currently allowed resource scopes: `workers-r2.read`, `workers-r2.write`, `workers-scripts.read`, `workers-scripts.write`.
- [ ] Do not reintroduce `offline_access`: this registered client rejected it. Establish the client's actual supported renewal mechanism and grant permissions with Cloudflare evidence.
- [ ] Determine whether a refresh token is actually issued to this client. Record presence/absence and expiry behavior without recording the token itself.
- [ ] Test immediately after connection, beyond the real access-token expiry, after browser restart, after service-worker suspension, and after returning the next day.
- [ ] Exercise Simple locations, Nested locations and Explorer at every lifecycle point; verify each uses the current session.
- [ ] Trigger simultaneous requests during renewal and verify they do not race refresh-token rotation or restore stale credentials.
- [ ] Test expired/revoked credentials, transient network failure, denied consent, closed popup and ordinary permission-denied responses separately.
- [ ] Confirm Reconnect succeeds without requiring Disconnect first and does not discard saved destinations or drafts.
- [ ] Confirm automatic location refresh runs after successful authorization and manual Refresh locations remains available in both modes.
- [ ] Verify Explorer refresh actually makes a fresh usable request and reports failures accurately.
- [ ] Ensure successful recovery clears stale warnings, mode descriptions stay neutral, and genuine location-specific failures remain visible.
- [ ] If transparent renewal is unsupported, document and implement a clear reconnect experience. Never represent an expired session as ready.

## 7. Clean-install functional acceptance matrix

Run with a separate Chrome profile, disposable authorized cloud resources, Debug Mode off, and the exact candidate. Record expected and actual destination keys; visual success alone does not prove correct storage.

| Workflow | Required result |
| --- | --- |
| First launch with no configuration | Clear connection guidance; no broken controls or stale success state |
| Account/bucket selection | Correct destination; selection does not silently provision resources |
| Explicit bucket/Worker setup | Clear progress and failure recovery; correct binding and access |
| Direct remote file transfer | Correct bytes and destination; completion appears only after confirmed success |
| Browser-assisted path if shipped | Works as described; local data path and cleanup behavior accurately explained |
| Local single/batch upload | Correct location, useful progress, retryable failures and honest completion |
| Simple menus | Primary and extra destinations persist and appear in saved order |
| Nested menus | Roots, siblings and deeper descendants appear in correct hierarchy and order |
| Nested creation versus selection | Existing selection does not overwrite independent new-name drafts; create uses exact parent |
| Reorder | Mouse/touch where supported and repeated arrow keys work; branch descendants/path stay intact |
| Reorder failure | Save failure restores the previous model and visible order |
| Explorer | Listing, navigation, refresh, empty states and any shipped pagination/infinite-scroll behavior work |
| Preview/download | Supported media types, private access, size limits and error recovery behave as documented |
| Copy/move/delete if shipped | Correct object targets; failures reported; no unexpected destructive operation |
| Multiple accounts | Labels fit; bucket choices route to the intended account; no credential crossover |
| Restart/update | Profiles, menu order, preferences and mode survive without corruption |
| Network interruption | No stuck spinner or false success; user can recover |
| GitHub destinations if shipped | Authentication, branch/path, transfer and errors verified independently |

- [ ] Verify transferred test data by size and, where practical, hashes. Do not delete source/local data on the assumption that a transfer succeeded.
- [ ] Check overwrite behavior, duplicate names, special characters, Unicode, long filenames and large files within advertised limits.
- [ ] Document limits and interrupted-transfer behavior. Do not promise restart-safe queue persistence unless verified.

## 8. Interface and accessibility acceptance

- [ ] Background and sections remain visually distinct; headings, fields and actions form clear groups.
- [ ] At 1366×768 and narrow widths down to 320 pixels, controls remain usable without accidental page overflow or clipped important labels.
- [ ] Browser zoom and keyboard-only navigation preserve control access and visible focus.
- [ ] Simple and Nested grips show clear pickup/insertion feedback; repeated moves work after saves; cancellation restores normal layout.
- [ ] Normal mode hides Premium File Index experimental controls, GitHub assets and technical Worker controls as intended. The Debug Mode switch stays at the very bottom.
- [ ] Bucket tiles retain the intended simple name-only appearance and full names remain discoverable when truncated.
- [ ] Explorer account labels remain bounded; context-menu choices avoid repeating the account name unnecessarily.
- [ ] Refresh controls are visible in both location modes and state clearly when a request fails.
- [ ] Reduced-motion settings are respected; errors are understandable beyond color alone; buttons and fields have accessible names.

## 9. Automated checks and evidence

Run these from the repository root on the frozen candidate. Record output and exit codes; commands listed here are instructions, not claims of a new run.

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run check
node --test tests/menu-reorder.test.mjs tests/cloudflare-reconnect.test.mjs tests/cloudflare-session.test.mjs tests/cloudflare-files.test.mjs tests/options-debug-display.test.mjs
npm test
git diff --check
```

- [ ] Execute the current full suite and classify every failure: product bug, stale fixture, frozen historical evidence assertion, or unexplained failure.
- [ ] Repair release-critical product defects. Update stale fixtures only with a reviewed reason; do not weaken assertions or refresh historical hashes to hide drift.
- [ ] Keep focused browser evidence separate from live Chrome/R2 evidence. Recent reorder browser checks mocked Chrome storage and Cloudflare responses.
- [ ] Repeat affected tests after changes, then rebuild and smoke-test the final archive.
- [ ] Preserve a sanitized release report with exact versions, environment, test counts and unresolved limitations.

## 10. Listing assets and reviewer instructions

Google references: [store images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [publishing workflow](https://developer.chrome.com/docs/webstore/publish).

- [ ] Prepare a clear title, short summary, detailed description, category, language, support URL and privacy URL.
- [ ] Supply the required PNG icon, small promotional image and at least one screenshot. Recheck current dimensions and format rules in Google's image guide before export.
- [ ] Show real release UI using sanitized sample data. Suggested screenshots: connection/bucket setup, Simple destinations, Nested hierarchy, Explorer, and successful transfer.
- [ ] Avoid mock controls or claims that imply unimplemented features. Keep secrets, private names and personal storage contents out of images.
- [ ] Provide reviewer instructions from installation through a successful benign transfer. Include prerequisites, authorization steps, expected result, supported sample URL and a troubleshooting route.
- [ ] Explain automatic resource provisioning and possible account/billing prerequisites before a reviewer reaches them.
- [ ] If review needs special access, provide appropriate restricted testing access through the dashboard's supported mechanism. Never commit personal credentials or tokens to the repository.
- [ ] Explain optional/debug features that are included in the submitted package and how to inspect them if needed.
- [ ] Verify all public links work without signing in and the support contact responds.

## 11. Submission, rollout and maintenance

- [ ] Complete the dashboard's listing, privacy, distribution and testing fields and resolve validation errors.
- [ ] Confirm uploaded ZIP version/digest matches the approved candidate and review any dashboard analysis results.
- [ ] Submit only after applicable blockers are closed; store review is an external decision, not guaranteed by this checklist.
- [ ] Keep public launch separate from testing/submission decisions where dashboard options allow it. Record the chosen visibility and publication behavior.
- [ ] Plan a small initial audience, a monitored support channel and a process for triaging login, transfer and data-integrity reports.
- [ ] Prepare a recovery release procedure. Document that Chrome updates generally require a newer version; “rollback” may mean shipping a corrected higher version rather than reinstalling an older package.
- [ ] Maintain privacy/support URLs, publisher verification, OAuth registration and Cloudflare compatibility after release.
- [ ] Recheck permissions, disclosures and relevant policy changes whenever new features or data flows are added.

## Release record

| Field | Value to fill before submission |
| --- | --- |
| Candidate commit / manifest version | Pending |
| ZIP filename / SHA-256 | Pending |
| Store item ID / publishing account owner | Pending |
| Tested Chrome / OS / profile type | Pending |
| Live session-expiry and next-day results | Pending |
| Core workflow matrix evidence | Pending |
| Automated results / failure classification | Pending |
| Privacy / support URLs | Pending |
| Permission audit / reviewer instructions | Pending |
| Remaining limitations and release decision | Pending |
| Owner sign-off / date / distribution | Pending |

## Official references and maintenance

Sources consulted on 20 October 2026. Recheck them at submission time; this page does not freeze Google's requirements.

- [Register a developer account](https://developer.chrome.com/docs/webstore/register)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [User data and privacy requirements](https://developer.chrome.com/docs/webstore/user_data)
- [Dashboard privacy fields and permission justifications](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Manifest icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
- [Store images](https://developer.chrome.com/docs/webstore/images)
