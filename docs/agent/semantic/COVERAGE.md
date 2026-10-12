# Public coverage and remaining access gaps

The graph currently contains 110 entities, 129 directed edges and 165 inventoried public artifacts. All listed paths have semantic owners; that is file addressability, not full behavioral coverage. Counts include schemas, vendored proof artifacts and verification reports. The complete inventory is in `agent/semantic/model.json` and paginated `getCoverage`; no false percentage is assigned.

| Stratum | Status | Current limit | Authorized next observation |
| --- | --- | --- | --- |
| requirements | partial | Proposal documents are not all accepted intent. | Review product contracts with owner; record explicit acceptance separately. |
| source | partial | Artifacts addressable; curated edges are not a complete call graph. | Inspect additional symbols and tests before promoting relationship coverage. |
| messages | partial | Literal background handlers inventoried; dynamic callers/Worker routes only partially traced. | Scoped mock-message fixtures; do not execute live handlers by inspection. |
| tests | partial | 19 baseline failures; references are not passes. | Run allowlisted local fixtures with separate execute consent. |
| docs | partial | Full file inventory; not every narrative claim reviewed. | Source-backed manual review of each proposed/accepted contract. |
| dependencies | partial | Package lock inventoried; no accepted replacement classifications. | Dependency review and upstream compatibility tests. |
| configuration | partial | Secrets are intentionally unaddressable; public configs listed. | Explicit config review; no credentials export. |
| assets | partial | Icon and bundled model viewer addressable; visual rendering not observed. | Opt-in installed Chrome test of shipped resources. |
| persistence | partial | Store schemas/source known; browser-local stores and R2 data not read. | Opt-in sanitized counts/protocol fixtures, never names/contents/tokens. |
| runtime-lifecycle | partial | Service-worker restart/alarm execution unobserved. | Dedicated test profile with sanitized lifecycle events. |
| chrome-dom | unavailable | No installed Chrome verification in this environment. | Opt-in DOM count-only observer plus reproducible manual bucket-switch checklist. |
| r2-network | unavailable | No Cloudflare credentials, live R2 truth, deployed Worker or timing observations. | Separate observation adapter with read scope and explicit preparation/deploy consent. |
| build-release | partial | Windows source absent; CI/release not observed; compatibility date exceeds locked local Worker runtime. | Authorized CI/native build on suitable runtime; deploy separately. |
| incidents | partial | Canonical cases mapped; bug report corpus not automatically clustered. | Append scoped results/counterevidence; no closure without browser evidence. |

Ownership spans settings/markup/popup, service worker and embedded STORAGE Worker, separate ASSETS Worker, OAuth/provider, Nested model/editor, RFIS, local bridge, GitHub workflow, Windows/build, existing inspection/debug and the new semantic layer. All literal background message branches are represented; not every indirect call, Worker action or DOM interaction has a reviewed semantic trace. The asset viewer bundle is inventoried, not audited internally. Product proposals remain proposals.

Offline addressability covers public requirements/documents, source/configuration/assets/dependencies/build/tests and canonical incident records. Credential paths, `.env` including example templates, private profiles/objects/URLs, browser stores and ignored output are deliberately outside enumeration. Symlinks to excluded private paths or outside the checkout fail. This finite inventory does not authorize reading arbitrary files.

Read-only source/graph queries use Node built-ins. The opt-in fixed test workflow requires installed jsdom and local execution authority. The opt-in DOM observer reads counts only; actual installed Chrome was unavailable. There is no service-worker console/message executor, network timer, R2, IndexedDB, deployment or arbitrary file editor adapter. Each needs separate scoped consent and redaction before implementation. Preparation can deploy Workers even on apparent read paths; inspection must never invoke it.

Known unresolved product cases: DBG-001 Nested disabled-state restoration remains open; DBG-002 source/UI and label-precedence conflict remain unclosed; DBG-003 has local fixture verification but no Chrome/R2 verification. Global ordering, focus/draft preservation, large folder pagination and remote failure semantics need further evidence. Existing catalog/debug drift is preserved.

Windows cannot build from the inventoried missing `windows/src/main.c`; the locked Worker runtime cannot satisfy the configured compatibility date. CI, releases and deployments were not observed. No physical 4 GB memory benchmark, fleet trial or full runtime call graph is claimed.
