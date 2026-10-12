# Portable transfer core 0.1

Plain ESM JavaScript with public declarations; no build step, Redown, Chrome, Node or Cloudflare import. `executeTransfer(job, ports)` requires source, destination, transactional fenced store, clock, hash, optional event sink and fault hook. `remote/` is one replaceable executor. Submission authorization and scheduling precede the core. Hash is incremental SHA-256; destination verification reads bytes independently, never trusts an ETag. Contract changes require a new package/ledger version and retained fixtures.

Read `docs/transfer/OPERATIONS.md` for transitions, limits and conformance requirements. A second program is `examples/transfer/consumer.mjs`. Resume means restart from zero with a validator; byte-offset resume and overwrite replacement are explicitly unsupported. No adapter may report conditional publication supported unless it enforces it atomically.
