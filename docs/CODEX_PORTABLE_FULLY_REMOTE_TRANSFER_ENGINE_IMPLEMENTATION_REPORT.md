# Portable fully remote transfer engine — implementation and handoff

Implemented a functioning, gated remote URL vertical slice over latest inspected
main `73c76b69b704858e462312acf33ea8a9c8817212`. The production engine has completed
byte-identical transfers through both a filesystem R2-compatible fixture and the
actual Wrangler/Miniflare R2 + Durable Objects runtime. This is **local execution
proof, not live R2 or installed Chrome success**, and the full directive is not
claimed closed. The complete verification record and commit details follow below.

## Implemented boundaries

- Portable dependency-free ESM engine/public declarations and independent JS consumer.
- Real checked/pinned HTTP adapter, scoped R2 gateway/client and supervised Node executor.
- Transactional persistent SQLite intent/events/checkpoints, tenant idempotency, leases,
  recovery, retries, cancellation, quotas and exact independent SHA-256 readback.
- Dedicated multipart R2 staging, Durable Object receipt storage, conditional final
  creation, abort/cleanup alarms, readback. Existing embedded STORAGE Worker unchanged.
- Gated Simple/Nested remote initiation, durable-ack status, persisted browser outbox,
  restart reconciliation, status/cancel controls and disposable IndexedDB projection.
- Retained v1 ledger, additive public v2 schema, nonexecutable/redacted legacy migration
  and JSONL projection import/export. No export includes private source URLs or tokens.
- New semantic entities/edges with current source anchors and positive local proof vs
  explicit live gaps; frozen project/debug contracts and historical hashes retained.
- Optional unreviewed Forever lesson export passes actual pinned JavaScript validation;
  published-schema version-regex failure remains explicitly asserted.

See [operations](transfer/OPERATIONS.md), [deployment/rollback/live checklist](transfer/DEPLOYMENT.md)
and [security/recovery limits](transfer/SECURITY.md). No source bytes travel through
Chrome in the new path. No local files are deleted. Protected/generated Hitomi
content remains browser-assisted and the 64 MiB guard is retained.

## Measured transfers

1. HTTP → actual production adapters/core/gateway → filesystem R2-compatible fixture:
   11,534,353 bytes, SHA-256 `9de4849bc539f85fd917d4109e7e0ccee6eb4308276991a6950927d18d0c49ea`.
   Three part sizes: 5,242,880, 5,242,880, 1,048,593 bytes. Independently retrieved
   destination digest matches. Durable ledger reopened and polled as verified.
2. Separate executor process: 6,291,457 bytes, SHA-256
   `0f3f7f36934ed3b397f9fbffd76e34624a200ff8a47cea96324d9d72658cd6eb`.
   Process intentionally exits 86 after final publication. A new process takes over
   the retained SQLite ledger, verifies, and source request count remains one.
3. Wrangler/Miniflare's real local R2/DO bindings: 6,291,475 bytes, SHA-256
   `a2b61a2a1fd611a4ffa5b76ba8f868a65726abe0753c57ad0a120390917b69ea`,
   multipart completion and independent readback; zero-byte digest also verified.
   A competing final writer inserted after preflight survives conditional publication;
   the losing job reports DESTINATION_RACE. This is an emulator, not Cloudflare production.

## Remaining work and material limits

Live bucket/deployment credentials and an installed Chrome session were unavailable.
Complete the explicit live checklist before using production data. Source-host
firewall enforcement, TLS ingress, secret protection, peak RSS and live throughput
have not been certified by these tests. The validated local envelope is small;
keep default 64 MiB budgets until live benchmarks. Event/job listing and retention
need pagination/archival for high-volume use. Fleet-wide concurrency/rate/egress
accounting and shared multi-host transactional storage are not implemented.

Byte-offset/range resume is intentionally unsupported; restart from zero preserves
strong ETag preconditions. Replace/overwrite is rejected rather than promising
unsupported portable conditional multipart replacement. Browser fallback records
intent and reports needs-browser, requiring explicit new browser access; there is
no automatic protected-page acquisition or one-click fallback executor. Native
local cleanup is absent, and temporary or original files are always preserved.
A stale executor can still have an external write in flight after its canonical
lease is lost; cancellation is cooperative, not an undo or exactly-once guarantee.
Lost multipart creation before ID persistence needs R2 lifecycle cleanup.

The observed latest-main baseline has 27 failing tests (supersedes historical 19).
No test assertions were weakened. Full suite remains failing and must not be
advertised green. Historical semantic/catalog/debug source drift remains visible;
this implementation does not update historical hashes to hide it. DBG-004 remains
an unclosed Markdown case, absent from frozen debug API incident registration.

## Exact execution record

All commands ran on Node v24.19.0. `npm ci --cache /workspace/.npm-cache --no-audit
--no-fund` exited 0. Initial ungranted-network invocations produced native Node
SIGABRT in some test subprocesses and a failed proxy connection, not useful
functional results; their original logs are retained. After granting loopback/network
execution, `git fetch origin main` succeeded and matched the GitHub connector's
main SHA. No credentials, live cloud writes or installed browser were used.

