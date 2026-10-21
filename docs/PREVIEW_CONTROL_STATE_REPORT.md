# Preview expansion control correction

The grouped preview layout exposed a positional-selector bug: `.preview-head button:last-child` matched the Next arrow inside its own group. Expansion changed that arrow's label instead of the actual Expand/Collapse control. Opening Lightbox reset the expansion flag and layout but previously left the expansion button label unchanged.

Dynamic file and folder buttons now carry explicit action identifiers. The shared synchronization function updates only those controls (and the initial static controls), including aria-expanded/aria-pressed. Expansion toggles call it, and lightbox open/close calls synchronize both modes. No positional selector or button-text matching determines action identity.

Validation: 13 focused lightbox/private-file tests passed; npm run check and git diff --check passed. Added regression repeats Expand/Collapse three times, asserts both arrows keep their labels, then exercises Expand → Lightbox → Escape → Expand and verifies actual layout classes and control labels. Chromium actual-options fixture repeated these transitions, checked labels and desktop/mobile lightbox behavior, with no page errors. Chrome/API data was mocked; no live cloud behavior is claimed.
