# REDOWN Proposal — Regional Content Intelligence and Durable Deduplication
**Status:** Proposed; no implementation or deletion is authorized by this document.  
**Owner direction:** Dependable, inspectable, understandable, portable architecture that knows *what is stored, where, why, and with what evidence*, without accumulating needless identical physical copies.  
**Baseline to protect:** `docs/checkpoints/REDOWN_BEST_CURRENT_2026-10-12.md` (favored behavior pinned to `4a727792a1cd622e197da9b06c9144a673317448`).

## 1. Desired experience
Redown should let a user download/export a structured snapshot of a Cloudflare R2 account or selected **deduplication region** (account + bucket + managed prefix set). A future Redown installation can import that snapshot, ingest it directly into IndexedDB, and instantly search its known catalog. It should understand source URLs and filenames, distinguish one byte-identical content identity from many download attempts or requested paths, and answer **“Has this been downloaded already? How many times? Where is the retained original? How certain are we?”**

The snapshot is portable cache/evidence, **never an unconditional assertion of current R2 truth**. Exported JSON/JSONL should support lossless migrations, safe incremental refresh, offline browsing and controlled editing (with explicit reconciliation before remote side effects). Redown shall build and maintain a durable *semantic slice* of the account that lets users and agents understand **what is what**: accounts, buckets, regions, objects, identities, aliases, source occurrences, transfers, relationships, evidence, unresolved conflicts, and cleanup actions.

A download may proceed even if an identical object exists. After verifying its bytes, Redown records an additional occurrence (“Downloaded twice more; verified copy already exists at …”), retains the canonical object, and—under explicit region policy—removes safe redundant **managed** copies. Deduplication never erases history.

## 2. Principles
1. **Identity is not location.** Content digest+length is distinct from object key, filename, source URL, and event ID. A same filename, URL, size, ETag, or cached claim is not conclusive content equality. SHA-256 of the same exact bytes gives high-confidence identity; record the hash computation and observation method.
2. **Region is an authority boundary.** Users configure managed account/bucket/prefix regions, permitted file categories, policies and exclusions. No global account sweep, cross-region consolidation or remote deletion absent expressly scoped authorization. A region may cover multiple prefixes, but overlapping scopes require deterministic ownership/conflict handling.
3. **Preserve all observations.** Append-only occurrence and operation events; separate object inventory from historical attempts. A canonical object may represent 20 downloads, 19 verified duplicates and several distinct requested logical paths.
4. **Single authority, many views.** Authoritative durable transactional catalog on the responsible executor/service; versioned portable snapshot and browser IndexedDB are replaceable projections, not synchronized competing sources of truth. If offline edits are accepted, treat them as proposed changes with revision/preconditions and explicit validated reconciliation—not blind upload over newer catalog.
5. **Evidence before claims, stronger evidence before deletion.** Distinguish indexed, probable match, remotely observed, fully verified, duplicate verified, uncertain, quarantined and removed. Unknown is not absent.
6. **Portable by construction.** Canonical UTF-8 JSON Schema; compact JSON snapshots and streaming JSONL exports with stable IDs, explicit versions, migrations, checksums, paging and source provenance. No proprietary classes required for import. Credentials/private URLs are excluded or redacted by default.
7. **Agents inspect; they don't implicitly control.** Read-only semantic APIs reveal provenance, ownership, relations, freshness and safe candidates. Mutation/cleanup require separate explicit scoped authority and audit events.
8. **Protect the best-current working Redown.** Start additive/feature-gated; preserve Hitomi browser-assisted, local uploads, remote engine, explorer and context menus. No cleanup until full verification and opt-in.

## 3. Canonical graph and normalized model
Entities (stable IDs, schema-versioned):
- `account` — provider/account identity; credential references never exported.
- `bucket` — account-scoped remote bucket.
- `region` — exact included prefixes and exclusions, category policies, authority/retention rules, snapshot revision.
- `object` — account/bucket/key, current provider metadata (size, ETag, timestamp, version/generation where available), last observed time, current existence status.
- `content` — algorithm + digest + exact byte length, trust/evidence status; optionally media sniff/mime and verified classification.
- `locationAlias` — expected logical path/reference to retained content; does **not** imply R2 transparently redirects old keys.
- `source` — normalized, privacy-protected provenance (URLs optional/redacted) and confidence.
- `transfer` — existing transfer ledger job ID; outcomes and verification references.
- `occurrence` — immutable event saying user requested or completed another download; timestamps and actor.
- `evidence` — how identity, remote existence or integrity were established; observed vs inferred, freshness, hash, source, scope.
- `operation` — proposed/approved/attempted/reconciled mutation; deletion proof and audit trail.
- `conflict` — simultaneous writes, snapshot drift, wrong-key, same-name/different-bytes or uncertain outcome.

