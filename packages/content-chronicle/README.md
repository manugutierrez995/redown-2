# Portable Content Chronicle 1

Shared plain-JavaScript metadata domain with independent recorder, disk journal, disposable IndexedDB and segmented archive adapters. No domain function fetches content, verifies a hash, provisions a Worker or deletes a file. Recognition remains a hint.

- `index.mjs`: capture, role-aware URL normalization, JSON/JSONL, recall, and explicit minimal-to-rich content-provenance v1 projection. The same domain runs in the extension.
- `recorder.mjs`: bounded nonblocking capture with injected append/scheduling/gap ports.
- `file-journal.mjs`: ChronicleFileJournal for metadata; FileJournal for diagnostic envelopes. Single-writer fsync, idempotent replay and explicit torn-tail recovery; requires caller-provided durable host storage.
- `indexeddb.mjs`: atomic generation activation, indexes and missing/stale/partial freshness. A disposable query projection, never file truth.
- `archive.mjs`: scoped versioned manifests, segmented JSONL, injected SHA-256 checksums and opt-in immutable history-vault ports. No live R2 adapter.
- `consume.mjs`: independent offline Node consumer, no browser globals, cloud credentials, installed package dependencies or network.

```sh
npm run test:chronicle
node packages/content-chronicle/consume.mjs exported-history.json
node agent/chronicle/cli.mjs describeCapabilities --json
```

See [API](../../docs/agent/chronicle/API.md), [ownership](../../docs/agent/chronicle/ARCHITECTURE.md), [Debug Mode](../../docs/agent/chronicle/DEBUG.md), [privacy/gaps](../../docs/agent/chronicle/PRIVACY_AND_LIMITATIONS.md) and [actual verification](../../docs/CODEX_CHRONICLE_AND_DEEP_AGENT_DIAGNOSTICS_IMPLEMENTATION_REPORT.md). The full directive is only partially implemented; installed-Chrome/R2 proof, comprehensive executor/gateway tracing and native/production vault work remain open. The protected favorite baseline is unchanged.
