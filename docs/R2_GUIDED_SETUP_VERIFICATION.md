# Guided R2 setup

Normal settings now offer **Use this bucket**, which invokes existing preparation and write verification, then reloads saved profiles, location editors and Explorer inventory before reporting ready. Already configured profiles avoid forced deployment; Debug retains explicit repair. Popup listens for profile changes and preserves an existing selection when possible.

An explicit R2 signup/activation error displays a neutral next step with an account-specific dashboard link and Check connection. Generic permission/network errors remain errors. Empty active storage continues to offer bucket creation. Dashboard activation remains in Cloudflare; REDOWN does not activate a paid subscription itself.

Verification on 2026-10-21:
- `npm run check`, `node --check extension/popup.js`: passed.
- Options UI and Cloudflare file tests: 10/10 passed before adding the final provisioning refresh fixture.
- Final options UI tests: 5/5 passed, including provisioning → profile/editor/inventory refresh and no redeployment for an existing profile.
- Full suite: 143 tests, 116 passed, 27 failed. Unchanged origin/main baseline: 141 tests, 114 passed, 27 failed. Failure names match exactly. Existing catalog/source freshness and stale harness failures were not hidden by hash updates or relaxed assertions.

Not verified: live Cloudflare OAuth/signup, deployed Worker, actual browser popup updates and fresh installation end-to-end. Activation detection uses explicit provider wording; unknown errors remain visible rather than being assumed to mean activation required. Existing saved profiles remain the existing readiness shortcut; this change does not independently re-verify every old Worker.