| Command/evidence | Exit | Observed result |
| --- | --- | --- |
| 14 requested read-only diagnostics | 0 except getIncident DBG-004 = 2 | Case is Markdown only, not a registered frozen-API case |
| Existing suite, network enabled, before runtime edits | 1 | 114 tests; 87 pass, 27 fail |
| Targeted new engine/browser/Forever tests | 0 | 62 pass, 0 fail |
| `npm test` after implementation | 1 | 176 tests; 149 pass, same 27 baseline failures |
| `npm run check` | 0 | Existing and new runtime source syntax checks pass |
| Upload/provider/Explorer targeted regression suite | 0 | 19 pass, 0 fail |
| `node tests/remote-emulator.mjs http://127.0.0.1:9891` | 0 | Real local R2/DO binding multipart, empty and race proof |
| Wrangler gateway deployment dry-run | 0 | R2/DO bindings bundle; no deployment |
| Actual v2 ledger schema tests (fixture and emulator) | 0 | One fixture and two emulator ledgers valid; private URL/false verified rejected |
| Semantic schema conformance | 0 | Semantic schema valid; published Forever compatibility explicitly blocked |
| Debug independent schema conformance | 0 | 5 schemas and 41 checks pass |
| Semantic graph validation | 0 | Structurally valid; historical stale-source warnings retained |
| Debug record validation | 0 | Structurally valid; historical stale-reference warnings retained |
| Independent plain JS consumer | 0 | Core import/intent works without Redown/Chrome/build tooling |

Commands, exact exits, outputs and named failure comparison are under
[verification/](transfer/verification/final-commands.json), especially
[targeted proof](transfer/verification/targeted-final.log),
[emulator proof](transfer/verification/emulator-acceptance.log),
[baseline comparison](transfer/verification/baseline-comparison.json) and
[full-suite output](transfer/verification/npm-test-final.log).
The first gateway dry-run rejected the invalid uppercase bucket placeholder;
a valid lowercase placeholder and workspace-local Wrangler config/log paths
were used for the passing run. It remains a placeholder, never a deployment.
The first permitted fixture run exposed an overly short test transport timeout;
normal fixture limits were corrected and explicit timeout behavior is separately
fault-tested. No assertions were disabled.

Immediate next work: execute the authorized live checklist, resolve the 27 existing
baseline failures independently, add pagination/archival and shared fleet budgets,
benchmark memory/time, and implement any desired byte-offset resume, guarded
replacement or permissioned native temporary cleanup as separately proven ports.

## Commit and retention record

The implementation commit is `503c515594f2720af9dacc292fc286b0070b888f`. It is a local
`main` commit directly over the inspected upstream SHA; no PR was self-merged.
The subsequent evidence/mapping commit adds this report, raw diagnostic/test logs,
new semantic entities and an appended attributed DBG-003 regression outcome.
Original DBG journal/Markdown prefixes, v1 ledger bytes, frozen project/debug API
source and catalog were compared with the base and retained byte-for-byte.
A push/remote-head check follows local publication; remote landing must be reported
separately from a local commit. If blocked, retain the output patch and Git bundle.

Final staged-record review: the new unpublished debug event initially omitted a
`role:test` source reference required by the frozen proof contract. The complete
corpus was rejected; the event was corrected before publication by adding the
actual regression test reference. Original committed journal prefixes were never
rewritten. The resulting debug corpus is valid with 17 retained stale-reference
warnings; semantic graph is valid with 67 retained stale-source warnings. Schema
checks pass, with the separate published Forever version-regex failure unchanged.
The invalid intermediate graph and suite output are retained for audit; after
correction the final suite again reports 176 tests, 149 pass, 27 fail, and the
failure-name set equals the preimplementation baseline.

## Publication blocked; durable handoff

The runtime implementation is committed as `503c515`, and its proof/mapping as
`c9e5936`, on local main. An automatic approval reviewer rejected the attempted
direct push of these two commits to remote main: it interpreted the instruction
as permission to commit locally, without clear permission to update the shared
default branch. The combined push command did not execute. A subsequent read-only
fetch confirms remote main still points to `73c76b69b704858e462312acf33ea8a9c8817212`.
Do not claim remote landing or bypass the review through an alternate write tool.
Explicit approval of the remote main update is required.

The managed environment does not mount the projectless `/codex/.../output` path;
its root filesystem is read-only. Recovery artifacts are therefore preserved in
`work/handoff/` inside the existing isolated checkout: a binary Git patch over the
base, a verified Git bundle retaining the local commits, a metadata/checksum file
and a verification/runbook archive. This tracked report and all source/test proof
are also committed. A next agent can inspect local main and the complete directive,
verify the bundle against the required base, or reverse-check the patch against
this checkout, then request the precise shared-branch publication approval.
