# REDOWN

<p align="center">
  <img src="mascot-rodn.png" alt="REDOWN mascot" width="180">
</p>

**Remote downloads, without the download.**

REDOWN is a browser extension for organizing and transferring files to Cloudflare R2. Send supported remote files to your storage without first saving them to your computer, or upload files directly from your device.

## What you can do

- **Remote downloads:** Send supported files from the web to a selected R2 destination.
- **Your locations, your way:** Organize buckets and folders using simple or nested right-click menus.
- **Browse and manage:** Explore your configured R2 locations from the extension.
- **Upload from your computer:** Select local files and transfer them to R2 with retry handling for temporary failures.

## Get started

1. Download the repository ZIP and extract it.
2. Open `chrome://extensions` in Chrome (or your browser's extensions page).
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the `extension/` folder.
5. Open REDOWN, choose **Connect Cloudflare**, and authorize access to your R2 storage.

For remote transfers, REDOWN uses a Cloudflare Worker to send data to R2 without routing the file contents through your computer. Local uploads use a separate direct-upload path.

**Note:** Keep the settings page open until local uploads finish. An interrupted upload session does not currently resume after closing or reloading that page.

## License

REDOWN's original materials are provided under the [REDOWN Proprietary Source License 2.0](LICENSE). Reuse requires prior written permission, subject to applicable law and existing third-party rights.

## Chrome Web Store preparation

See the [pre-submission checklist](docs/PRE_SUBMISSION_CHECKLIST.md) and [store candidate status](docs/store/README.md). Build a candidate with `python scripts/package_chrome_store.py`.
