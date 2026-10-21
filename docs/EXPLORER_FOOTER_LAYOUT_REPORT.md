# Explorer footer and preview layout correction

Removed the file column's independent maximum height and gave the desktop Explorer body a shared bounded height. The file list flexes through the available space and scrolls internally; sidebar and preview retain their own scrolling. Pagination is the last file-column child, with error/status text above it, so it sits directly against the bottom status bar.

Pagination now places item range, a content-sized page-size selector and page buttons on one compact desktop row. Narrow screens may wrap the controls without horizontal overflow. Overrides are scoped to the pager so ordinary form fields retain their existing sizing.

Preview file navigation and viewing actions are explicit groups with intrinsic minimum button widths and wrapping. Folder previews no longer inherit tiny arrow-sized grid slots. The folder icon is bounded, with separate centered heading and instruction blocks.

Validation: npm run check and git diff --check passed; 12 focused lightbox/private-file tests passed. Actual-options Chromium fixture with mocked Chrome/API data and 80 synthetic file rows confirmed the pager bottom exactly matches its file-column bottom at widths 1366, 1024, 390 and 320; no horizontal file-column overflow. Desktop pagination stays in one row; narrow layouts wrap. Folder buttons' scroll widths matched client widths. Desktop screenshot inspected; no page errors. Live cloud behavior was not exercised.
