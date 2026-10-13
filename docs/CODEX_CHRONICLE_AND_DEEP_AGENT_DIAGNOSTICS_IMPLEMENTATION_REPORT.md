# Portable Chronicle and Deep Agent Diagnostics implementation report

Implemented and tested a substantive **partial vertical slice** of the owner directive, including its mandatory diagnostic-code/Debug Mode addendum. This is not completion of the full lifecycle request. The protected checkpoint and frozen agent/debug contracts/historical evidence remain untouched. No deployment, real R2 operation, credential rotation, original-file deletion, native host or accepted Forever model is claimed.

## Source and publication basis

Current main inspected: `fff29efa0701f8f91c44859288fb70e8cb1d10eb`; protected favorite: `4a727792a1cd622e197da9b06c9144a673317448`. The environment initially held `3e1010bb1e4056799f2887ab140af6a86d6b9683` with stale origin/main. Git fetch failed because its configured proxy was unavailable. GitHub connector retrieval reconstructed the current source exactly: independently rebuilt tree `6dd56d0ad87045c003ff9dc048d2d88c28a9a805` equals current main's tree. Original owner directive/checkpoints/proposals are preserved byte-for-byte. Final publication identifiers are recorded in the post-publication handoff; no existing upstream changes are overwritten.

## Working implementation and evidence

| Area | Delivered / tested | Remaining |
| --- | --- | --- |
| Phase A | Shared browser/Node minimal domain; independent schemas and valid fixtures; explicit one-way rich provenance projection; roles/site IDs/actions; unknown-version rejection; duplicate-ID/idempotent replay; independent consumer | Query stripping can collapse identity; rich projection is lossy; byte identity stays in actual verification evidence |
| Phase B | Cheap context-menu capture; asynchronous bounded recorder; batch/retry/gap isolation; browser persistence; fsync disk journals; restart/torn-tail recovery tests | Browser pending batches can vanish on suspension; no native host or always-on external recorder; private titles/names omitted by default |
| Phase C | Portable JSON/JSONL and scoped checksum segments; atomic IndexedDB activation wired after metadata append; stale/partial/missing markers; candidate recall and paginated inspection | Owner-facing history search/restore UI, streaming very large histories and automated cross-profile recovery are incomplete |
| Phase D | Explicit opt-in immutable vault ports, manifest/segment readback validation, disabled default, prefix self-exclusion and conflict/failure tests | No live R2 adapter, deployment, automatic backup, native storage guarantee or verified cloud recovery |
| Diagnostics | 41 registry entries: **40 implemented, all 40 exercised at actual emitting boundaries in simulated adapters**, one backup-disabled entry planned. Correlated envelopes, gap/skip distinction, causal navigation, stage comparison, evidence-backed explanations and safe reproduction proposals | Comprehensive source/executor/gateway/OAuth/profile/local/native tracing and cross-process bundle ingestion remain open |
| Debug Mode | Off by default; retention; structured text-only timelines; offline JSON bundle and JSONL events; pre-persistence privacy/budget checks; pending gap export | Installed Chrome/MV3 lifecycle and live Cloudflare acceptance not observed |

Code registry and exact per-code emitting-path verdicts: [emission-coverage.json](agent/chronicle/verification/emission-coverage.json). Source anchors are validated against actual code; a matching anchor/test result is not live certification. Optional R2Gateway observers must be injected; current normal executor configuration does not attach that observer to a journal.

## Exact verification

Environment: Node `v24.19.0`. The first `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` exited 1: esbuild's install script encountered `spawnSync ... EPERM`. `npm ci --ignore-scripts --cache /workspace/.npm-cache --no-audit --no-fund` exited 0 and installed 88 packages. Ignoring scripts supplies jsdom for tests; it does not certify a working esbuild/Worker emulator installation.

Before application changes, `node --test tests/content-chronicle.test.mjs` exited 0; direct/in-process execution confirmed its four assertions pass. Initial `npm test` exited 1, reporting 9 passing/7 failing test files while dependencies were unavailable. After dependency setup, the byte-identical upstream baseline was run file-by-file with `node "$f"` for all `tests/*.test.mjs`: **92 assertions passed, 30 failed, and remote-transfer.test.mjs aborted with exit 134**. This exceeds the historical 19-failure audit; environment/CLI-process failures and existing fixture failures are retained, not reclassified as successful.

Final file-by-file run: **112 passed, the same 30 failing assertion names, and the same native remote-transfer abort**. The difference is 20 passing new diagnostic tests. Every pre-existing failure name is unchanged. Full-suite green is not claimed. Baseline/final per-file results are committed in [verification](agent/chronicle/verification/baseline-summary.json); complete logs are retained in the durable handoff archive.