Typed edges: region contains object; object has content identity; occurrence arose from source/transfer; alias points to canonical object; verification supports claim; candidate conflicts with observed state; operation supersedes/reconciles another. Links carry provenance and no invented certainty.

Preserve account/bucket/key as exact structured fields, never conflated with category or display name. A region **category/type filter** limits eligible objects but is **not** the definition of duplicate: two distinct ZIP contents both remain.

## 4. Schema and example (illustrative, not yet implemented)
Canonical export format must be validated by a committed JSON Schema and independent validator. Prefer `manifest.json` with `format`, `schemaVersion`, `snapshotId`, `generatedAt`, `authority`, `revision`, `scope`, `completeness`, `pagination`, `checksums`, `entityCounts`, plus streaming companion files `objects.jsonl`, `contents.jsonl`, `occurrences.jsonl`, `events.jsonl`, `edges.jsonl` if the catalog is large.

Example:
```json
{
  "format": "redown-region-snapshot",
  "schemaVersion": 1,
  "snapshotId": "snapshot-example-001",
  "generatedAt": "2026-10-12T00:00:00Z",
  "authority": "cache-of-observations",
  "revision": 12,
  "scope": {"provider":"cloudflare-r2","accountId":"redacted-account","bucket":"archive","regionId":"art-archive","prefixes":["artwork/"]},
  "completeness": {"inventory":"partial","reason":"illustrative-example"},
  "contents": [{"contentId":"sha256:example","algorithm":"sha256","digest":"example-not-a-real-digest","size":52428800}],
  "objects": [{"objectId":"obj-example","key":"artwork/Artist-801.zip","contentId":"sha256:example","verification":"example-unverified"}],
  "occurrences": [{"eventId":"event-example","contentId":"sha256:example","kind":"download-observed","timestamp":"2026-10-12T00:00:00Z"}]
}
```
This deliberately nonvalid digest is illustrative only; production fixtures use real correct digests, canonical IDs and valid schemas. Do not mistake `completeness: partial` for account-wide inventory. Provide a precise, bounded meaning for “full breadth”: all pages scanned, permissions covered, indexed as-of time, with exclusions and unresolved gaps exposed. R2 listing alone supplies object metadata, **not** trustworthy whole-content digests for all existing files.

## 5. IndexedDB design and synchronization
Use normalized stores: `snapshots`, `regions`, `objects`, `contents`, `occurrences`, `aliases`, `edges`, `evidence`, `operations`, `conflicts`, `syncCursors`. Key identities and unique indexes; key by account/bucket/key for current object state, digest+length for content, event ID for occurrences; index region, status, source identity, last observed and revision. Never infer equal content from matching filenames. Import in bounded batches under transactions with validation and atomic activation of complete snapshot revisions; interrupted imports do not expose a misleading “complete” view. Version upgrade must retain unknown fields and history or explicitly reject incompatibility. Support offline query immediately after import; stale/partial flags are visible everywhere. On reconnect, inventory via bounded R2 pagination plus mutation/event replay/reconciliation; concurrent workers use leases/transactions/fencing and source version preconditions. Source/provider APIs remain authoritative for current objects.

Provide explicit mutation proposals for local cache edits, display labels, region policies and aliases. Only authorized reconciler applies remote changes after conflict checking; never treat editing JSON/IndexedDB as authorization to delete R2 data.

