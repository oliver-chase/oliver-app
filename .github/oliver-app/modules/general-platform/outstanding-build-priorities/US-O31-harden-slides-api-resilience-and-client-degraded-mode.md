---
ID: US-O31
Title: Harden Slides API Resilience and Client Degraded Mode
Status: Done
Verified: true
Backdated: 2026-04-25
---

As a slide editor user
I want backend failures to degrade safely with clear recovery
So editing is not blocked by opaque Cloudflare/worker exception payloads

Acceptance Criteria:
- [x] All slides API failures return structured JSON envelopes with correlation identifiers (no raw HTML error page passthrough).
- [x] Client error parser summarizes transport failures and surfaces correlation id/ray id when available.
- [x] Autosave retry behavior classifies transient vs terminal failures and avoids infinite noisy retries.
- [x] Library/audit/template endpoints fail independently without collapsing the full slides UI.
- [x] Degraded mode path is defined (read-only or local draft mode) with clear user messaging and retry controls.
- [x] Observability captures failure class, endpoint, actor, and correlation id for incident triage.

Implementation evidence (2026-04-26):
- Implemented structured slides error envelopes in `functions/api/slides.js`:
  - Canonical `error_detail` payload with `failure_class`, `retryable`, `correlation_id`, `ray_id`, endpoint/method/actor fields.
  - Added response header `x-slides-correlation-id`.
  - Sanitized HTML upstream failures into safe runtime messages; no raw HTML passthrough.
  - Added structured failure logging (`[slides-api-failure]`) for incident triage.
- Updated `src/lib/slides.ts`:
  - Added robust envelope parser (`parseSlideErrorPayload`) and enriched `SlideApiError` metadata.
  - Surfaced correlation/ray metadata in client error strings.
  - Added retryability/failure-class-aware fallback handling and runtime health signaling (`getSlidesRuntimeHealth`, `subscribeSlidesRuntimeHealth`).
- Hardened autosave + degraded mode in `src/app/slides/page.tsx`:
  - Added retry budget (`AUTOSAVE_RETRY_MAX_ATTEMPTS = 5`) and transient/terminal branching.
  - Prevented infinite noisy retries by pausing autosave after budget exhaustion.
  - Added explicit local-draft degraded banner with correlation/ray display and retry/dismiss controls.
  - Improved library refresh isolation so non-blocking endpoint failures keep existing UI data instead of collapsing tabs.
- Added regression coverage:
  - `tests/contracts/slides-api.contract.test.mjs` verifies structured 401 envelope and sanitized upstream HTML failure with ray/correlation metadata.
  - `tests/e2e/slides-regression.spec.ts` adds degraded-mode retry-budget exhaustion scenario and keeps autosave-recovery coverage.
