# ReDown Simple right-click menu — canonical behavior and current state

**Recorded:** 2026-10-10 (America/Chicago)  
**Scope:** Simple right-click mode, not Nested mode and not the Basic/Premium/API tiers.  
**Status:** User-approved requirements; partial source implementation. Human Chrome testing and some preference controls remain pending.

## Non-negotiable interaction contract: ONE popup level

**Simple Mode has exactly ONE REDOWN destination popup level.** In Chrome's native context menu, the user opens **REDOWN → destination** and clicks to transfer immediately. A configured destination MUST NOT create a further submenu such as **REDOWN → preset → Default location / named option**. No matter how many nested folders the remote target contains, that filesystem depth is **not** represented as right-click menu depth. If multiple destinations are configured, they are sibling menu items directly under REDOWN, not nested under a parent preset.

This is the defining difference from Nested Mode. It is not an ordering mechanism or a limitation imposed by Chrome. The older implementation's extra `simple:<profile>` submenu was a code design choice, not necessary for Simple Mode.

## The displayed name

A user may explicitly enter a **Menu label** for a Simple destination.

1. **Nonempty menu label:** Use that exact chosen label.
2. **Empty menu label:** Derive a label automatically from the configured destination, using a **user-selectable fallback preference**:
   - **Lowest/deepest directory (default):** Show the last directory segment of the selected prefix; when the destination is the bucket root, show the bucket name.
   - **Highest/root (bucket):** Show the selected bucket name, even when the destination includes deeper directories.

Examples with bucket `meme-material` and destination `sexy_shit/ozempic`:

| Menu label | Fallback setting | Visible item |
| --- | --- | --- |
| `my favorites` | Either | `my favorites` |
| *(empty)* | **Lowest/deepest directory — DEFAULT** | `ozempic` |
| *(empty)* | Highest/root bucket | `meme-material` |
| *(empty)* | Either, bucket root destination | `meme-material` |

**Current implementation distinction:** Commit `c172731` flattened Simple destinations and provides explicit-label or deepest-folder-then-bucket fallback, and now exposes the two-choice fallback preference as of commit `22d7ed9`. Both modes are implemented in source; Chrome testing is pending. Do not claim it has been implemented or tested. The future preference should apply consistently to primary and additional Simple destinations, persist after reload and fall back safely for older saved profiles.

## Destination editor rules

- The **menu label** is independent of the destination path. An empty label means use the fallback rule, not omit the menu item. In particular, additional Simple options with a blank label must remain selectable.
- Each Simple destination may point to a bucket root or any depth of directories; the chosen remote path controls the transfer, while only one flat destination entry appears in the menu.
- There is a distinct bucket selector and location rows. Every row offers an **×** to clear its selected segment without deleting Cloudflare folders or objects. Clearing a parent also clears dependent selections but **retains the lower rows** as reusable blank dropdowns.
- At every eligible level, the **new directory** input is separate from selecting an existing folder. Dropdown selection must never fill that creation input. Only an explicit **Create** operation creates a remote folder under the exact selected bucket/parent prefix; async errors cannot report success.
- Small edits should update only affected path rows and descendants; avoid replacing the entire settings panel, resetting sibling cards, focus, typed drafts or scroll position.
- Existing paths are verified against their selected parent. Do not display a saved path as verified when it was never found; do not let stale responses from another parent/bucket override the current selection.

## Ordering is separate from hierarchy

The existing **Order** field is a preset ordering control, **not** a submenu-depth setting. Additional Simple destinations follow their saved array order within each preset and now offer Move up / Move down controls. Flattening into one REDOWN level does **not** automatically establish a globally sortable list. Cross-preset interleaving and globally independent ordering remain **proposed/pending**; within-preset Move up / Move down is implemented in source. Such a control must not bring back an extra submenu. Sorting must have stable, deterministic behavior and preserve the chosen target.

## Implemented versus pending

| Topic | Current source state | Still required |
| --- | --- | --- |
| One-level REDOWN Simple destination list | Source fix `c172731` | Automated run and human Chrome verification |
| Custom label or default to deepest folder/bucket root | In source `c172731` | Human verification, including blank labels |
| **Optional bucket-name fallback for blank labels** | Source commits `70a7c26`, `22d7ed9` | Test preference persistence, migration and Chrome behavior |
| Simple path editor, per-row ×, explicit directory creation | Source fixes `7c1b0d6`, `3ac4496`, `376d933` | Test execution, Chrome/R2 end-to-end check |
| Preserve descendant rows as blank after parent removal | Intended by path editor | Regression and browser verification |
| Within-preset ordering for additional destinations | Move up/down implemented (`22d7ed9`) | Verify persistence and Chrome order; global interleaving still pending |
| Right-click transfer to exact account/bucket/prefix | Existing handlers use stable `quick:` and `simple-option:` IDs | Verify all targets, fallback/root cases and after reorder/reload |
| Slow/unnecessary panel rerenders | Some subtree changes are local | Verify BUG-016 acceptance, focus/drafts/scroll |
| Global Simple/Nested switch | Existing UI/configuration | Preserve both configurations when switching |

## Human acceptance checklist

