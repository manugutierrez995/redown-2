# Chronicle and causal diagnostics API 1

This sibling namespace preserves project/debug/semantic API contracts. `agent/chronicle/api.mjs` accepts validated, pinned snapshots and has no I/O ports. It cannot fetch sources, provision Workers, read credentials, mutate browser state, upload or delete. Discovery advertises implemented operations only; adapters and lifecycle gaps have separate support labels.

```sh
npm run test:chronicle
node agent/chronicle/cli.mjs describeCapabilities --json
node agent/chronicle/cli.mjs listDiagnosticCodes --input '{"limit":100}' --json
node agent/chronicle/cli.mjs explainTransferFailure --bundle tests/fixtures/chronicle/blocked-bundle.json --input '{"traceId":"fixture:blocked"}' --json
node agent/chronicle/cli.mjs validateDiagnosticBundle --bundle captured-bundle.json --json
```

The CLI reads only an explicitly supplied bundle file. It never executes reproduction suggestions. Node built-ins suffice for inspection and the independent consumer. Tests also use the project's jsdom development dependency and Python jsonschema for independent conformance.

All results contain `ok`, `apiVersion:1`, and `data`; errors contain stable `error.code` and null data. CLI errors exit 2. Pagination uses integer `offset >= 0`, `limit 1..200` (default 100), `items`, `total`, and `nextOffset`. Unsupported operations, absent traces, invalid pagination and invalid records fail explicitly. Query results are independent copies.

| Operations | Input / meaning |
| --- | --- |
| describeCapabilities, describeEventSchema, describeStages, listAdapters, getCoverageMatrix | Discovery, contracts, support and gaps; source availability is not live acceptance |
| listDiagnosticCodes, describeDiagnosticCode | Pagination; exact `code`; unknown future codes render with unknown meaning |
| listTransfers | Captured trace IDs, not live executor enumeration |
| getTransferTrace, getTimeline, listTraceCodes | `traceId`; captured events/codes, missing stages and links |
| getCausalChain | `traceId`; explicit edges, absent references, and source navigation |
| getDecisionTrace, getRetryAndFallbackTrace | `traceId`; observed policies/replays, no inferred fallback |
| getStageCoverage | `traceId`; observed, skipped-for-reason, or not-observed; a gap marker is not execution proof |
| explainTransferFailure, explainFailure | `traceId`; claim, evidence, confidence, limitations, source and proposed safe next check |
| findFirstDivergence, compareSuccessfulAndFailedTraces | `successTraceId`, `failedTraceId`; first lifecycle stage with different observed codes; missing evidence cannot establish divergence |
| validateRecords, validateDiagnosticBundle | Optional `bundle`; structural/redaction checks, not authenticity or live correctness |
| exportDiagnosticBundle, suggestSafeReproduction | Captured sanitized data; `traceId` for reproduction; no execution authority |
| listChronicleEvents, findPossibleDuplicates | History pagination; `overUrl`, optional `filename`, `size`; recognition only |
| getProvenance, getSourceUrlRoles | `eventId`; explicit minimal-to-rich v1 projection and observed source roles |
| getJournalHealth, getQueueSnapshot, getIndexFreshness, getBackupStatus | Captured recorder/queue counts; live state or index revision is unknown when not supplied |
| explainVerification, explainCleanupEligibility, planVerification | Verification evidence remains independent; cleanup always denied; verification actions are proposed |

## Contracts and correlation

`contracts/diagnostics/event-v1.schema.json` defines envelopes. `contracts/diagnostics/registry-v1.json` is the machine-readable immutable vocabulary generated from the shared portable implementation. IDs use `REDOWN.<DOMAIN>.<STAGE>.<OUTCOME_OR_CAUSE>`; domains can include digits (`R2`). No aliases have been needed. Code renaming must retain an alias and its original meaning.

Trace IDs originate at the right-click boundary. Remote idempotency keys and Hitomi queue job IDs reuse that UUID. Replay preserves IDs. Each recorder instance has a fresh session namespace and increasing event IDs; retransmission of a batch preserves its original event IDs. Explicit event inputs produce deterministic envelopes/snapshots. Independent download actions remain distinct occurrences.

Stage spans are opaque references. Recorder links identify the preceding instrumented boundary in that trace, not an independently proven provider root cause. UTC clocks can skew across processes; collection order is not a universal causal order. Attempts absent from a boundary remain null. Cross-process executor trace ingestion is not implemented; remote acknowledgment cannot substitute for executor source/multipart/readback events.

Known-code messages and source anchors must match the registry. Unknown future codes survive decoding/export, with their explanatory text/source authority replaced by an explicit unknown marker. Unknown schema versions fail. Malformed, inconsistent, oversized and private arbitrary fields fail validation. Every input remains untrusted evidence; validation does not authenticate its collector.

## Chronicle interoperability

`packages/content-chronicle/index.mjs` and the extension use the same domain implementation. `contracts/chronicle/event-v1.schema.json` describes `redown.chronicle.v1` events. `toProvenance` explicitly projects these into the existing richer proposed content-provenance v1 schema; fixtures validate independently against both. This projection is intentionally lossy: the richer schema has no minimal filename/recorder-outcome fields. It never invents hash verification. Bare minimal `integrity:verified` records now fail because they supplied no independent proof; use actual transfer-ledger readback evidence instead.

Containing pages, clicked/metadata/assets/redirect URLs retain different roles. Unsupported/generated Blob URLs are omitted from portable URL references, with browser-only classification captured by diagnostics. No invented clicked URL replaces a JavaScript action. Site IDs are recognized only for the observed Hitomi `/galleries/<number>.html` form. Queries/fragments are removed; query stripping can collapse distinct resources.

`archive.mjs` provides scoped, revisioned JSON manifests plus bounded JSONL segments and injected SHA-256 checksums. Restores return coverage/completeness and never executable intent or deletion authority. `consume.mjs` is an independent offline consumer. `ChronicleFileJournal` and `FileJournal` provide single-writer fsync-backed append/idempotent replay for metadata and diagnostics respectively. A torn tail blocks append; prefix recovery reports corruption. Explicit repair is outside the inspection API and requires retaining the original damaged journal.

IndexedDB activation replaces events and revision in one transaction; abort retains the old generation. Missing/stale/partial markers do not imply file loss. Browser metadata append activates the disposable index asynchronously. Native file-journal use requires a powered host and an explicit caller; no native companion exists.
