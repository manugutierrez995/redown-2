# CODEX IMPLEMENTATION DIRECTIVE — Portable Chronicle and Deep Agent Diagnostics

**Repository:** `thanks-cohn/remote-download-2-cloudfare`  
**Authority:** Owner-requested implementation work. Protect the owner-designated favorite baseline pinned to `4a727792a1cd622e197da9b06c9144a673317448`.  
**Intent:** Build a dependable, comprehensible, portable, long-lived Redown chronicler and a **deep, honest, agent-readable diagnostic API covering the entire lifecycle**. Implement and verify functionality; don't stop at planning/scaffolding.  
**No authorization from this directive to deploy to live Cloudflare, delete user files/R2 objects, rotate credentials, or silently merge a PR.**

## 0. Read before editing

Read in order:
1. `AGENTS.md`, `docs/agent/ARCHITECTURE_MAP.md`, `docs/agent/OPERATION_CATALOG.md`, `docs/agent/MESSAGE_INVENTORY.md`, `docs/agent/semantic/API.md`, `docs/agent/semantic/COVERAGE.md`, `docs/debug/API.md`, `docs/debug/DESIGN.md` and relevant existing API/test contracts.
2. `docs/checkpoints/REDOWN_BEST_CURRENT_2026-10-12.md`, `docs/proposals/REDOWN_REGIONAL_CONTENT_INTELLIGENCE_AND_SAFE_DEDUPLICATION.md` (addenda A–D), `docs/CODEX_PORTABLE_CHRONICLE_FOUNDATION_HANDOFF.md`.
3. `packages/content-chronicle/index.mjs`, its README and tests, `contracts/content-provenance/v1.schema.json`, transfer ledger schemas v1/v2, `extension/hitomi-capture.js`, `extension/background.js`, `extension/remote-transfers.js`, `extension/transfer-projection.js`, current remote executor/SQLite/gateway implementation and tests.
4. Independently read the **actual** `thanks-cohn/forever-works` published schemas, validator and compatibility notes *if accessible*. Never pretend existing unaccepted Forever versions are accepted; do not rewrite frozen Redown agent/debug contracts.

Inspect current `main` and run baseline diagnostics. Record exact commands, exits and known failures *before* changes. The existing suite has previously failed for unrelated reasons; never weaken assertions, secretly fix evidence hashes, or claim all tests green without proof.

## 1. Clear architectural center: minimal domain, maximum observable evidence

Build around five concepts, understandable without browsers/cloud SDKs: **identity**, **location**, **event**, **evidence**, **region**. Different source URLs have typed roles, not one misleading `sourceUrl`: containing gallery page (`overUrl`) with page title/site ID, clicked URL or action, metadata URL, actual asset URLs, redirect and browser-only generated Blob reference (not remotely retrievable), plus final destination. Capture filename, observed bytes/size, MIME type, transfer outcome, time and provenance method when cheaply available.

Separate:
- **Recognition hints** (URL/title/name/size/type): lightweight, nonblocking, uncertain;
- **Content identity** (hash of actual bytes, if performed): strong but optional;
- **Current remote existence/integrity** (independent observed evidence): separate from cached claims;
- **Transfer outcome**, **recorder outcome**, **verification outcome**, **cleanup outcome**: never conflate them.

Cheap metadata recording **must not gate downloads**. Hashing/enrichment may fail/defer and normal permitted transfers still attempt. A path claiming 'verified' must retain its independent correctness standard. Never delete a local or remote object based on a recognition hint, stale imported snapshot, missing hash, or uncertain outcome. No destructive cleanup in this first implementation.

Use tiny plain-JS domain modules and replaceable ports. JSON/JSONL are portable interchange; IndexedDB is a disposable browser query projection; a native/remote journal is authoritative where actual durable storage is offered. Do not create a graph database, proprietary ORM, distributed consensus layer or universal plugin framework.

## 2. Implement the real first vertical slice