| Command | Exit and exact result |
| --- | --- |
| `npm run test:chronicle` | 0; 24/24 assertions (20 diagnostic/integration, four original chronicle); four independent schema fixture/future-version checks pass |
| `npm run check` | 0; existing and new JavaScript syntax checks |
| `node --test --test-isolation=none tests/remote-browser.test.mjs tests/cloudflare-files.test.mjs tests/explorer-worker.test.mjs tests/upload-location-builder.test.mjs tests/upload-request-context.test.mjs tests/simple-location-rows.test.mjs` | 0; 25/25 regression assertions |
| `python tests/transfer-schema-conformance.py` | 0; actual v2 ledger validation, private URL/false verification rejection, retained v1 schema validity |
| `node agent/chronicle/cli.mjs describeCapabilities --json` | 0; offline discovery |
| `node agent/chronicle/cli.mjs validateDiagnosticBundle --bundle docs/agent/chronicle/verification/observed-acceptance-bundle.json` | 0; captured fixture bundle valid |
| `node agent/chronicle/cli.mjs explainTransferFailure --bundle docs/agent/chronicle/verification/observed-acceptance-bundle.json --input '{"traceId":"disabled"}'` | 0; source-backed executor-disabled explanation, missing downstream stages explicit |
| `npm test` (final) | 1; existing failures and native runtime crash remain; full log in handoff archive |

The native assertion is `node::InternalCallbackScope::Close(): (env_->execution_async_id()) == (0)`. The configured runtime aborts the existing real HTTP/SQLite/process suite, so its multipart/executor verification cannot be certified in this environment. No assertions, old hashes or tests were disabled to make results green. No installed Chrome, actual Cloudflare credentials or real R2 tests were used.

## Acceptance scenarios exercised

Actual context-menu Fully Remote Hitomi branch emits browser-only classification plus intentional policy block without injection or byte fetch. Automatic gallery routing is separately observed. Actual injection/click function is executed under a page fixture; injection failure remains a symptom rather than an invented button/root cause. Actual capture messages enforce the unchanged 64 MiB guard, aggregate chunk bytes, detect invalid/incomplete ZIPs, and report upload acknowledgment separately from absent independent readback.

Actual remote submit/reconcile paths cover disabled executor, HTTPS validation, permission denial, lost response, original-idempotency replay and durable acknowledgment after a new browser runtime. Actual R2Gateway failures cover 503, denied HTTP and unknown network response. Upload success plus recorder failure, recorder success plus upload failure, quota/overflow/retries, atomic index abort/staleness/cache reset, fsync restart/replay/torn tail, checksum/archive restore, vault conflicts and unknown future codes all have tests. A preflight failure does not emit a counterfeit upload failure.

The [observed acceptance bundle](agent/chronicle/verification/observed-acceptance-bundle.json) contains actual production-branch emissions using **simulated adapters**. It is fixture proof, not owner/browser/cloud proof. The [debug runbook](agent/chronicle/DEBUG.md) provides offline explanation and safe next checks.

## Privacy and budgets

No raw tokens, signed query secrets, cookies, headers, DOM dumps, original bytes, free private error strings or physical file paths enter diagnostic persistence. Adversarial URL/title/header/path and text-only UI tests pass. Unknown code metadata is reduced to explicit unknown explanations. Query results cannot mutate the pinned registry/snapshot.

128 pending recorder slots, three append attempts, bounded detail nodes/depth, 16 KiB envelope limit, 2,000-event API limit, 1,000 browser diagnostic records, 500 cheap observations, 4 MiB bundles and 100 derived trace reports bound overhead. Export truncation/retention/overflow remain explicit gaps. An informal 100,000-call Debug-OFF loop took approximately 3.8 ms with zero writes/schedules/pending events in this container; this is not a hardware or installed-Chrome performance guarantee. Per-chunk verbose events are not emitted.

## Gaps and next steps

The complete directive remains open. Priority next work: instrument source/DNS/redirect/HTTP/range/ETag/body and remote multipart/commit/readback/abort/recovery stages into an actual durable executor diagnostic journal; carry per-attempt correlations into combined exports; instrument OAuth/destination availability/profile/permissions and page-world supervision; capture authorized safe metadata/outcome enrichment; build owner history restore/recall UI; add a real scoped R2 history adapter only in an authorized acceptance environment. Local/native file lifecycle and cleanup remain unimplemented here. No relation/feature graph beyond source-anchor and causal navigation is advertised.

Forever Works actual pinned schemas/reference implementation were inspected. Existing proposed-version schema incompatibility and unaccepted authority remain unchanged. No new Forever export or upstream validation success is claimed; see [assessment](agent/chronicle/FOREVER.md).

## Rollback and recovery

Turn Debug Mode off to stop verbose recording; retained exports remain readable. Revert the implementation commit(s) to restore current-main runtime behavior. Preserve any useful diagnostic/history exports before browser cleanup. The owner's checkpoint stays pinned and unchanged. Host tail repair is explicit and outside the read-only API; retain the original damaged journal first. No operation added by inspection authorizes remote or local file deletion.

## Publication

Implementation committed to `main`: `57d8f1bb7fe72f0e54c52dcde15ea14bd2354283` (parent `fff29efa0701f8f91c44859288fb70e8cb1d10eb`, tree `f027dd6c47b4ffc192d44aef3786fa3f12be127a`). GitHub confirmed repository push permission and an unprotected main branch. Publication used a fast-forward update with an exact expected-head lease; no force push or PR merge occurred. The remote tree exactly matches the staged, reviewed local tree. A documentation-only follow-up records this result; its SHA is provided in the durable handoff.
