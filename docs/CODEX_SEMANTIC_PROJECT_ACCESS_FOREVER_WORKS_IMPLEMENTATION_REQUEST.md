# Codex Implementation Request — ReDown Semantic Project Access & Forever Works Learning Bridge

**Status:** implementation mandate, NOT an implemented feature.  
**Repository:** `thanks-cohn/remote-download-2-cloudfare` (work on `main` unless instructed otherwise).  
**Upstream standard:** `thanks-cohn/forever-works`.  
**Owner's objective:** Any sufficiently capable authorized agent—including ChatGPT and future agents—must be able to discover, navigate, explain, test and, when independently authorized, safely maintain **every relevant aspect of ReDown**, while reasoning through portable semantic abstractions. Project experience must be exportable to Forever Works as traceable, reviewable lessons. Aim for exceptionally enduring engineering, not a fashionable agent-specific integration.

## Read first; do not erase history

1. ReDown: `AGENTS.md`; `docs/agent/API.md`; `agent/api.mjs`, `agent/catalog.json`; `docs/debug/API.md`, `docs/debug/DESIGN.md`; `agent/debug/api.mjs`, schemas and `debug/manifest.json`; `docs/CODEX_TIMELESS_DEBUGGING_SYSTEM_REQUEST.md`; `docs/SIMPLE_RIGHT_CLICK_MENU_CONTRACT.md`; `bugs/README.md`; relevant tests and fixtures.
2. Forever Works: `docs/STANDARD.md` (normative), `docs/API/PUBLIC_API_V0_1.md`, schemas, fixtures, authority/provenance/compatibility/migration guidance. Fetch and identify precise supported versions and contracts; if upstream unavailable, report the blocker and make no invented compatibility/certification claims.
3. Inspect actual extension code: `extension/options.js`, `extension/options.html`, `extension/background.js`, Nested model/editor, Chrome message handlers, Cloudflare worker/provider operations, Explorer, RFIS/index, transfer lifecycle, tests, build/release/config/permission surfaces. Do not assert coverage for things not inspected.
4. Establish a baseline: node/test commands and existing failures, known stale fixtures, repository architecture, actual data boundaries and missing test/browser capabilities. Record date, commit SHA, environment, evidence and gaps.

## Mission and absolute acceptance

Do not merely write a plan or scaffold. Implement a real, integrated, usable **semantic project access layer** atop—not replacing or silently breaking—the currently frozen ReDown project API 0.1 and debug API/records 0.1. Connect it to a version-aware Forever Works adapter. Deliver a complete **vertical proof**: an unfamiliar agent can discover the API; identify any inventoried capability; navigate from intent/invariant through dependencies, source, runtime behavior and tests; trace linked incidents with provenance and counterevidence; reason about impact; obtain a minimal safe verification plan; and export a reviewable generalizable lesson that is independently compatible with the actual Forever Works model. Where live observability, code edits, browser testing or credentials are unavailable, report that precisely, with a legitimate opt-in adapter plan or implementation rather than claiming full runtime access.

**Full access means full addressability/discoverability of project-owned behavior and artifacts, not unfiltered transfer of private user data, tokens or secrets, nor unapproved mutation.** Separate readonly inspect from scoped observation from explicit execute/mutate authority. Do not give agent API readers unrestricted filesystem, cloud accounts, command execution, or extension permissions by default.

## Design rules — durable for 50+ years

