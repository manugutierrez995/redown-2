# Menu status display correction

User screenshots after reconnect showed a stale Connect Cloudflare warning, and a normal Simple menu active description colored red. The same element was serving as mode description and operation/error status. renderRightClickMode changed text without clearing error classes, and successful automatic refresh did not clear the earlier disconnected warning.

Separated mode description from a dedicated live refresh/order status. Mode rendering explicitly restores neutral metadata styling; successful editor refresh replaces stale connection warnings. Failed access checks remain visible in the dedicated status and are not hidden by toggling modes. This addresses the screenshot's display mechanisms; it is not evidence that the user's OAuth grant can renew indefinitely.

Verification: the reconnect regression passes through failed access, successful manual refresh, stale-warning replacement and mode rendering after a prior red class. Three focused reconnect/debug-display tests pass. Syntax and whitespace checks pass. No Cloudflare calls or credentials were used during verification.