1. Configure primary and additional Simple destinations, including one deeply nested path.
2. On a webpage, right-click a supported link/image and open REDOWN: **one popup**, each Simple destination immediately clickable, **no second preset submenu**.
3. With a custom label, verify that exact label. With a blank label, verify that the **default is the lowest/deepest directory** and bucket name is used at the root.
4. Once the future fallback setting is implemented, switch to **highest/root bucket** and confirm blank labels show the bucket name regardless of folder depth; explicit labels must remain unchanged.
5. Select/click each destination and check the actual Cloudflare target path. Reopen Chrome and ensure labels/settings/locations remain stable.
6. Remove an ancestor row using ×: descendants remain visible but blank and cannot silently reuse their old paths. Reassign the new parent and descendants using the dropdowns.
7. Explicitly create a new folder using its input and Create; confirm selection alone causes no creation.
8. Order and label changes should not create more menu levels or reset other Simple configuration state.

## Engineering links and history

- Relevant implementation: `extension/background.js` `buildMenus()`, `extension/options.js` `simplePrimaryLocationField()`, `simpleExtraOptions()` and `simpleFolderPathEditor()`.
- Flat-menu regression: `tests/simple-menu-flat.test.mjs` (`0f88e43`), **written but not reported executed**.
- Existing UI regression: `tests/simple-location-rows.test.mjs` (`b6f2cda`), **written but not reported executed**.
- Source change: `c172731`. Bug tracker status and order distinction: `bugs/README.md`, last updated at `d7ff22e` for the flat menu issue.
- Debug case: `docs/debug/DBG-002_SIMPLE_LOCATION_ROWS.md` and its structured journal. Tests, Chrome outcomes, and compatibility findings must be appended as actual evidence, not inferred from a commit.

**Guiding principle:** Simple describes the right-click experience: **REDOWN → one destination click**. Paths may be deep; the menu may not be. Labels are chosen explicitly or generated by the selected fallback rule; the **default generated label is the lowest/deepest directory**.

## Implementation progress — 2026-10-11

**Source changes on main; automated and installed-Chrome verification still pending.**

- `70a7c26`: The menu builder now reads a persisted `simpleLabelFallback` preference (`deepest` or `bucket`). Unknown/older values default to deepest. Explicit labels always override the preference. `chrome.storage.onChanged` rebuilds the native menu when the preference changes.
- `22d7ed9`: Simple settings expose the preference (“Lowest directory (default)” / “Top bucket name”). Additional Simple destination cards provide **Move up** and **Move down**, reorder their stored option array and move the corresponding existing DOM card instead of remounting the editor.
- `e896f3b`: Added tests for the bucket-name fallback, the unchanged explicit-label override, and flat one-level Chrome menu structure; previously added flat-menu tests still cover deepest default.

**Scope limitation:** Ordering is currently stable **within each preset's additional destinations**, while preset `Order` controls ordering between presets. No independent global interleaving of default and additional destinations from different presets is supported. These tests have been authored but have not been executed in the present session. Human Chrome checks and real transfer routing remain necessary. No source change in this update affects Nested mode or directory creation.

**Acceptance for this change:** With a blank label and `images/portraits/final`, the default shows `final`; choosing Top bucket shows that destination's selected bucket instead. A custom label remains unchanged in both settings. After reordering additional options, the next REDOWN menu uses the new sequence without adding a second submenu, and the selected targets remain unchanged.

## Label-source selector correction — 2026-10-11

**Implemented in source, human Chrome testing pending.** The Simple Mode label-source dropdown now has **three** choices:

1. **Menu Label (DEFAULT)** — use the explicit Menu label text; if it is blank, safely fall back to the deepest directory name, or bucket name for a root destination.
2. **Lowest directory** — use the deepest selected directory name (or the bucket name for a root destination), regardless of any manually typed menu label.
3. **Top bucket name** — use the destination's selected bucket name, regardless of any manually typed menu label.

An absent or unrecognized saved preference resolves to `menu`, preserving the intuitive behavior for existing profiles. Existing persisted values `deepest` and `bucket` retain their exact meaning. This supersedes the earlier assertion in this document that an explicit label always overrides either automatic naming mode.

Source commits: `bd17338` (menu resolution), `38feaea` (dropdown), `c3b722c` (regression tests). Tests have been committed but not independently executed here. No change to the **ONE popup** rule or destination transfer paths.

## Compact path-row layout — 2026-10-11

**Source styling committed; human visual Chrome testing pending.** Simple Mode's folder editor rows now use a five-column grid scoped to `.simple-location-row`, ordered **existing folder dropdown → new-directory input → Create → + Child → ×**. The delete/clear `×` is a compact square, aligned at the far right of the **same row** and never deliberately placed below it. Dropdown and input widths and gaps have been reduced, including at narrower viewports. The change is scoped to Simple Mode; the generic four-column builder used elsewhere is not modified. No folder-selection, clearing, persistence or remote mutation logic was changed.

Commits: `c2e88cc` (row class) and `c25a922` (CSS). Browser acceptance: confirm visually at 1366×768 and smaller responsive windows that all five controls stay aligned without clipping, that long folder names are reachable in the native dropdown, and that keyboard focus and row actions still work. **Not independently Chrome-verified yet.**
