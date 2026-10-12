# Deploy, accept, operate and roll back

No service was deployed and no credentials were available in the implementation
session. Use a dedicated test bucket and explicit live-test authorization. Do not
run production preparation handlers as diagnostics.

## Deployment

1. Use Node 24 LTS or a compatible Node release providing `node:sqlite`, with a
   durable local volume. Do not put WAL databases on shared network filesystems.
   Use one supervised executor process initially. SQLite limits active claims to
   one per tenant; multiple local processes share the same fences. Process loss is
   recovered from the volume; volume loss requires backup restore.
2. Copy `remote/gateway/wrangler.toml` into deployment configuration and replace
   the bucket placeholder with the exact test bucket. Deploy separately from the
   extension's embedded Worker. Set `GATEWAY_TOKEN` using Wrangler secret tooling;
   it is dedicated to this account/bucket. Require R2 read, multipart, put and
   staging-delete access and the `UPLOADS` Durable Object binding. Do not make
   staging objects public. Configure incomplete-multipart lifecycle cleanup and
   staging-key retention as a backstop to the per-session cleanup alarm. A crash
   between R2 createMultipartUpload and persisting its upload ID can leave an
   orphan the application cannot identify; lifecycle cleanup is necessary.
3. Put a permission-restricted JSON config outside the repository, with this
   shape (all strings below are placeholders, not credentials):

   ```json
   {
     "database":"/var/lib/redown/jobs.sqlite",
     "bind":"127.0.0.1", "port":8789,
     "allowedSourceHosts":["explicitly-permitted-source.example"],
     "gateways":[{"url":"https://gateway.example.workers.dev", "token":"GATEWAY_SECRET", "accountId":"EXACT_ACCOUNT", "bucket":"EXACT_BUCKET"}],
     "tenants":[{"id":"owner-test", "token":"AT_LEAST_32_RANDOM_CHARACTERS", "destinations":[{"accountId":"EXACT_ACCOUNT", "bucket":"EXACT_BUCKET", "prefix":"test/"}], "limits":{"maxBytes":67108864,"maxAttempts":5,"maxPending":100}}]
   }
   ```

4. Run `node remote/run.mjs /restricted/config.json` under a supervisor that restarts
   on crashes and starts after machine reboot. The runner sets umask 0077. Restrict
   existing DB/config permissions too; a library-created Ledger inherits caller
   umask. Keep DB, WAL and SHM together on the persistent volume. Back up with
   SQLite's supported consistent backup mechanism rather than copying a live
   lone DB file. Retain config keys separately; backups contain private source URLs.
5. Terminate HTTPS at a reverse proxy on your executor host. Enforce 16 KiB request
   bodies, read/header/idle timeouts and authenticated-only routes, and remove
   query/body/Authorization logging. Reject slowloris traffic at this boundary.
   Expose no unauthenticated status or source proxy. Restrict outbound traffic to
   approved public source hosts/IPs and the gateway, denying private, loopback,
   link-local, metadata and IPv6 destinations. The adapter additionally requires
   HTTPS, port 443, explicit host allowlisting and pinned checked public IPv4 DNS.
   It connects directly to that address using the original hostname for TLS.
   Do not route source fetches through a proxy that re-resolves addresses; that
   would invalidate the pinned-DNS guarantee. If your platform requires such a
   proxy, implement an equivalent enforced egress source adapter before deployment.
6. In Redown Transfer methods, save the executor HTTPS origin and scoped token,
   grant that exact optional host permission, enable it, and select Automatic or
   Fully Remote Only. Browser-Assisted Only preserves the existing route. Right
   click a direct remote file into an exact Simple/Nested destination. Refresh
   reads real job state and reconciles previously submitted metadata. There is
   no automatic provisioning or silent browser capture on remote failure.

API: authenticated POST `/v2/jobs` with sourceUrl, destination, idempotencyKey,
requestedMode and policy; authenticated GET `/v2/jobs`, `/v2/jobs/{id}`,
`/v2/jobs/{id}/events`, `/v2/export`; POST `/v2/jobs/{id}/cancel`. Preserve an
idempotency key after a lost response. Changing scope/content with that key is
409, not a retry. Tokens are per tenant; gateway tokens never enter the browser.

## Envelope and cost

Default job limit is 64 MiB, maximum configured hard limit 1 GiB, 5 attempts,
100 pending jobs/tenant, one active claim/tenant and one execution per process.
The API rate limit is 600 requests/minute/tenant/process. Multi-host SQLite
coordination and a fleet-wide billing/egress quota are not implemented. The source
idle timeout is 30 seconds, total source body timeout 1 hour; gateway requests time
out after 60 seconds. Core parts default to 8 MiB; all non-final R2 parts meet the
5 MiB minimum. Core holds one part and a bounded socket chunk, not an archive-sized
buffer. The gateway bounds buffered part requests to 8 MiB; R2 reads/staging
publication stream. The first functional proof used 11 MiB and three 5 MiB-bounded
parts. This is an observed functional bound, not a measured peak-RSS or live
1 GiB throughput certification. Keep the default until live timing/memory tests.