**Phase A — fix, validate and freeze the minimal contract.**
- Run `node --test tests/content-chronicle.test.mjs` and fix failures honestly.
- Reconcile the minimal `redown.chronicle.v1` record and the richer proposed `contracts/content-provenance/v1.schema.json` with an explicit versioned mapping or revised interoperable schema. Validate with JSON Schema test fixtures; ensure importing unknown future versions fails clearly and existing v1 transfer ledgers remain unchanged.
- Cheap URL normalization: avoid leaking signed query secrets, maintain distinct URL roles and safe gallery/site IDs; no inferred URLs or fake download method. Preserve source observations even if the URL later expires.
- Deterministic event IDs and idempotent replay; repeated downloads are distinct occurrences.
- Provide independent consumer example in plain JavaScript, without Chrome globals, network calls, cloud credentials or installed dependencies.

**Phase B — durable, nonblocking capture.**
- Hook only safe cheap observation points in ordinary right-click transfers and Hitomi gallery workflow: containing page, title, actual clicked action, known metadata/asset references, filename/type/observed length and intended account/bucket/key. Do not trigger extra asset downloads merely to log metadata.
- The recorder is asynchronous and separate from the byte-transfer critical path. A metadata failure must not convert an otherwise successful transfer into failure, and vice versa. Use bounded in-memory queue, batched durable append, retry and idempotent replay. Show an honest `recording-gap` on hard exhaustion; never invent missing events.
- Do not break the Hitomi working browser ZIP route, overwrite handling, Cloudflare login, menus, R2 explorer, local upload, or remote executor. The current 64 MiB Hitomi guard remains unless separately proven safe.
- Demonstrate restart and crash recovery for the durable journal where available. Do not claim MV3 extension memory or IndexedDB cannot be erased.

**Phase C — portable recall and local index.**
- Versioned JSON manifest + JSONL events/snapshots, explicit account/region scope, revision, coverage, incompleteness and redaction, bounded/paginated imports and exports; independent checksum where practical. Streaming or segmented format for large histories. Keep raw sensitive signed URLs and tokens out of exports; private execution references remain separately scoped.
- Build a lightweight IndexedDB adapter keyed by event ID, overUrl/site ID, recognition hints, destination and observed time. Atomic snapshot activation, migration discipline, stale/partial indicators, and import/export cross-runtime fidelity. Cache loss must not be confused with file loss or erase durable history.
- Expose a non-destructive `Have we seen this before?` query: occurrence count, possible matches, title, source roles, known destinations, freshness/coverage and precisely what is unknown. No false 'same bytes' claim.

**Phase D — optional R2 history vault foundation.**
- Provide explicit user opt-in and account/bucket/prefix selection for **Save JSON history to Cloudflare R2 for recall and recovery**; default off. Versioned immutable backups, verified generation/manifest where possible, restore validation and no automatic deletion. Prevent the history prefix recursively indexing itself.
- Backup failure, offline Chrome, bucket permission errors and quota overflow must never block ordinary download attempts. Separate backed-up, local durable, pending and unknown status. No live R2 deployment without separate authorization and an isolated acceptance environment.
- If no native companion is built in this slice, state honestly which durability guarantees are unachievable yet. Native storage belongs outside browser cache, with durable partial jobs; Chute v2.6.1 RC1 can be an inspected design reference, not a claimed Redown implementation.

## 3. Deep Agent Diagnostic API: necessary, first-class, read-only by default

This is **core acceptance work, not optional documentation**. Build an introspection layer that gives Codex, ChatGPT and future agents accurate end-to-end visibility without needing browser screenshots or access to secrets, and without coupling the domain model to the agent API.

### 3.1 Lifecycle model and correlation

Define stable, attributable correlation identifiers across:
`user right click / selected element` →
`containing document & observed metadata` →
`destination resolver and transfer-mode decision` →
`browser or remote executor acceptance` →
`queue / retries / fallback decision` →
`source retrieval or Hitomi browser ZIP capture` →
`byte transfer / R2 multipart or direct upload` →
`completion acknowledgment` →
`independent verification status` →
`chronicle journal append` →
`IndexedDB projection` →
`optional R2 JSON backup` →
`recovery / reconciliation`.

