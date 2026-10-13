# Chronicle architecture and ownership

The domain remains plain JavaScript: identity, location, event, evidence and region. Byte-transfer behavior does not depend on an agent API or successful recording.

| Boundary | Implementation | Authority and tested limit |
| --- | --- | --- |
| Portable metadata | extension/chronicle-domain.js; packages/content-chronicle/index.mjs | Shared browser/Node validator, capture, recall and JSON/JSONL; hints never prove equal bytes |
| Diagnostic vocabulary/envelope | extension/diagnostic-core.js; contracts/diagnostics | Pure source-backed definitions, bounded redaction and deterministic explanations |
| Async recorder | extension/diagnostic-recorder.js | 128 pending slots, at most three append attempts, stable batch IDs, reserved gap summary |
| Browser persistence | extension/diagnostic-browser.js | Profile-scoped Chrome local storage; 1/24/72-hour diagnostic retention, 1,000 retained diagnostics, 500 cheap observations |
| Disposable query index | extension/chronicle-index.js; packages/content-chronicle/indexeddb.mjs | One activation transaction; indexes on event/page/site/name/size/destination/time |
| Host journal | packages/content-chronicle/file-journal.mjs | Single writer, fsync after append, replay conflict rejection, torn-tail prefix recovery; not a shipped native host |
| Portable history generations | packages/content-chronicle/archive.mjs | Scope/revision, bounded segments, independent checksums; opt-in immutable vault ports with readback; no live R2 adapter |
| Actual edge instrumentation | background.js; remote-transfers.js; remote/adapters/r2-gateway.mjs | Context selection, mode policy, capture boundaries, upload responses, remote outbox/replay; R2 adapter observer must be injected explicitly |
| Owner Debug Mode | options.html; diagnostic-options.js | Off by default, retention, text-only timelines, offline JSON/JSONL export; no automatic support uploads |
| Agent inspection | agent/chronicle/api.mjs; cli.mjs | Pinned input snapshots, no execution ports; source/test confidence stays separate from browser/R2 proof |

Existing `WORKER_SOURCE`, HttpSource, transfer-core verification, SQLite transfer ledger, gateway/Durable Object behavior, local file upload engine, explorer, OAuth and existing agent/debug/semantic implementations are unchanged. R2Gateway gains an optional isolated observer without changing its request/error/retry semantics. The Hitomi 64 MiB ceiling, ZIP byte relay, overwrite behavior and Fully Remote refusal remain intact.

Browser observation occurs synchronously only for small sanitized metadata, then schedules persistence. No diagnostic append is awaited on a byte-transfer path. Enrichment/index/backup failures remain independent. Service-worker suspension can erase a not-yet-appended batch; an absent event is unknown, not proof of a skipped operation. No claim of browser cache immortality is made.

Pending gaps are exported even when persistence remains unavailable, if that worker is still alive. A later component cannot reconstruct an unrecorded child outcome after a crash. The fsync journal supports recovery where an external caller actually provides durable host storage. Browser-profile reset recovery requires a previously exported archive/bundle or separately stored host journal.
