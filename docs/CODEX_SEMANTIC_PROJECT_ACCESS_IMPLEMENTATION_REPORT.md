# ReDown semantic project access implementation report

**Recorded:** 2026-10-11, America/Chicago (execution artifacts retain actual UTC timestamps).  
**ReDown baseline:** `bcbbe10452773ad5e2794f99e66a39de0d1cef69`, current main fetched before work.  
**Branch:** `main`; runtime correction commit `949a5dc`; framework/source evidence is committed with this report.  
**Forever Works baseline:** `230c67fa7e27577c53b6f7895df442a2ab24e4cb`.  
**Environment:** Linux x64, Node `v24.19.0`, jsdom 26; local checkout and sanitized fixtures. CI, installed Chrome, live R2 and deployment were not observed.

A working independently versioned semantic framework now provides discovery, entity/contract navigation, bidirectional dependency tracing, source/debug evidence, conservative change impact, public artifact coverage, dry-run verification plans and portable learning proposals. The documented cold-agent session was executed through the real CLI. A scoped Upload child-cache defect was reproduced and corrected, with new regression tests. This is a functional local framework, not merely a schema or planned adapter.

**The absolute full live-access bar is not met.** Runtime worker/network/R2/IndexedDB adapters are unavailable, installed Chrome is unverified, and current published Forever schemas reject the documented version. These gaps are explicit in discovery, coverage, export and workflow results. No accepted ReDown Forever model or fully conformant baseline export is claimed.

## Implementation and milestone status

| Milestone | Delivered and verified | Remaining limit |
| --- | --- | --- |
| M0 | Actual-main audit, finite public artifact inventory and semantic ownership, 14 strata, baseline results, old API/upstream boundaries | Inventory addressability does not mean every internal behavior/call is reviewed |
| M1 | Schema 0.1, 110 stable entities, 129 typed edges, provenance, source anchors/digests, reverse adjacency, alias/collision/cycle/privacy validation | Initial semantic intent is proposed; no human acceptance inferred |
| M2 | All 11 requested inspection operations, bounded Node library/CLI, deterministic ordering, pagination, freshness, errors and working examples | Curated graph can over/underestimate possible impact; no universal correctness proof |
| M3 | Real debug API integration for DBG-001/002/003 and exact event/provenance links; real lesson manifest/file map; actual upstream reference validation | Published-schema compatibility is blocked; separate draft PR #5 is unmerged |
| M4 | Dry-run-first fixed-command workflow, competing hypotheses, current-source sanitized reproduction, scoped patch, local test outcomes and append-only history; concrete consent-gated DOM count observer | Installed Chrome/live R2 unavailable; counts cannot establish bucket identity or remote truth; no general patch executor |
| M5 | Archived graph/golden/hostile fixtures, frozen-file/prefix proof, optional-field preservation, auditable normalization, independent reader replacement equivalence and conservative upstream replacement evaluation | Proof is bounded to fixture corpus; no production UI rewrite, physical 4 GB benchmark or fleet trial |

The index lists **165 public artifacts** with semantic owners, including shipped source/assets, docs, schemas, dependencies/configuration/build surfaces, tests, incidents and proof artifacts. Twelve strata are partial and two are unavailable. No false “100%” or “every runtime surface solved” claim is made. See [full coverage and authorized next observations](agent/semantic/COVERAGE.md).

## Concrete files and contracts

- `agent/semantic/api.mjs`, `cli.mjs`, `io.mjs`, `schema.mjs`, `model.json`, `schemas/0.1/graph.schema.json` and `result.schema.json`: new bounded `redown.semantic` reader, discovery and graph contract. No extension code executes during queries.
- `bridge.mjs`, `validate-forever.mjs`, `vendor/forever-works-0.1/`: proposed actual-kind projection and the unmodified pinned MIT upstream JavaScript reference/schemas. `UPSTREAM.json` records exact original paths/digests.
- `workflow.mjs`, `reproduction.mjs`, `observer.mjs`: separate execution/observation plane. Fixed local fixtures, no shell or caller-supplied commands; opt-in DOM counts, no credentials/store reads.
- `migration.mjs`, `inventory.mjs`, `examples.mjs`: original-byte-retaining normalization, explicit public path inventory maintenance, and working offline library examples.
- `tests/semantic-api.test.mjs`, `semantic-replacement.test.mjs`, `semantic-schema-conformance.py`, `fixtures/semantic/0.1/`: shape, traversal, evidence, safety, versioning, replacement and independent schema proof.
- `extension/options.js` and `tests/upload-request-context.test.mjs`: scoped request-ownership correction and three new regressions, preserving message/permission contracts.
- `debug/cases/DBG-003.events.jsonl`: three new events appended; original prefix and every other journal retained.
- `AGENTS.md`, `docs/agent/API.md`, `docs/debug/API.md`, `docs/agent/FOREVER_WORKS_COMPATIBILITY.md` and `docs/agent/semantic/`: new navigation and exact limits appended without rewriting old reports.

