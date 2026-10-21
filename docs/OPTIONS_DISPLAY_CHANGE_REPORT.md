# Options display cleanup

User-requested presentation change; runtime message contracts and transfer implementation unchanged.

- Premium file index, GitHub destination creation/settings, and bucket Worker details/actions are debug-only. Existing GitHub profiles remain stored and available to existing runtime routing.
- Debug Mode control is the final settings section. Its single listener is installed during page initialization; saved state is loaded before profile rendering. Previously it was installed inside successful bucket preparation and read debug state from a profiles-only storage result.
- Bucket selection uses a keyboard-accessible name-only button with a pressed state. Selection does not provision remotely; explicit debug repair retains the original provisioning handler.
- Debug switching changes visibility without rebuilding destination editors or losing unsaved drafts.
- Inline CSS hides debug surfaces before asynchronous initialization and makes the hidden attribute authoritative against display rules. Bucket grid minimum width is bounded by the available viewport. These address source-level initial visibility/overflow mechanisms, not proof of every reported delayed-layout symptom.

Verification on 2026-10-20:

- Unchanged main baseline: 114 tests, 87 pass, 27 fail.
- Updated suite: 116 tests, 89 pass, same 27 failing test names; no new failing names. Frozen source/evidence assertions were not refreshed or weakened.
- Two new JSDOM tests verify initial CSS visibility, final switch placement, name-only buttons, selection without provisioning, debug switching/persistence and separate repair dispatch.
- npm run check and git diff --check pass.
- Live Chrome rendering, repeated-load visual stability, Cloudflare sign-in and real Worker deployment are unverified. No cloud mutation was performed.
