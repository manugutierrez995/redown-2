# Gallery lightbox and preview pane

The lightbox now uses a full-viewport charcoal backdrop, restrained warm typography, floating circular navigation arrows, a small accessible Close control and a quiet keyboard hint. Mobile arrows move below the media. Reduced motion is respected. The original media and existing navigation/request handling remain in use.

The preview pane shares the palette and spacing, places the filename above one organized control row, separates metadata with a fine rule, and labels the original-file link instead of exposing a raw blob URL. Full paths remain in metadata and the filename tooltip. Clicking the preview image opens the lightbox. At narrow widths, the preview is available beneath the file area rather than hidden by the old sidebar breakpoint.

Validation: npm run check and git diff --check passed. Ten focused lightbox/private-file tests passed; the Tab regression now follows the intentional new visual/DOM control order. Chromium using actual options files with mocked Chrome/API data verified opening, keyboard navigation, updated media, Escape and return-to-pane behavior. Lightbox viewed at 1366 and 390 widths; preview layouts at 1366, 390 and 320 had matching client/scroll widths. Desktop and narrow screenshots inspected. This is UI verification, not live OAuth or every media codec verification.

No new font download, framework, image-generation asset or runtime dependency was introduced.
