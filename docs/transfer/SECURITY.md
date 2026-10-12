# Threat and uncertainty boundaries

The source adapter enforces host/scheme/port policies on every redirect, checks all
resolved addresses and pins the socket to a checked public IPv4 address. IPv6,
user-info, browser schemes and nonstandard HTTPS ports are rejected. Explicit
source-host allowlisting, network egress denial of internal/metadata ranges and TLS
hostname verification are required together. Fixture loopback bypass exists only
in directly constructed test adapters and is never exposed in production config.
Gateway URLs and scoped credentials are server-owner configuration, never job input.

Job authentication precedes reads/submission, tenant-scoped destinations precede
persistent acceptance, and object keys reject traversal, controls, reserved staging
prefixes, ambiguous empty segments and oversized UTF-8. Cross-tenant polling and
cancellation return not-found; same idempotency key with swapped source is rejected.
At most one leased job per tenant is claimed. Byte limits apply to declared and
streamed lengths; retries/queue/rate limits bound work. Long total body and short
idle timeouts, bounded parts and incremental hashing protect memory.

The service requires a hardened HTTPS ingress, restricted disk permissions, source
and gateway egress policies, strong per-tenant tokens and one supervised host.
Application tests cannot certify deployment firewall, TLS, secret storage or
provider authorization. Limits are process/local-volume scoped; a distributed
fleet needs a shared transactional store and shared rate/egress accounting. Event
retention/listing is currently unpaginated; operate small scoped queues and plan
pagination/archival before high-volume deployment. The gateway token grants writes
only to its single bound bucket; theft remains a bucket-write threat, requiring
rotation and restricted service access. Private URLs remain in the restricted DB
and browser outbox, not in exported evidence. Browser storage is not a secret vault.

Conditional final creation protects existing keys; replacement is unavailable.
Multipart ETags and user-provided digest metadata are never trusted as content
integrity. Verified requires exact destination identity, exact size and independent
readback SHA-256. Changing content, wrong job identity, missing reads or wrong
bucket leave uncertainty visible. Digest comparison proves the retrieved bytes,
not the trustworthiness of a public origin. No downloaded data or source headers
are interpreted as instructions.

Orphan creation and stale in-flight effects are at-least-once external behavior.
The store fences state, not the entire remote network. R2 lifecycle rules are a
mandatory backstop for a create-upload response lost before its identifier is
persisted. Cancellation never authorizes local cleanup or claims a final object
was deleted. No original or temporary local file deletion is implemented.

Local fixtures cover negative auth/scope/replay, checked DNS, redirect, quota,
validator, same-size corruption, read denial and uncertain publication. Installed
Chrome, live R2 and adversarial deployment tests remain in the acceptance checklist.