## 6. Deduplication algorithm and deletion safety
1. User picks/creates a region with one-copy policy and explicit exclusions; region defaults to **observe-only**.
2. Ingest target object to staging or intended destination (respect user's choice to always download); record immutable request/attempt event and compute digest while streaming.
3. Query the regional catalog for candidate by exact digest+length. Revalidate candidate canonical object by independent trusted evidence/readback, current remote identity and location.
4. Choose canonical deterministically and conservatively: owner-pinned candidate first, else oldest verified extant protected object under region policy. A recently modified or outside-region object cannot silently become canonical.
5. Append another occurrence even if the new object is identical. Expose `duplicateCount`, original locator, all attempts and verified evidence. Preserve what was requested even if extra bytes are discarded.
6. Before remote deletion, require explicit region-level cleanup authorization and a reviewable per-object plan, stable object-version conditional deletion (or fail closed where no safe precondition exists), zero unresolved external references/retention holds, independently checked strong equivalence, final canonical existence and relevant digest, and crash-safe operation journal. If aliases are not transparent to external consumers, warn that former R2 keys may stop working; “catalog aliases” alone do not preserve physical paths.
7. Delete only an eligible redundant **managed** object after these preconditions; do not delete a user-local original. Native temporary local cleanup is a separate authorized process with its own file identity/checksum/time-of-check protections. No remote service may delete arbitrary user files.
8. Log result as `deleted`, `not-authorized`, `stale`, `quarantined`, `verification-incomplete`, `blocked-reference` or `failed`; preserve all event history and retries. Idempotent recovery after partial failures must be tested.

**Never silently delete a file solely because the cache claims a match.**

## 7. UI and agent inspectability
Cloudflare form gets a clearly named `Deduplication Region` builder: bucket and prefix scope, file category filters, exclusions, observe-only vs consolidate, retention/hold, canonical choice and deletion approval. Show `Catalog freshness`, `Inventory coverage`, `Index snapshot download/import`, `Reconcile`, `Duplicates / Saved storage`, `Review cleanup`. Explorer can navigate objects, relationships, occurrences and evidence without conflating the physical and logical view. For each download say either “unknown; needs verification”, “possibly already known”, or “identical verified copy at [exact bucket/key]; N occurrences; extra physical copy handled as [status]”. Provide an authorized dry-run that shows exactly what would change.

Expose a read-only programmatic API: discover schema/capabilities, list regions and coverage, query content identity, locate canonical object, explain equality evidence, list linked occurrences and aliases, assess potential duplication, explain cleanup eligibility and blocking conditions, export snapshot, and trace semantic graph/relevant debug incidents. Stable IDs and documented cardinality/pagination; version-aware compatibility with Redown's semantic agent/debug APIs and optional Forever Works lessons. No agent action gets implicit authority from read access.

## 8. Chute-inspired local companion and fully remote compatibility
A future Windows native messaging companion (reference `thanks-cohn/chute` v2.6.1 RC1) may capture/verify local bytes, journal offline work and—with narrowly scoped opt-in—clean up temporary local files. A native helper can restart after sleep/reboot but cannot run while the machine is powered off. For shut-down-independent jobs, keep the separate cloud/remote executor; server persists and verifies. Both adapters emit the same portable evidence/events. Store official/unpacked extension identities securely and follow least-privilege native host allowlisting. Do not promise installation or signed EXE without actual release proof.

## 9. Concrete milestones and acceptance
M0: inspect current semantic/debug APIs, ledger v1/v2, RFIS experiment and pinned best-current baseline; discover risks and baseline test failures; publish source-backed architecture and threat model.
M1: freeze minimal JSON Schemas and normalized IndexedDB mapping; deterministic tests of export/import, redaction, partial/stale coverage and migrations.
M2: implement authoritative durable catalog, region scope and R2 paginated discovery, crash consistency, incremental reconciliation and fast offline queries.
M3: implement identity hashing/evidence and occurrence history: twenty identical downloads yield twenty events, one retained canonical under authorized policy, otherwise twenty objects marked candidates; same size/different bytes never merge.
M4: add dry-run cleanup, per-region explicit consent, conditional delete fencing and crash recovery; prove zero unsafe deletes under faults.
M5: integrate native companion when authorized and strengthen existing Fully Remote activation with truthful preflight; independent deployment/live Chrome/R2 acceptance.
M6: agent semantic API coverage, versioned portable reuse/Forever lesson proposal, benchmark on constrained laptops, high-volume JSONL, and document migration/replacement proof.

Required fault tests: stale snapshot; incomplete bucket list; missing read permission; account/bucket collision; overlapping region; hash mismatch; changing object; concurrent downloads; same-size different bytes; duplicate idempotency replay; lost delete response; delete-before-catalog-commit; cache import interruption; offline edits; long-gap reconciliation; Chrome/native/remote restart; untrusted JSON injection; malicious keys; denied authority; orphan multipart; and confirmation no baseline regression. Test actual cloud only with approved isolated account/prefix; distinguish mock from live.

## Deliverable for next Codex task
Produce `docs/CODEX_REGIONAL_CONTENT_INTELLIGENCE_IMPLEMENTATION.md` with source-backed inspection, selected architecture, actual schema/IDB data model, minimal functional vertical slice and targeted tests. No documentation-only completion claims. Use work-preserving small commits, actual debug/semantic tooling, clear acceptance report and safe rollback. The present proposal alone changes **no runtime behavior**.


---

## Addendum A — The Small, Timeless Portable Content Model (owner-approved direction, 2026-10-12)

**Architectural correction:** The design above describes the full desired behavior, not a mandate to implement every named entity as its own subsystem or to construct a general-purpose semantic graph database. Prefer the **smallest comprehensible model** that satisfies the invariants. Do not let today's browser, storage APIs, cloud provider, or convenience libraries define the fundamental data.

### A.1 Five enduring concepts

1. **Identity:** What exact bytes are these? Use content digest, digest algorithm, byte length and the supporting verification evidence.
2. **Location:** Where is a particular object physically stored? A scoped account/bucket/key or a provider-neutral locator, never an identity substitute.
3. **Event:** What happened, when, and under what job/actor? Retain repeated download occurrences rather than confusing them with physical copies.
4. **Evidence:** What observation supports the assertion, when was it made, and what remains unknown? Cached observations are not current remote truth.
5. **Region:** Which explicit storage scope and policy govern comparison, canonical selection, retention, and potential removal?

Everything else in the proposal (source provenance, aliases, conflict status, authorization, transfers, semantic links) should initially be **fields or relationships of these five concepts**, extracted into additional independently justified modules only when real requirements and tests demand it. A graph can be *derived* for inspectability, rather than forcing a graph database into the runtime.

### A.2 Dependency direction and adapters

```text
Portable Content Model + Invariants + JSON Schema
                    |
          Small storage contract
          read / write / query /
          atomic commit / export
             /       |       \
        JSON/JSONL IndexedDB  SQLite
        interchange browser  native/server
```

The model must be independently implementable with plain records and documented algorithms. **IndexedDB is a browser-local searchable projection/accelerator, not the canonical specification, the only surviving copy, or the authority to delete files.** SQLite can provide durable, transactional updates on a native/server executor. JSON and JSONL are portable human-readable interchange and event formats—not a requirement to rewrite one enormous JSON file for every change. Preserve one transactional authority per managed region and use exported snapshots with explicit provenance/revision/completeness to reconcile projections. The storage adapter must expose real atomicity capabilities instead of promising transactions on backends that do not offer them.

Keep the domain model independent from Chrome extension APIs, browser origin storage rules, Cloudflare R2, SQLite classes, Node-specific primitives, and particular UI frameworks. Explicit boundaries should allow Chrome-to-Firefox-to-plain JavaScript/Node-to-native consumers without rewriting identity or deduplication semantics. No unnecessary dependencies, inheritance hierarchy, speculative plugin ecosystem, or framework requirements.

### A.3 Minimal, explainable operations

Define a concise, versioned public contract for: `observeObject`, `recordOccurrence`, `findCandidates`, `verifyIdentity`, `locateCanonical`, `explainClaim`, `proposeCleanup`, `commitAuthorizedChange`, `exportSnapshot`, and `importSnapshot`. These are **conceptual operations**, not mandated exact function names. Reads and proposed cleanup are non-mutating; durable records are written under explicit transactional authority; remote deletion remains a separately permissioned, audited effect. A programmer should understand the implementation by reading its contracts and invariants, without reading a browser's IndexedDB code.

Snapshots must be schema-versioned and importable without the original application. Edits to exported records or IndexedDB do not automatically authorize remote writes; treat them as proposed changes requiring revision-aware validation and reconciliation.

### A.4 Two definitive portability acceptance tests

**Human comprehensibility:** A programmer unfamiliar with Redown, Cloudflare, Chrome, and current libraries can read the specification and a few JSON records, identify what content is stored where, why a duplicate was detected, and why cleanup is allowed or forbidden. Document these rules without requiring source archaeology or knowledge of a vendor SDK.

**Cross-runtime equivalence:** Export a finite, test-fixture snapshot from one browser implementation, import it into another browser or a plain JS runtime without Chrome APIs, and assert **exactly the same** identity matches, physical locations, occurrence counts, evidence classifications, stale flags, duplicate decisions and cleanup *eligibility*. Physical deletes must not execute in the portability test. Browser storage is origin-scoped; cross-browser portability happens through the interchange format and importer, not by directly reading another browser's IndexedDB.

Also prove round-trip fidelity, deterministic migrations, partial-snapshot handling, bounded-memory JSONL imports, atomic publication of a complete imported revision, and conservative rejection of unsupported future schemas.

### A.5 Complexity budget and evolutionary rule

The system should remain understandable by a single maintainer. Each new type, service, dependency, daemon, index, cache, or abstraction must justify itself by an actual required invariant, measured scaling bottleneck, or demonstrated test. Remove duplicate state and redundant conversion layers before adding new ones. Favor a compact core with tested interchangeable adapters over a universal file-management framework.

If a future platform replaces IndexedDB, Chrome, SQLite, or Cloudflare, only adapters should change; records, semantic meanings, safety invariants, migration rules and conformance fixtures should endure.

**Non-negotiable:** Design for growth without demanding complexity in advance. Simplicity does not relax correctness: preserve independent integrity checks, region-scoped authorization, durable occurrences, verified canonical objects, and fail-closed deletion controls.

### A.6 Implementation priority

Before executing milestones M1–M6 above, Codex should revise the proposed normalized entity/store inventory into this minimal five-concept model, clearly mapping any necessary additional fields and relationships. Deliver the smallest fully functioning slice first: portable JSON records → import into IndexedDB → fast duplicate candidate lookup → evidence/status explanation → export and cross-runtime reimport. Then add authoritative synchronization and authorized cleanup incrementally. Keep the owner's best-current baseline protected and do not confuse this addendum with an already implemented feature.
