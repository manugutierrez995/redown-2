# Hitomi right-click ZIP → R2: first implementation and acceptance

Implemented on main with Chrome MV3 scripting permission and narrow `https://hitomi.la/*` host access. This is an initial, explicitly user-triggered adapter, **not yet live Chrome/R2 verified**.

## How to try
1. Reload the unpacked `extension/` folder at `chrome://extensions` after updating main; Chrome may ask for permission to access hitomi.la.
2. Connect and verify the desired R2 bucket in Redown settings. Ensure its Simple or Nested right-click destination is configured.
3. Open a Hitomi gallery page. Right-click the **Download** button and choose REDOWN → the intended destination.
4. Redown injects a transient hook in that tab, activates the site's download button, and captures the ZIP Blob constructed by the site; the isolated content script reads its Blob URL in 256 KiB pieces, passing them through extension messages for an authenticated Worker upload.
5. Check Redown's transfer history and R2 Explorer for the ZIP. Do not rely solely on a notification to prove content integrity; download/open the archive and compare its byte count.

## Important caveats
- This first slice has a **64 MiB ZIP ceiling** and buffers the assembled file in the MV3 worker. A scalable follow-up must use persistent bounded streaming or multipart upload; not suitable for huge galleries yet.
- Gallery ZIPs must be exposed through `URL.createObjectURL(blob)` after the button is activated. Pages that use a different save path may not be captured.
- The page's normal download might still occur depending on FileSaver's dispatch behavior; treat R2 verification as authoritative. Never delete local copies automatically.
- If Chrome suspends the extension worker during a long download, the in-memory transfer must be retried. A durable session store and resumable upload are future work.
- Capture is tab-scoped and initiated by an explicit context-menu choice. Site-side script can still interfere with events; this is not a secure provenance guarantee. Keep permission limited to supported sites.
- No credentials are injected into the webpage; the extension background performs the authenticated R2 Worker request.
- There is no claim that this eliminates traffic through the user's computer: **JavaScript-generated ZIP bytes must travel from browser to R2**. A truly remote-only Worker fetch is possible only for replayable remotely accessible file URLs.

## Required live acceptance (pending)
- Small Hitomi gallery (<=64 MiB): verify expected ZIP name, size, archive CRC/open, selected bucket/key, transfer record.
- Simple root and nested destination, two different buckets, overwrite behavior.
- No accidental upload for unrelated right-clicked page links.
- Large ZIP >64 MiB: understandable failure and no falsely reported success.
- Tab closed, transient extension-worker restart, network failure, denied R2 access; ensure no success is emitted.
- Check whether a duplicate local download occurs. Do not cancel an existing download before R2 verification.
- Reproduce on a local JSZip fixture as a stable regression test; eventually add Playwright Chrome extension/R2 mock integration.

Implementation files: `extension/background.js`, `extension/hitomi-capture.js`, `extension/manifest.json`. Previous native-download interception PRs #14–16 are not restored.