Each attempt adds source ingress, multipart part writes, staging complete, a
streaming conditional final write, staging deletion, destination head and full
readback. Verification costs a full additional read and gateway-to-executor byte
transfer. Failed attempts may repeat source ingress and stage storage. Account for
R2 request/storage and Worker/DO/executor/network charges using your actual plans.
Cloudflare docs inspected during implementation: [Worker limits](https://developers.cloudflare.com/workers/platform/limits/),
[R2 multipart](https://developers.cloudflare.com/r2/objects/multipart-objects/),
[Worker R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
Deployment dry-run proves bundling, not limits, authorization or cloud execution.

## Failure and recovery

Use read-only diagnosis before changing anything. An expired lease preserves job
intent/checkpoints, and the next claim reconciles exact final metadata/readback
before retrieving again. A source changed under a retained strong ETag fails.
An object with another job ID is skipped or fails, never asserted matching. A
lost final response is reconciled; size-only and missing reads stay unverified.
R2 sessions serialize calls and persist part receipts; an incomplete session's
24-hour alarm aborts/deletes staging, distinct from retention of job intent.

Cancellation is cooperative, not a promise to undo a remote write. A committed
object remains and may verify despite cancellation. A stale executor can have an
in-flight external effect even after losing its canonical lease; no distributed
exactly-once/final-effect fencing is claimed. Preserve local originals and inspect
object truth after cancellation races. There is no remote final-object delete API.
No native helper or authorized local-delete mechanism is provided.

Retry exhaustion is terminal; needs-auth requires renewing service credentials
and a new explicit submission, needs-browser requires returning to the source and
choosing an authorized browser route. The fallback checkbox retains intent but
never automatically acquires protected page content; the current UI offers an
explanation, not a one-click browser fallback executor. Resume is restart-only;
replacement/overwrite is rejected. Keep existing objects safe.

## Live acceptance checklist (pending)

- In a dedicated bucket/prefix, validate conditional R2 put really prevents a
  competing writer, including staging stream publication and a zero-byte file.
- Submit a public ground-truth file through Simple and Nested menus; observe exact
  account/bucket/key, durable 202, attempts, bytes, final readback SHA-256.
- Close installed Chrome immediately after 202, stop/restart the remote service,
  reopen Chrome and reconcile a verified object; independently download/hash it.
- Lose the submission response, retry/restart and prove one canonical job. Inject
  source reset and gateway lost completion response; inspect orphan cleanup.
- Test auth expiry, denied read permission, changed strong ETag, redirects/private
  DNS, byte/time/rate quotas and cancellation before/after final publication.
- Exercise Automatic/Fully Remote/Browser-Assisted modes, fallback false, Hitomi
  gallery capture, local file round-robin uploads, Explorer, login and bucket
  selection in the installed extension. No local originals may disappear.
- Benchmark peak RSS, gateway request/CPU timing and total traffic at 64 MiB before
  increasing limits. Confirm firewall policy and staging lifecycle configuration.

Rollback: disable the executor in Redown to return ordinary remote URL routing to
the legacy path, then explicitly choose Browser-Assisted if Fully Remote was set.
Stop claiming new jobs by stopping the executor; preserve the volume, pending
outbox, gateway deployment and secret config until reconciled/aborted. Back up
before any database migration. Do not delete staging/DB/bucket content to roll back.

## Repeat the local proof

From the repository root after `npm ci`:

```sh
npm run check
npm run test:transfer
python tests/transfer-schema-conformance.py docs/transfer/verification/targeted-final.log
node examples/transfer/consumer.mjs
```

For independent Cloudflare binding emulation, use two terminals:

```sh
# Terminal 1; this variable is a test fixture, not a live secret.
WRANGLER_LOG_PATH=work/wrangler-dev.log XDG_CONFIG_HOME="$PWD/work/config" WRANGLER_SEND_METRICS=false \
  npx wrangler dev --local --config remote/gateway/wrangler.toml --port 9891 \
  --persist-to work/r2-emulator --var GATEWAY_TOKEN:gateway-test-secret
# Terminal 2
node tests/remote-emulator.mjs http://127.0.0.1:9891
```

This writes only the local emulator's generated acceptance keys. It does not deploy
or use a Cloudflare account. A dry-run bundles without deploying:

```sh
WRANGLER_LOG_PATH=work/wrangler.log XDG_CONFIG_HOME="$PWD/work/config" WRANGLER_SEND_METRICS=false \
  npx wrangler deploy --dry-run --config remote/gateway/wrangler.toml --outdir work/gateway-build
```
