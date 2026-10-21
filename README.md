# REDOWN

**Remote downloads, without the download.**

REDOWN is a Chrome/Edge extension that sends remote files directly to a configured Cloudflare R2 bucket or GitHub repository. The source file does not need to pass through the user's computer.

## Install from GitHub

1. Download this repository as a ZIP.
2. Extract it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Choose **Load unpacked**.
6. Select the extracted repository's **`extension/`** folder.

The selected folder must contain `manifest.json`.

## Cloudflare

REDOWN uses Cloudflare OAuth. Users click **Connect Cloudflare**, authorize REDOWN, then choose or create an R2 bucket.

REDOWN provisions a small Worker bound to that bucket so the data path stays:

```text
remote source -> Cloudflare Worker -> R2
```

The user's computer sends control metadata only.

OAuth publisher:
- Client ID: `d9db0f71eb24cd2eed86b50a650a045e`
- Verified publisher domain: `webrev.online`
- Browser callback: `https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/cloudflare`

No OAuth client secret is embedded in the extension. REDOWN uses Authorization Code + PKCE.

OAuth request scopes:
- `workers-r2.read`
- `workers-r2.write`
- `workers-scripts.read`
- `workers-scripts.write`
- `offline_access` — requests credentials for automatic session renewal. Existing authorizations may need one Reconnect after upgrading. The OAuth client must allow the refresh-token grant.

## Right-click presets

Every saved destination controls its own right-click behavior.

A bucket can be a one-click destination:

```text
REDOWN
  -> webrev-assets
```

or an arbitrary-depth tree:

```text
REDOWN
  -> webrev-assets
      -> 3D
          -> Characters
              -> Heroes
              -> NPCs
      -> 2D
          -> Portraits
```

Each leaf can target its own R2 prefix or GitHub path. Different buckets can have completely different menu depths and defaults.

## GitHub

A GitHub profile can remotely fetch through GitHub Actions:

```text
remote source -> GitHub Actions runner -> target repository
```

REDOWN can install its generic ingest workflow into the selected repository when needed.

## Repository independence

No runtime behavior depends on this repository's name. Destination repository names, Cloudflare accounts, buckets, paths, menu trees, and labels are user configuration.

See `SETUP.md` and `DESTINATIONS.md`.

## Upload from Computer — resilient retry queue

Local files use a separate transfer route from remote right-click downloads:

```text
computer file -> authenticated Cloudflare R2 Object API -> selected bucket/key
```

No REDOWN bucket Worker is involved in **Upload from Computer**. Each file is sent as a raw request body. Before uploading, REDOWN checks the exact R2 object key. If R2 confirms it already exists, the file is **skipped** and counted separately as \"already existed\" (not an error). If the check fails or is incomplete, it does not assume existence and proceeds with the normal upload/retry path. In races where another client creates the key after the check, the direct PUT can still overwrite it; this is not an atomic create-if-absent operation.

The local upload batch uses a **round-robin retry queue**. A file confirmed to exist also leaves the queue without uploading. A file that succeeds leaves the queue. A transient failure (for example, a browser network change, lost response, timeout, HTTP 429 or temporary HTTP 5xx) moves that file to the back while the remaining files get a turn. When all pending files are cooling down, the queue waits until the next becomes eligible. Delays increase with repeated failures and are capped at roughly 60 seconds, plus small jitter. A retryable file has no fixed three-attempt cutoff. Recognized permanent failures (such as authorization failures or oversize files) are reported separately rather than retried forever.

**Keep the REDOWN settings page open during the entire upload.** The queue holds browser `File` objects in page memory; it is not persisted and cannot resume after the settings page/browser closes or reloads. Files do not upload in the background after that. Persistent restart recovery and chunk-level resume are not implemented.

If a request loses its response, REDOWN may not know whether R2 committed the object. The existence check and matching size are **not integrity verification** and must not be treated as proof of a successful overwrite. A later retry may overwrite that key again. For persistent `Failed to fetch` errors, inspect the browser Console/Network logs (for example, `net::ERR_NETWORK_CHANGED`) and stabilize the network. Source implementation exists, but live Cloudflare/Chrome acceptance and interruption tests remain pending.