A missing stage is represented as `not-observed`, `not-supported`, or `not-applicable`, with reason. A missing event is NEVER proof a stage did not happen. Each event includes logical job/event/attempt IDs, stage, action/result, time, component, config/adapter version, redacted evidence reference, and a trustworthy source anchor where known. Allow out-of-order evidence and gap detection. Distinguish user report, instrumentation observation, deterministic test, emulator, installed Chrome, and real Cloudflare R2 proof.

### 3.2 Programmatic discovery and read-only inspection

Extend **through a versioned sibling namespace**, preserving frozen Redown project/debug APIs. Proposed discoverable operations (exact names may change after design review):
- `describeCapabilities`, `describeEventSchema`, `describeStages`, `listAdapters`, `getCoverageMatrix`;
- `listTransfers`, `getTransferTrace`, `getTimeline`, `getDecisionTrace`, `getQueueSnapshot`, `explainFailure`, `getRetryAndFallbackTrace`;
- `listChronicleEvents`, `getProvenance`, `getSourceUrlRoles`, `findPossibleDuplicates`, `getIndexFreshness`, `getJournalHealth`, `getBackupStatus`;
- `traceEntityRelationships`, `explainObjectLocation`, `explainVerification`, `explainCleanupEligibility`, `planVerification`, `validateRecords`, `exportDiagnosticBundle`.

Expose exact support levels (`implemented`, `derived`, `planned`, `unavailable`) and reason for gaps, not phantom coverage. Support pagination, bounded query costs, stable errors and schema validation. Read-only inspection must never implicitly call source URLs, provision/deploy Workers, mutate browser state, upload content, access restricted credentials or delete objects. Optional mutation commands require separately scoped explicit authorization and belong outside the inspection API.

### 3.3 Explainability above mere logging

For any transfer or duplicate recognition, the API should answer in plain structured evidence:
- What was requested, from where (page vs clicked vs metadata vs asset), to which destination and by which mode?
- Why did it use browser assistance rather than Fully Remote? Was the executor configured/reachable, did the URL refer to an actual downloadable object, and was browser-only generation detected?
- Where did bytes actually flow? Which steps were observed vs inferred? Did a local file exist, and was it a managed temporary file or user's original?
- Was transfer acknowledged? Was integrity independently checked? If not, why not? Was cleanup disabled, denied, or not applicable?
- What did the recorder capture? Which URLs were dropped/redacted? Which event(s) failed to persist? Could IndexedDB be stale or missing?
- When a prior item 'matches', what exact cheap keys matched, what did not, and whether any byte-level equality has been proven.
- What should the next safe diagnostic step be? Return a **proposed action plan**, not automatically execute it.

Implement structured `claim → evidence → confidence/limitations → source/trace → safe next step` answers and explicit uncertainty. Do not promote old PR prose, a passing unit test, or a source hash into verified live behavior. Agents must be able to tell if they lack an installed browser, R2 access or a complete journal.

### 3.4 Evidence portability and anti-fragility

- Schema-versioned append-only diagnostic JSONL with immutable event IDs, trace IDs, deterministic fixtures and compatibility tests; snapshots reproducible when given same inputs.
- Secrets and private path redaction before indexing/export; do not emit signed asset query strings, cookies, credentials, access tokens or original local file contents. Signed URLs may be represented by opaque references in restricted stores.
- Source locations/anchors and capability graph may grow independently of runtime. Prefer a **derived semantic graph** over a graph database. Trace feature → code location → test → runtime evidence → known acceptance gap. Use actual verified source evidence, no invented links.
- Add diagnostic budget: bounded event volume, retention, sampling of high-volume asset events and explicit gaps; high-cardinality events cannot exhaust RAM or stall download queue.
- Allow fixture/offline CLI use with zero cloud credentials. Provide a pure reader, optional sanitized snapshot collector, and tests for read-only guarantees and missing-data humility.
- Support correlation across browser restart, extension service-worker suspension, remote executor crash/retry, native companion if present, and R2 response uncertainty.

### 3.5 Tests: prove the diagnostic claims

