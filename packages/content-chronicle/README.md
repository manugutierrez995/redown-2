# Portable Redown Content Chronicle — foundation v0.1

This is a **small, pure JavaScript metadata-only foundation**, not a new download engine, IndexedDB implementation, Windows service, R2 backup, or deletion feature. No Chrome, network, filesystem, cloud or database dependencies. It deliberately does not participate in existing Redown transfer execution.

## Purpose and core boundaries
Record cheap observations independently of the file-byte path: a containing page (`overUrl`), title, differentiated observed URLs (click/metadata/asset/redirect), filename, observed size and MIME type, destination and event status. Each download action has a separate immutable event ID. A matching URL/name/size is **only a recognition hint**. Unknown hash or failed verification does not prevent transfer; this module cannot initiate, prevent or clean up transfers.

`capture(input)` constructs and validates a redacted event; `lookup(events,{overUrl,filename,size})` returns possible matches and event count; `exportSnapshot`/`importSnapshot`, `toJSONL`/`fromJSONL` move events between runtimes. The current interfaces operate on bounded in-memory lists. Do not misrepresent these as durable streaming implementations.

Privacy: URL query and fragment are **always removed** in exported references because signed secrets may use unpredictable parameter names. This sacrifices some identifier granularity; future site-specific canonicalization may preserve explicitly approved safe identifiers. All private/credential-bearing URLs are rejected. These records must still be treated as potentially sensitive browsing history; do not send to R2 without explicit opt-in. No physical deletion, deduplication, external fetch, or hash verification exists here.

Bounds: at most 256 references per event, 100k events and 50 MB per imported snapshot/journal; malformed or incomplete JSONL fails closed. These are safe starting bounds, not large-history architecture. Callers must catch recording failures separately from transfers and can generate recording-gap events in an outer durable journal. This core intentionally has **no browser write side effects**, so it cannot stall transfer execution unless a caller incorrectly places it on the transfer-critical path.

## Design invariants for Codex
- Protect favored baseline `4a727792a1cd622e197da9b06c9144a673317448`; do not alter working Redown paths without regression tests.
- Extend this thin core with a **durable append/outbox adapter**, then atomic IndexedDB projection; JSON snapshot and segmented JSONL history remain the portable interchange, not the database authority.
- Keep file bytes and native job journals in a persistent directory outside browser temporary storage. Backup versioned history to R2 only with explicit consent and isolated prefix, verified generation and restore tests.
- Retain a separate restricted execution record for short-lived signed URLs. Do not leak credentials, query tokens or private paths through portable exports.
- Reuse the existing `contracts/content-provenance/v1.schema.json` as a related *proposed richer source record*, not an assertion that this slim chronicle event validates as that schema. Decide on versioned schema unification before calling either production-ready.
- For JSONL scale, add incremental parser and file-backed bounded writer with crash-safe tail handling; never silently discard old events or claim guaranteed durability from browser memory.
- Preserve the existing remote executor's strict verified claims; separate download outcome, recorder outcome and hash assurance. Only explicit region policy plus independently proven equivalence can authorize cleanup.

## Verify
`node --test tests/content-chronicle.test.mjs`

## Next work
See `docs/proposals/REDOWN_REGIONAL_CONTENT_INTELLIGENCE_AND_SAFE_DEDUPLICATION.md` addenda A–D. Implement an adapter with no changes to the existing transfer critical path first; prove browser/Node snapshot roundtrip, overflow isolation, restart recovery, R2 history backup, and then native companion. Before optional Forever Works alignment, inspect its *actual* published schemas and validator; do not invent compliance.
