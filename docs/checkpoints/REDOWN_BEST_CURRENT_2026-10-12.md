# REDOWN — Owner-designated best current baseline

**Owner assessment (2026-10-12):** "The current Redown is THE BEST." Preserve this as a favored reference state for future changes.

**Pinned source commit:** `4a727792a1cd622e197da9b06c9144a673317448` (the observed `main` head before this checkpoint note was added).

This is a **preference and preservation checkpoint**, not a claim that all features are complete, production-deployed, or regression-free.

## Instructions for future maintainers and Codex agents

- Treat the pinned commit as the owner's favored behavioral/UX baseline. Preserve the features and workflows already present there when adding remote transfer, native companion, region-scoped deduplication, or other capabilities.
- Before consequential changes, inspect the exact baseline and existing `AGENTS.md`, debug/semantic APIs, historical incidents, and verification logs. Run relevant regression tests; explicitly report differences from the pinned baseline.
- Do not silently overwrite or discard working browser-assisted Hitomi behavior, R2 explorer/navigation, context menus, cloud authentication, local upload, transfer-mode settings, or current remote-transfer implementation.
- Preserve durable transfer evidence and avoid unsafe local/remote deletion. New deduplication behavior must require verified content identity and authorized region-scoped cleanup; a cached JSON/IndexedDB index alone is never proof for deletion.
- Any regressions should be documented with source-backed evidence and a restoration path referencing the pinned commit.
- This checkpoint intentionally does not freeze development: improvements are welcome when they retain validated functionality and explain changed behavior.

## Known verification boundaries at checkpoint

See `docs/CODEX_PORTABLE_FULLY_REMOTE_TRANSFER_ENGINE_IMPLEMENTATION_REPORT.md`: local deterministic and emulator tests exist, but live R2/installed-Chrome remote-mode acceptance was not certified there; the full suite retained baseline failures. Owner-reported Fully Remote UI activation and post-upload local cleanup problems remain to be investigated. Do not promote this owner's qualitative endorsement into an engineering pass claim.