Tests must exercise:
- Full synthetic trace from click through remote or browser capture to chronicle journal/import;
- Hitomi JavaScript-generated ZIP vs direct image URL classification and explanation;
- remote executor disabled, permission denied, request accepted but response lost, retry/replay;
- transfer success + recorder failure and recorder success + transfer failure (independent outcomes);
- dropped/overflowed observations with explicit gap reporting;
- stale/partial IndexedDB, journal tail corruption, duplicate replay and portable round-trip;
- same page/title/filename but changed actual content; equal size with different bytes remains only candidate;
- private/signed URL redaction, attacker-controlled titles/file names, malformed imported JSON;
- frozen project/debug API compatibility; no read-only method performs HTTP/deploy/write/delete;
- trace retained and intelligible after a component restart and a simulated browser-profile reset;
- real Chrome/R2 tests listed separately and executed only if authorized/available.

## 4. Forever Works: reuse only proven value

Find actual `forever-works` published model and tests. Prefer to export a small optional compatibility adapter/lesson proposal expressing: goals, invariants, capability edges, failure modes, evidence, replacement contract and regression verdict. Use version pinning and upstream actual validators. Existing incompatibility must remain reported. Do not bend the Redown domain model around an unaccepted version, or make inspection depend on Forever.

Document cold-agent recovery: an unfamiliar agent should discover API, read current coverage, identify stale or absent evidence, reproduce a failing fixture, trace it to actual source, correct it, verify narrowly, and leave a durable source-backed handoff. One command should validate the portable chronicler and diagnostic contracts offline.

## 5. Work rules, deliverables and stop criteria

Deliver actual functioning code, tests and concise documentation for Phases A–C and the diagnostic API, with Phase D only to the extent securely achievable without live credentials. Prefer coherent, separately reviewable commits; preserve small changes and a good handoff if blocked. No claiming a Windows EXE/native host exists unless built and tested.

Required artifacts:
- Versioned portable chronicle contract/schema + valid fixtures and reader/writer;
- Durable bounded recorder adapter and separately testable browser integration;
- IndexedDB projection (or explicit evidence-backed blocker), replay and recall path;
- Versioned diagnostic schemas, API/CLI with discoverable, safe, evidence-backed operations and **honest coverage matrix**;
- End-to-end causal/failure trace fixtures and deterministic tests;
- `docs/agent/chronicle/API.md`, architecture map, debug guide, limitations/privacy/threat model, Forever compatibility assessment and Cold Agent runbook;
- `docs/CODEX_CHRONICLE_AND_DEEP_AGENT_DIAGNOSTICS_IMPLEMENTATION_REPORT.md` with exact baseline/new test counts, performance constraints, logs, example traces, live acceptance gaps, rollback and commit SHAs.

Do not rewrite or delete the owner's checkpoints, frozen contracts, historical debug evidence, or working Hitomi behavior. Do not mark an unchecked requirement complete. Never substitute planning prose for implementation. If resource limits prevent full completion, **implement and verify the most meaningful safe vertical slice**, clearly separate shipped, tested, and remaining work and preserve patches/bundle or a real branch/PR.

**Definition of success:** A fresh programmer/agent can inspect a fully portable record of what Redown observed, trace a source request through every actually instrumented stage, diagnose why a Hitomi or remote transfer behaves differently, recall history without relying on Chrome's cache, and establish which conclusions are proven versus unknown—without breaking a working download.

**Design maxim:** A small domain core; deep observability at the edges; hard evidence instead of assumptions; browser-independent records; no unnecessary moving parts.


---

## Mandatory Addendum — State-of-the-art diagnostic codes and debug-mode causal evidence (owner update, 2026-10-12)

**Priority change:** Build an **exhaustively useful but comprehensible** diagnostic vocabulary across every instrumented Redown boundary. When the owner tests in Debug Mode, the resulting export must give ChatGPT, Codex or an unfamiliar agent enough *concrete, correlated, source-backed evidence to explain WHY something worked, failed, stalled, retried, fell back or was never attempted*. A generic `FAILED`, `unknown error`, HTTP 503 alone, or a pile of uncorrelated console lines is not sufficient.

### D1. Stable codes, not invented one-off strings