- **First principles:** preserve intent and behavioral contracts independently of languages, filenames, line numbers, packages, providers, transports and agents.
- **Stable semantic IDs:** for project, intent, capability, invariant, operation, state transition, component, interface, dependency, evidence, test, incident, change, outcome, decision and lesson. Source paths/SHAs are *located implementation evidence*, not stable identity. Define deterministic ID/reference resolution, aliases/splits/merges/deprecation and collision/missing-ref rules.
- **Two complementary planes:** (A) a small offline, deterministic, read-only semantic index graph anyone can inspect, and (B) separately authorized runtime/tool adapters for DOM, console, Chrome extension service worker, message exchange, network timing, R2 protocol, IndexedDB, build/test and file/asset state. Never conflate declared capability with verified observation.
- **Progressive disclosure:** summary → semantics → graph → source/test references → scoped runtime observations → raw inspected evidence, with pagination, precise coverage, freshness, timestamps, budgets and source anchors. Large project does not require loading entire repo into model context.
- **Evidence as science:** report → observation → hypothesis and counterhypothesis → repeatable experiment → remediation proposal → execution → test result → installed browser result → generalization. Evidence and authority are orthogonal; unknown or conflicting results are preserved.
- **Append-only causality:** old incidents, counterevidence and conclusions remain auditable; corrections are events, not history rewrites. Use immutable digests, versioned schemas, snapshots and deterministic ordering.
- **Versioned standards, not provider coupling:** canonical UTF-8 JSON/JSONL, schema/conformance artifacts, plain CLI or library API; optional MCP/HTTP/IDE tool adapters are *adapters*, never the normative standard. Unknown optional fields preserved; old decoders/fixtures retained. Do not mutate frozen v0.1 files/contracts just to add operations.
- **Adversarial safety:** distinguish controlled repository artifacts from untrusted webpages/user content; prevent prompt injection from tool results, unsafe filesystem traversal, symlinks/path escapes, oversized/cyclic graphs, private evidence leakage, command injection and forged test/browser claims. Least privilege, explicit opt-in/confirmation, redaction, audit, safe cancellation and dry-run for any action.
- **Replaceability:** prove semantic equivalence across rewritten implementations using contracts, invariants, compatibility fixtures and a replacement evaluation; keep the old representation and auditable migration path. No proprietary service necessary to understand the records.
- **Efficiency:** work acceptably on modest systems (including 4 GB machines); lazy discovery, bounded query responses, cached indexes with freshness checks, incremental file enumeration; no heavy always-on database or telemetry prerequisite. A genuinely open plain-text human inspection path must remain.
- **Authentic coverage:** cover all relevant project strata (product requirements, source, docs, dependencies, configuration, assets, tests, persistence, runtime lifecycle, Chrome context menus/DOM/worker, R2/network, permissions, CI/build/release and incidents), with explicit inventory and `covered / partial / unavailable` per stratum. No misleading “100%” claims.

## Incremental implementation milestones

### M0 — Grounding, audit and coverage map

Create a documented inventory of components, entry points, cross-component calls, state/persistence, operations/permissions, source/test evidence and known unknowns. Compare both existing APIs and normative Forever Works contracts. List what cannot be seen offline and proposed authorized instrumentation. Record baseline commands/results; separate existing failing tests from new regressions.

### M1 — Semantic graph format and real reader

Introduce a **new versioned semantic graph/index** (do not change frozen v0.1 debug/project APIs). Store a small, real, human-readable model with stable IDs for a representative cross-section, schema, bidirectional edges (intent→capability→invariant→implementation→test→incident and reverse), relationship types, provenance, freshness/coverage and conflict semantics. Cover at least actual Simple right-click behavior, Upload from Computer (bucket→immediate children, selection-vs-create), Nested editor, and transfer pipeline, with exact source references. Add deterministic validation for unique IDs, relationship endpoints, dangling references, source scope, cycles, privacy and format version. Source changes should cause stale evidence warnings rather than silently proving success.

### M2 — Agent-readable semantic queries

Create an offline Node library and CLI (standard output structured JSON and human text; safe queries, deterministic errors, limited memory). Implement and document:
- `describe` / `projectOverview` / `listEntities`
- `describeEntity(id, depth?)` — purpose, semantics, preconditions, invariants, location/implementation evidence, known limits and authority
- `traceDependencies(id, direction?, depth?)` — typed directed impact/dependency edges and provenance, bounded/cycle-safe
- `traceEvidence(id, filters?)` — supporting and contradicting links, current vs stale and proof scopes
- `explainChangeImpact(changedFilesOrEntities)` — *possible* affected capabilities, edge rationale, suggested tests; label uncertainty, no invented correctness proof
- `getCoverage` / `validateSemanticGraph` — full map of what is and is not addressable.
- `exportLesson(id)` — **reviewable proposal** with stable source references, evidence/counterevidence, applicability, limits, origin and no authority promotion.

Use a central discovery contract so future agents do not guess operations. Namespace the new API separately and specify version negotiation. Provide a deterministic CLI transcript in docs.

### M3 — Integration with debug history and Forever Works

Resolve semantic entities to `DBG-001`, `DBG-002`, `DBG-003` and any later canonical cases *where genuinely relevant*. Preserve exact event IDs/provenance, avoid treating commit as passing test. Create a clear bridge translating the **relevant accepted fields** to existing Forever Works intent/capability/invariant/dependency/evidence/decision/implementation kinds. Do not invent new normative kinds or treat ReDown's graph as upstream authority. Bridge must say `proposed` until explicitly reviewed/accepted; acceptance is a distinct action outside ordinary export. Use actual Forever Works validators/fixtures (and, if modification to upstream is needed, open a separate proposed change; do not silently write upstream or claim conformance). Produce one real exported learning artifact from the bucket-switching async state ownership defect: request-context freshness, where it applies, where it doesn't, supporting and contradicting evidence and how another project might reuse it.

### M4 — Test, inspect, repair loop

