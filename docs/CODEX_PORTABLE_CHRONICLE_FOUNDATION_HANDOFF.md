# CODEX handoff — Portable Chronicle foundation (2026-10-12)

## Owner goal
Build timeless, inspectable, comprehensible Redown metadata provenance and recall without burdening transfers. Favor the five fundamentals (identity, location, event, evidence, region) over a speculative universal framework. Preserve the user-designated best-current baseline.

## What is committed
- `packages/content-chronicle/index.mjs`: pure ESM metadata model; URLs separated by role; query/fragments redacted; recording/status differentiated from integrity; bounded JSON/JSONL import/export; cheap lookup.
- `tests/content-chronicle.test.mjs`: four focused tests for redaction, matching hints, interchange and invalid input rejection.
- `packages/content-chronicle/README.md`: invariants, limitations and future architecture.
- `contracts/content-provenance/v1.schema.json`: earlier richer proposed source-provenance schema; currently separate from this minimal chronicle event contract.
- `docs/proposals/REDOWN_REGIONAL_CONTENT_INTELLIGENCE_AND_SAFE_DEDUPLICATION.md`: owner decisions and addenda A–D.
- `docs/checkpoints/REDOWN_BEST_CURRENT_2026-10-12.md`: protected behavior baseline.

**No transfer, Chrome, R2, Windows companion, IndexedDB or remote upload runtime has been modified in this foundation. Nothing here deletes physical files.**

## Verification honesty
These files were authored and committed through the GitHub connector. An attempt to retrieve the files into the isolated local test container through GitHub raw HTTP failed due to DNS/network unavailability. **The new tests have NOT been executed in this session.** First Codex step: run `node --test tests/content-chronicle.test.mjs` in a real checkout. Fix actual failures without weakening assertions; inspect the entire project baseline separately. The project's historical suite contains baseline failures; don't claim it green.

## Codex immediate checklist
1. Inspect the exact committed core and tests; run targeted tests and `npm run check`; inspect project/semantic/debug APIs read-only.
2. Harmonize the minimal chronicle event contract with the existing proposed `contracts/content-provenance/v1.schema.json`. Publish one explicit validated record shape or clearly versioned projections plus fixtures and schema conformance tests; retain backwards compatibility.
3. Add a small, durable journal adapter that writes bounded event batches off the download-critical path. Avoid unbounded buffering, browser eviction claims, and silent loss. Failure must not change transfer outcomes. Document what happens under quota, worker termination, and backpressure.
4. Add disposable IndexedDB projection with atomic import/revision, fast index on normalized containing URL and hint fields, safe migration/roundtrip with Node and another browser runtime. Do not bind the domain model to IndexedDB.
5. Build optional R2 history archive/restore with explicit opt-in and destination prefix, versioned immutable generations, verified latest pointer, redaction and conflict checks. R2 backup failures never stall downloads.
6. Integrate into Hitomi right-click and generic transfers at cheap event-capture points. Distinguish page URL, clicked action, metadata endpoint, dynamic asset URLs, final R2 location, title, filename, type and observed size. Preserve existing gallery capture and 64 MiB guard; do not turn a gallery URL into an HTML file upload.
7. Investigate and implement native Windows companion by studying *actual* Chute v2.6.1 RC1 code and release. Persist local files and journal outside Chrome caches; remember native work pauses on shutdown. Independently remote work needs a powered remote host.
8. Only after strong evidence and region-specific explicit authorization, implement safe duplicate consolidation/deletion as a separate milestone. A matching URL/title/size is NOT deletion proof.
9. Inspect Forever Works actual pinned schema/version/validator before proposing interoperability. Prefer a read-only semantic mapping and conformance tests; never invent standardized guarantees.
10. Report exact tests, real Chrome/R2 acceptance gaps, security/privacy, crash recovery and rollback. Preserve commits and handoff if remote write/merge not authorized.

## Critical corner cases worth checking immediately
- `capture` currently omits a native “clicked action without URL” object; add explicitly, without inventing a clicked URL.
- The minimal snapshot format is bounded and in-memory, not a streaming or durable implementation.
- URL query stripping can collapse legitimate source identity; keep site ID or a deliberately approved normalized identifier without retaining sensitive signed query values.
- The small `lookup` is O(n) and validates each event; appropriate for v0 test fixtures, but use an IndexedDB index or a prebuilt map at scale.
- The helper must never delete the actual user original or trigger cleanup based on restored/offline records.
- Domain input validation and output escaping are separate concerns: never interpret historical URLs, titles or filenames as executable instructions.

## Acceptance target
After clearing Chrome data, a persisted local journal or independently verified R2 history archive can restore the same cheap events; another browser/plain JS implementation reads them; transient metadata failures do not break a working transfer; unverified bytes are never claimed as identical; user-selected region cleanup is absent or blocked until actual independent validation.

This handoff is grounded in current code, not a promise that its planned integrations exist.
