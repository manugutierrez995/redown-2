# REDOWN Transfer Ledger v1 — canonical JSON contract

**Status: contract implemented; Cloud-to-Cloud engine, IndexedDB store, UI settings and local deletion are NOT implemented.** This is additive design work only. Do not alter user-confirmed working Hitomi Browser-Assisted Transfer baseline at `2fdf6edb838da9b496da36f940a5e668e1adafa0`.

## Canonical representation

Each transfer is a standalone JSON record validated against [v1.schema.json](v1.schema.json). Use immutable `jobId` for primary lookup; update `updatedAt` whenever any field changes. `source.url` is where content originated; `destination.accountId/bucket/key` is the **actual requested R2 object location**. Verification tracks what was **actually observed** there rather than treating an HTTP upload success or historical ledger entry as proof.

Recommended per-user settings (not yet exposed in the extension):

```json
{
  "schemaVersion": 1,
  "preferredMode": "cloud-to-cloud",
  "allowBrowserFallback": true,
  "deleteLocalAfterVerification": false,
  "overwrite": "skip-existing"
}
```

The fallback flag applies only when Cloud-to-Cloud is selected. Ask before browser transfer if the user has disabled fallback. Existing Browser-Assisted workflows stay available unchanged and must not silently become Cloud-to-Cloud.

## Example record

```json
{
  "schemaVersion": 1,
  "jobId": "job_8b2f",
  "createdAt": "2026-10-12T12:00:00Z",
  "updatedAt": "2026-10-12T12:00:00Z",
  "state": "queued",
  "source": {"kind": "hitomi-gallery", "url": "https://hitomi.la/imageset/example-123.html", "siteKey": "hitomi:123"},
  "destination": {"provider": "cloudflare-r2", "accountId": "acct", "bucket": "art", "key": "files/example-123.zip"},
  "policy": {"preferredMode": "cloud-to-cloud", "allowBrowserFallback": true, "deleteLocalAfterVerification": false, "overwrite": "skip-existing"},
  "attempts": [],
  "verification": {"status": "not-started", "method": "none", "localSize": null, "remoteSize": null, "algorithm": null, "localDigest": null, "remoteDigest": null, "checkedAt": null},
  "cleanup": {"status": "not-requested"},
  "queue": {"retryCount": 0, "nextAttemptAt": null, "lastErrorCode": null}
}
```

## Verification and deletion invariants

- Ledger entries and JSON indexes are **caches of evidence**, not authoritative proof of remote state.
- After upload, verify the exact R2 bucket/key, confirmed byte size, and a content digest **when directly comparable**. R2 ETags are not universally equivalent to a local MD5, especially for multipart objects. If trustworthy digest comparison is unavailable, do not imply cryptographic integrity.
- A previous upload with the same URL or filename is **not proof** the current bytes match.
- Never delete local files on a mere metadata match or `state: completed`. Deletion requires independently confirmed correct object integrity, an explicit enabled cleanup policy, a narrowly scoped file reference, and a supported authorized native/desktop mechanism. If any prerequisite is missing, use `needs-permission` or `waiting-verification` and preserve the file.
- Make replays idempotent by job ID and destination key. If the object already exists, honor `overwrite` without inventing a matching checksum. Track separate transfer attempts; append rather than replace their evidence.
- A queued job persists until completed, explicitly cancelled, or explicitly cleared; no one-hour expiry. A persisted job metadata record does not mean its bytes can resume after closing the browser.

## IndexedDB-ready mapping

Object store `transfers` keyed by `jobId` (record exactly as JSON, no proprietary serialized classes). Indexes: `state`, `updatedAt`, `source.siteKey`, compound `[destination.accountId, destination.bucket, destination.key]`, `queue.nextAttemptAt`. Keep a separate `settings` record, optional append-only `events` keyed by `[jobId, sequence]`, and schema migrations that never discard attempts or verification evidence.

For eventual export/import: JSON Lines (one record per line) for large sets, a JSON document for a single job or portable snapshot. Never include OAuth tokens, Worker secrets, or the ZIP bytes. Avoid unbounded `attempts` arrays in active memory by moving historical events to an event store when migrating, while keeping the v1 serialized record valid.

## Required acceptance tests before enabling features

1. Deterministic schema validation and v1 round-trip JSON export/import.
2. Remote download failure + enabled fallback results in Browser-Assisted retry without duplicate final object.
3. Remote failure + disabled fallback remains queued, no local download.
4. False positive upload confirmation, wrong bucket/key, size mismatch, digest mismatch, and missing read permissions all prevent cleanup.
5. Browser closure / restart / 60+ minute interval preserves job record and truthful recoverability state.
6. User-confirmed Hitomi baseline remains unchanged, including `/imageset/` context-menu behavior.
