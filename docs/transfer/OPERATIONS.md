# Portable remote transfers 0.1: operation and replacement contract

This is an additive, explicitly enabled HTTP(S) URL transfer path. It uses the
portable plain-JavaScript package in `packages/transfer-core`, a long-running Node
executor with a durable SQLite ledger, and a dedicated scoped R2 gateway. Neither
the legacy embedded STORAGE Worker nor `worker/src/index.js` is replaced. Hitomi
ZIP capture retains its 64 MiB guard. Upload from Computer retains its page-scoped
queue and direct Cloudflare API route. Their historical verification limits remain.

## Evidence and assurance

The fixture exercises the actual HTTP source adapter, SQLite coordinator, portable
executor, R2Gateway adapter and gateway Worker/UploadSession code against a local
filesystem R2-compatible binding. It is **not live R2**. `tests/remote-transfer.test.mjs`
also starts a separate executor process, kills it after publication, reopens its
ledger and verifies by polling with no new source fetch. The client VM test discards
its entire browser runtime after a lost acknowledgment and reconciles persisted
idempotency intent in a second runtime. These are process/VM proofs, not installed
Chrome acceptance. SHA-256 readback compares independently retrieved destination
bytes with the exact source representation acquired by this attempt; it does not
prove authenticity of an untrusted source or permanent immutability of R2.

States: queued → preflight → transferring → verifying → verified. Interrupted
attempts may enter retry-wait (exponential 1–60 second delay, five attempts by
default), needs-auth, needs-browser, unverified or terminal-failed. Existing objects
are skipped with **no content verification**, or fail when fail-if-existing is
requested. Cancellation is requested separately, then cancellation-pending →
cancelled after abort/cleanup. If publication already happened, independently
observed verification wins over cancellation. `TRANSITIONS` is executable policy;
claim recovery explicitly returns an expired nonterminal job to queued while
preserving its multipart and integrity checkpoints and adding a recovery event.
Verified is an observation, not permission to delete anything.

Acceptance is persisted with an event in SQLite BEGIN IMMEDIATE / COMMIT using WAL
and synchronous FULL before 202. The database, not browser storage or IndexedDB,
is authority. Job intent has no age expiration. Idempotency is scoped by tenant;
a changed intent with an existing key returns 409. Every transition/checkpoint
and event sequence is transactional. Leases and heartbeats fence canonical writes;
external R2 effects are not exactly once. Deterministic per-attempt staging keys,
stored multipart receipts, conditional final creation, exact job metadata and
readback reconcile uncertain publication. Concurrent attempts may do redundant
work; they cannot silently replace another job's final object.

Retries restart from zero, retaining strong source ETag preconditions. Range
resumption is rejected rather than reusing unvalidated bytes. Non-range sources
and unknown length streams are supported. Unexpected 206 and encoded responses
are rejected. A weak/missing ETag means source-version identity is unknown; no
byte slices from different attempts are combined. Short bodies/reset/timeout
fail rather than certifying a partial object. Source requests carry no page
cookies, browser headers or source credentials.

## Ports, reuse and conformance

`index.d.ts` describes source acquisition, destination inspection/read/multipart,
transactional fenced checkpoints, clock, incremental hashing and optional events.
Authorization and scheduling are coordinator ports: the service authenticates and
scopes destination intent before submission, and its replaceable tick loop claims
jobs. The Node timers implement monotonic timeouts; durable timestamps/leases use
UTC milliseconds across process lifetimes. Operate with synchronized host clocks;
a large backward clock jump can delay lease takeover. The domain imports no OS,
Chrome, Cloudflare or Redown code. `examples/transfer/consumer.mjs` is independently
executed as a plain-JavaScript consumer. Declarations are hand-maintained, not
claimed generated TypeScript; no TypeScript compilation proof is claimed.

A replacement destination must implement all public ports, atomic create-if-absent,
independent reads, bounded parts, explicit abort and exact scope enforcement. Run
the same failure tests, especially same-size/different-content, lost final response,
wrong location and concurrent attempts. A storage replacement must prove atomic
job/event publication, persistent idempotency and fencing. Never weaken the proof
by returning an assumed hash or treating an ETag as a digest. Replace browser UI
without moving source acquisition into the client. The optional Forever lesson
export is version-aware, unreviewed and uncertified; the actual pinned JS validator
accepts the records but the published schema regex rejects `0.1`. This is retained
as a failed compatibility result, not repaired or promoted to accepted intent.

## Ledger and diagnosis

v1 is byte-for-byte retained. v2 describes the redacted public evidence projection;
internal SQLite records also retain the private source URL needed for execution.
Events contain state, timestamps, attempt identity, sequence, codes and byte counts,
not source URLs, content or tokens. `GET /v2/export` emits sorted JSONL projections.
`readProjectionJSONL` returns complete records and flags an incomplete tail;
malformed complete lines fail. Imported projections are **not executable jobs** and
must never resume arbitrary external effects. Reauthorization through submission
is required. `migrateV1` preserves legacy evidence with URL/local-reference
redaction, marks it unverified and nonexecutable. The legacy `completed` state is
not promoted to v2 verified. Migrations are caller-controlled evidence transforms;
this does not claim live v1 browser data was imported.

Chrome's IndexedDB v2 cache is a single disposable replace transaction. Chrome
storage holds pending control metadata to replay uncertain submission responses.
It is not a persistent file-byte queue. Reconciliation never calls provisioning.
Source URLs in the private outbox may be sensitive; use a dedicated extension
profile and clear only after reconciling durable acceptance. No export includes
this private outbox or executor configuration.

`node remote/diagnose.mjs /path/jobs.sqlite [job-id]` opens SQLite readOnly and
reports states, evidence, uncertainty and safe recovery choices. It does not
claim jobs, create tables, submit, deploy or access cloud data. The frozen agent
and debug APIs retain their version and history. New semantic entities link
capability → engine/ledger/gateway/UI → tests and explicit live gaps.