[Implementation file digests](agent/semantic/verification/implementation-files.json) give SHA-256 for changed implementation/evidence files, excluding that manifest itself. [Frozen contract digests](../tests/fixtures/semantic/0.1/frozen-contracts.json) prove the project API/catalog/CLI, debug API/CLI/schemas, archived debug fixtures and original journal prefixes remain byte-identical to the baseline. Existing v0.1 catalog/debug freshness warnings remain visible; their hashes were not refreshed to hide drift. No test assertion was disabled or weakened.

## Upload defect, remediation and evidence

Before correction, the executed current-source fixture held an alpha child request, switched to beta and released the old result. The shared cache became `["videos", "images/old-alpha-child"]` although the current root dropdown still displayed beta choices. A DOM-only assertion would miss the contaminated cache. [Before-result artifact](agent/semantic/verification/child-race-before.json) preserves this counterexample. Root listing generation checks already existed, which limits the broader hypothesis that all chooser requests lacked ownership.

`fetchUploadBuilderChildren` now captures generation/account/bucket before awaiting and checks both active ownership and actual current target before writing shared prefixes. `materializeUploadBuilderPrefix` and the continuation handler reject obsolete post-await view updates. This prevents old creation completion from changing the new bucket's cache, rows or hint. It does not undo an already authorized remote request or prove R2 truth.

Three new tests cover child cache completion, delayed profile preparation and delayed creation completion across a bucket switch. The existing immediate-child, separate-draft and root-response tests remain unchanged. Ten Upload/Simple fixtures passed in the explicit workflow. The journal retains original report/investigation/remediation/browser-pending events and appends `DBG-003.child-cache-reproduced`, `DBG-003.child-cache-guard` and `DBG-003.local-fixture-verification`. Closure remains open. Current node/event queries preserve original authored provenance and counterevidence; record validation checks structure, not independent authenticity of claimed historical observations.

A separate Simple menu investigation found a source/document conflict: bucket/deepest preferences can override explicit labels in current source/tests, while the owner document gives explicit labels precedence. `redown.evidence.simple-label-conflict` is a contradicting edge. This was not silently “fixed” or removed from tests. DBG-001's distinct Nested disabled-state diagnosis also remains open.

## Executed verification

The exact commands, exit codes, environment, counts, unchanged failing-test names and artifacts are in [verification-summary.json](agent/semantic/verification/verification-summary.json).

| Command/check actually performed | Result |
| --- | --- |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | Installed dependencies successfully |
| Baseline `npm run check` | Passed existing syntax checks |
| Baseline `npm test` | 84 tests: 65 pass, 19 fail |
| Final `npm run check` | Exit 0; existing syntax checks pass |
| Final `npm test` | Exit 1; 114 tests: 95 pass, **the same 19 fail** |
| `node --test --test-isolation=none --test-reporter=tap tests/semantic-api.test.mjs tests/semantic-replacement.test.mjs` | Exit 0; 27 pass, 0 fail |
| Three new Upload tests plus existing Upload/Simple tests | 10 pass, 0 fail; fixed local workflow exit 0 |
| `python tests/semantic-schema-conformance.py` | Semantic graph/archived graph/result envelopes valid; detects 19 actual upstream version-pattern errors and explicitly reports incompatible baseline export |
| `python tests/debug-schema-conformance.py` | 5 frozen schemas valid; 41 record/result/constraint checks pass |
| `validateSemanticGraph` | Valid, 110 entities, 129 edges, 165 artifacts; no errors/warnings in final snapshot |
| `validateDebugRecords` | Valid, 3 cases, 20 events; 16 pre-existing stale-reference warnings retained |
| Executed read-only CLI acceptance session | 14 commands succeed; outputs equal working library example |
| Actual baseline Forever JavaScript suite including conformance/package consumer | 20 pass, 0 fail with workspace npm cache |
| Proposed upstream schema correction suite | 21 pass, 0 fail; 72 records independently validate against proposed schemas |

All **30 added tests pass**. The final failure-name set exactly matches the baseline: existing stale inspection assertions, OAuth fixtures, stale historical-debug assumptions and a settings fixture missing a DOM control. The full suite is **not green**. This evidence supports no new failures in the executed suite; it does not prove absence of every possible regression.

