# Explorer label cleanup

- Account sidebar buttons now fill their container, align left, and truncate long names with an ellipsis. A tooltip retains the full account name. The button background is explicitly styled instead of inheriting the browser default.
- Move to and Send to destinations display bucket names only. With multiple accounts, a single account heading groups each account's destinations; the click callbacks retain their original account IDs, names, bucket names and operation.
- Context menus have viewport-bounded dimensions and scrolling, with ellipsis/tooltips for long option labels.

Verification: headless Chromium with synthetic long account names measured sidebar button width 161px inside a 161px parent, overflow hidden and ellipsis active. The actual Explorer menu rendered bucket-only destination options. Desktop screenshot inspected. Settings layout checked at 1366, 900, 768, 390 and 320px using mocked local data, not live Cloudflare. Full suite: 124 tests, 97 pass, same 27 existing failing names. npm run check and git diff --check pass. No transfer routing or cloud operations were changed or exercised.