Create a versioned, machine-readable **diagnostic code registry** with immutable symbolic IDs, e.g. `REDOWN.HITOMI.CLICK.BUTTON_NOT_FOUND`, `REDOWN.SOURCE.URL.BROWSER_ONLY`, `REDOWN.EXECUTOR.PREFLIGHT.NOT_CONFIGURED`, `REDOWN.R2.UPLOAD.RESPONSE_503`, `REDOWN.CHRONICLE.JOURNAL.QUOTA_EXHAUSTED`. These names are *illustrations*, not claims of present failures. Define a simple naming grammar and coverage hierarchy:

`REDOWN.<DOMAIN>.<STAGE>.<OUTCOME_OR_CAUSE>`

For each registered code, provide structured fields: `code`, `versionIntroduced`, `severity`, `category`, `stage`, `component`, `humanMeaning`, `knownCauses`, `detectionEvidence`, `userSafeAction`, `agentNextDiagnostic`, `retryability`, `isTerminal`, `redactionClass`, `relatedSourceAnchors`, `testFixtureIds`, and `documentationRef`. Distinguish *observed symptom*, *confirmed cause*, *inference/hypothesis*, *successful stage*, *intentional safety block*, *missing instrumentation*, and *unknown*. Do not misleadingly encode an unproven root cause in a code; use symptom codes and attach hypotheses separately.

**Aim for maximal meaningful coverage, not maximal noise or arbitrary code proliferation.** Register a code for each independently actionable outcome or failure mechanism; avoid duplicate synonyms and untestable Cartesian-product combinations. All emitted codes must resolve in the registry. Unknown future codes must survive export/import and render gracefully. Maintain compatibility aliases for renamed/deprecated IDs; never silently reinterpret an existing code.

### D2. Full lifecycle instrumentation and why-not traces

Instrument decision and boundary outcomes with stable codes for:
- context-menu selection, click target identity, permissions, extension-ID/profile detection, gallery page/title and provenance role classification;
- Hitomi injection, button detection, capture hook install, click initiation, Blob formation, chunk transfer, buffer/64 MiB safety ceiling, MV3 worker suspension, browser download collision and cleanup absence;
- Simple/Nested destination selection, account/bucket/prefix availability, Cloudflare OAuth/provisioning readiness, wrong bucket/key and authorization;
- mode policy, Fully Remote executor discovery/configuration, HTTPS origin/token/permission checks, reachability, durable acceptance, lost response, replay, fallback eligibility and actual byte path;
- remote DNS/redirect/source accessibility, transient networking, HTTP status, rate limiting, range/ETag behavior, body length, timeout and retry;
- R2 gateway binding, multipart staging/part acceptance/commit/abort, authorization, object-conflict protection, readback integrity, verification uncertainty and idempotent recovery;
- local upload/browser queue/native companion if implemented: file identity, durable path, sleep/restart, progress, corruption detection and guarded deletion decisions;
- cheap chronicler capture, role-aware URLs, redaction, journal write/replay/quota/gaps, IndexedDB import/migration/index freshness, JSONL export, opt-in R2 history backup, snapshot generation/restore and recovery.
Also emit *positive milestone* and *skipped-for-reason* codes so agents can distinguish “worked up to R2 staging” from “R2 was never reached.” If no code could be produced because the component crashed, the next supervising component must report an evidence **gap**, not counterfeit a child outcome.

### D3. Required diagnostic event envelope

Use a compact, documented JSON Schema and round-trip-compatible JSONL. Every diagnostic event should carry:
`schemaVersion`, `code`, `traceId`, `spanId`, optional `parentSpanId`, `transferId`, `attemptId`, `eventId`, `occurredAt` (UTC with clock source), `stage`, `component`, `severity`, `outcome`, `message`, `evidenceRefs`, `causalLinks`, `elapsedMs` if measured, `counts/byteCounters` if observed, `environmentVersion`, `redactionStatus`, and `observationLevel` (reported, measured, simulated, inferred, not-observed). Only require fields available at that stage; missing data must be explicit, never fabricated. Stable correlation IDs cross extension UI/background, page world, native helper, executor and R2 gateway through authorized metadata only. Use monotonic durations within one process and UTC for interprocess approximate ordering; document clock skew. Avoid high-volume per-chunk events by aggregating byte/progress counters and sampling with explicit sampling metadata.