An initial upstream consumer run failed because npm's default home cache directory was unavailable; rerunning with `npm_config_cache=/workspace/.npm-cache` passed. A restricted executor initially prevented subprocess launches; checks needing subprocesses were rerun in the permitted execution context. These were environment failures, not tests suppressed or described as passes. Initial semantic checks also caught stale evidence/incomplete inventory while files were being added; final reviewed digests and complete inventory were validated again.

Browser testing, Cloudflare/R2 calls, production writes/deployment, CI observation, Windows execution and physical low-memory benchmarking were **not performed**.

## Forever Works result and separate proposed correction

The export uses only actual v0.1 kinds. A lesson is a decision proposal, not a new normative `lesson` kind. Initial projections remain `agent-proposed/unreviewed`; accepted intent is never fabricated. Unsupported project kinds and unclassified dependency policy are visibly omitted from normative projection and retained through source/edge extensions where relevant.

[Actual reference validation](agent/semantic/verification/forever-reference-validation.json) passes. [Independent published-schema validation](agent/semantic/verification/forever-published-schema-validation.json) fails: the baseline schemas' overescaped `foreverVersion` regex rejects `0.1`, including their own documented examples. All 19 exported record failures are on that version pattern. Export therefore says `blocked-by-published-schema`, despite library validation succeeding. The regression script's exit 0 means it verified this disagreement, **not** that upstream conformance passed.

As required by the mandate, a separate proposed correction was committed to `fix/schema-version-pattern-redown` at `177c15ce3ede0f20fd16262c533db096c6875f86` and opened as [Forever Works draft PR #5](https://github.com/thanks-cohn/forever-works/pull/5). It fixes ten schema patterns, adds a JavaScript regression and updates the official API reference. Its proposed schemas independently validate 72 records. No upstream main change, merge or deployment was performed. ReDown still vendors the original pin and reports its actual failure; accepting/re-pinning the reviewed upstream correction is a later explicit change.

## Entry points and permission boundaries

```sh
node agent/semantic/cli.mjs describe --json
node agent/semantic/cli.mjs listEntities --input '{"kind":"capability"}' --json
node agent/semantic/cli.mjs describeEntity --input '{"id":"redown.upload.destination.selection","depth":2,"limit":100}' --json
node agent/semantic/cli.mjs traceEvidence --input '{"id":"redown.incident.dbg-003","depth":1}' --json
node agent/semantic/cli.mjs describeEntity --input '{"id":"redown.simple.menu.flat","depth":2}' --json
node agent/semantic/cli.mjs exportLesson --input '{"id":"redown.lesson.request-context-freshness"}' --json
node agent/semantic/examples.mjs
node agent/semantic/workflow.mjs
# Only under separately authorized local test execution:
node agent/semantic/workflow.mjs --execute-local-tests
```

Inspection is read-only and cannot execute source, shell commands, messages or network requests. Referenced commands are navigation, not permission. Runtime observation and local execution use separate opt-in scopes. Test execution is trusted repository code and must be independently authorized; this user request authorized the tests performed here. The observer returns DOM structure counts only and requires `observe-dom-counts` consent. It has not been run on installed Chrome.

Source path traversal, root escapes, internal symlinks into excluded credential paths, unlisted sources, oversized models/responses/caches and forged top-level proof labels are rejected or visibly bounded. Output strings and repository narratives are explicitly untrusted data. Privacy pattern detection is a tripwire, not a PII guarantee. No credential values, browser-private stores, customer filenames/contents or production observations were collected.

## Handoff and next steps

1. Review the upstream draft; after acceptance, add a separately pinned compatible adapter snapshot and rerun both validation layers. Do not relabel the current failure as success.
2. Follow the [reproducible Chrome checklist and count observer](agent/semantic/ACCEPTANCE.md) in an explicitly authorized test account/profile. Append sanitized browser/R2 evidence before considering incident closure.
3. Resolve Simple label-policy conflict with the owner; reproduce DBG-001 independently; repair the 19 pre-existing failing fixtures/product defects without rewriting historical proof.
4. Incrementally expand semantic call/contract coverage and add independently scoped worker/network/IndexedDB/R2 adapters. Preparation/deployment and writes need separate explicit mutation authority.
5. Retain released fixtures/original bytes, use auditable opt-in normalization, validate new inventory/digests after source review, and keep replacement/runtime uncertainty visible.

The mechanisms are replaceable; the current purposes, obligations, source-backed observations and proposed learning now have portable, independently queryable identities. Full runtime access still requires the explicitly recorded adapters, permissions and evidence.