Implement at least one coherent *non-destructive* agent workflow, dry-run first: query capability, trace code/test links, formulate competing explanations, generate/replay a deterministic sanitized reproduction, locate a scoped candidate patch, execute only explicitly approved local tests, collect honest outcomes, and produce a report that does not declare closure before evidence. Integrate with existing commands rather than exposing a shell arbitrary-execution API. For Chrome/DOM verification, use an **opt-in** test harness/observation adapter which can inspect real user-visible state where allowed, with no browser-token extraction; if actual installed-Chrome testing is impossible in the environment, provide reproducible local manual steps plus a concrete harness and keep `browser-unverified` visible.

### M5 — Migration and replacement proof

Archive versioned golden fixtures, complete examples, invalid/hostile fixtures, portability tests, replacement implementation equivalence and migration notes. Ensure an agent on a clean checkout can obtain the documented answers *offline* in bounded time, validate old formats, and understand records without a model vendor. Document upgrade/rollback and failure behavior under missing/upgraded adapters.

## Hard acceptance demonstration (required)

Using the **real ReDown Upload from Computer bucket isolation bug**, demonstrate in one repeatable documented session that a cold agent can:

1. Discover model/API/versions and `covered/partial/unknown` areas, and find `redown.upload.destination.selection` or the actual designated stable ID without being handed implementation filenames.
2. Read its intent and invariants (“only selected bucket's immediate children”; “existing-folder selection does not populate creation draft”; “stale asynchronous requests cannot overwrite the current bucket”).
3. Trace to the current exact code, state changes, background message handlers, tests, relevant bug/incident IDs and evidence digests.
4. Explain a plausible race or defect with supporting/counterevidence and scoped uncertainty; identify impact and regression targets.
5. Run a deterministic safe reproduction and targeted tests in a permitted environment, store command/result/environment/proof scope or explicit inability to run.
6. Export a portable **Forever Works lesson proposal**, demonstrate independent compatibility validation on actual upstream standard (or mark export blocked by upstream incompatibility), and keep review/acceptance status explicit.
7. Repeat the basic inspection for a second capability (Simple right-click flat popup and label fallback) to prove the graph is not hardcoded to one bug.
8. Produce a full project coverage report and honest list of still-uninspectable surfaces, plus permission-gated plans to close those gaps. A complete finite inventory matters more than a false claim that literally everything is solved.

## Testing matrix

- Pure API shape, deterministic results, exact IDs and sorted output; pagination/limits and unknown operations.
- Missing references, renamed/moved files, stale hashes, cycles and graph depth; inference vs authoritative evidence, conflict/counterevidence.
- Schema conformance and backward compatible/unknown-field preservation; independent Forever Works validation.
- Unsafe paths, large data, secret-like contents, forged evidence, malicious prompts as data, unauthorized execution attempts.
- Same semantic ID after a simulated rewrite and fixture migration; ability to audit transformations.
- Existing project/debug/API and extension tests remain discoverable and unaffected; record pre-existing failures and only attribute new failures when proven.
- Privacy/consent boundary across source, logs, browser observation, credentials, R2 and runtime state.
- Installed Chrome manual/automated checks explicitly distinguished from static test success.

## Deliverables and handoff

- A working new module, schemas, normalized example model, versioned fixtures, CLI/lib entry points and tests, all discoverable in `docs/agent/` (or clearly justified directory structure).
- Cross-component coverage report with known blind spots; documented semantic IDs and source ownership.
- Real causal links to debug event journal and a reviewable, independently validated Forever Works lesson proposal.
- `docs/CODEX_SEMANTIC_PROJECT_ACCESS_IMPLEMENTATION_REPORT.md` with exact files/SHAs, API examples, commands executed, pass/fail counts, coverage, limitations, permission boundaries, conformance results and next steps.
- Updated `AGENTS.md`, `docs/agent/API.md`, `docs/debug/API.md` and relevant navigation links **without rewriting older historical facts**; note which APIs are frozen and which are new.
- Source and verification changes grouped into reviewable commits; default to main-only per user workflow but do not self-merge PRs or deploy without explicit authorization. Record branch/commit and whether CI/browser was observed.

## Conditions for saying “any agent can fully access ReDown”

Only make that claim with qualifiers and evidence: all project-owned components and behaviors must be represented and navigable in a validated coverage inventory; the offline semantic graph must be independently queryable by an unfamiliar agent; source, test, build, docs, dependency and incident references must resolve; live DOM/worker/network/browser stores and Cloudflare interactions need functioning *authorized* adapters or an explicit marked gap. “Full” cannot mean bypassing permissions, reading private credentials, assuming missing evidence, running arbitrary tools, or claiming user-visible behavior from code alone. If the acceptance bar remains incomplete, ship the useful vertical slice, report exact gaps, then continue incrementally—not a triumphalist scaffold.

**One sentence to guide every engineering decision:** ReDown's particular mechanisms should be replaceable; its purposes, contracts, proven experience and accumulated knowledge should survive.