### D4. Owner-facing Debug Mode and export

Add an **explicit opt-in Debug Mode** UI with a clear on/off state, short diagnostics retention controls, source-private-data warning, a structured per-transfer timeline, and **Export sanitized diagnostic bundle (JSON/JSONL)**. The bundle should contain:
- manifest with application/version/adapter revisions, diagnostic registry/schema versions, environment capability matrix and actual test/live provenance;
- minimal event chronology with correlation/parent IDs, decisions and codes, relevant source and destination *redacted* identifiers, symptoms and observed timings;
- journal/queue state, actual chosen transfer path, coverage and missing-stage markers, retry/fallback trace, result of R2 acknowledgment vs independently verified readback, pending/stale index/backup state;
- deterministic “why this happened / what is unknown / next safe check” report with claim-to-evidence links, affected source anchors, registry explanations and incident IDs where available;
- redaction audit/diagnostic bundle validity status and an importable reproduction fixture where possible.

The export must work offline for captured data and be readable by a small standalone Node/JS CLI or another browser. **Don't require the agent to watch a live browser or acquire user credentials** just to understand a previously recorded failure. In normal mode keep only minimal essential status/history for low resource use; never make verbose diagnostics required for transfer completion.

### D5. Safe, trustworthy diagnostics

Never include raw OAuth tokens, cookies, signed URL query secrets, private file bytes, full filesystem paths or page DOM dumps. Redact prior to persistence and *test* adversarial URL/title/header cases. Consent-based support bundles may selectively include harmless extra metadata, but don't silently broaden collection or upload logs. Put hard limits on event count, line size, depth, retention, total bundle size and per-job tracing overhead; when exceeded, persist an explicit gap/summary instead of blocking the transfer. Do not let diagnostics change program outcomes, introduce source fetches, call deploy/provision, or authorize delete.

### D6. Required agent APIs and validation

Extend sibling read-only API with `listDiagnosticCodes`, `describeDiagnosticCode`, `listTraceCodes`, `explainTransferFailure`, `getCausalChain`, `getStageCoverage`, `findFirstDivergence`, `compareSuccessfulAndFailedTraces`, `validateDiagnosticBundle` and `suggestSafeReproduction` (or equivalent clearly discoverable operations). `compareSuccessfulAndFailedTraces` should contrast stage-by-stage why an MP4 direct URL succeeded while a Hitomi ZIP required the browser, or why Fully Remote refused to start. The engine must distinguish unobserved code paths from confirmed skipped code paths. Outputs include evidence, confidence/uncertainty, applicable code definitions and code-location pointers where verified.

Provide deterministic fault injection for each meaningful registered error family and tests that assert:
1. A code is emitted from the actual error boundary;
2. The code maps to source + documented meaning + reproduction fixture;
3. Sanitized debug bundle survives export/import, process restart and (where durable storage exists) cache loss;
4. Agent can locate the first *evidence-backed* divergence between success and failure without guessing;
5. No secrets leak and Debug Mode's normal-case overhead stays bounded;
6. Existing browser/Hitomi/transfer behavior remains unchanged except intended opt-in diagnostics.

The deliverable is NOT a giant enum without instrumentation. A code with no real emitting path must be labeled `planned` in the coverage matrix, not portrayed as supported. Make the initial small vertical slice exceptionally good, then expand coverage based on tested actual boundaries. Record exact observed/tested/untested codes and supported stages in the implementation report.

**Debug acceptance scenario:** User turns on Debug Mode; right-clicks a Hitomi gallery download using Fully Remote; exports a bundle; an unfamiliar agent, with no live credentials, can read the registry and timeline, identify the mode-policy branch that blocked the browser-generated archive, distinguish this intentional block from network/R2 failure, point to the source rule and evidence, and recommend the safe next test. Repeat for automatic browser-assisted success, remote executor disabled, an R2 503, and metadata recorder overflow. If the relevant evidence is missing, the API must say exactly *which observation is missing* rather than inventing causality.

**Guiding rule:** More meaningful, explainable codes; fewer opaque failures. Every important choice should explain itself; every unexplained gap should be visible.
