# Quality report, 2026-10-29

## Verified locally
- Full unit suite: 946 tests passed at first completed run; additional receipt-history tests subsequently added (see final ledger).
- Protected-route Node tests: 4 passed. Production public HTML GET checks: /corp, /roai-score, /academy/, /intelligence, /pricing passed. These do not establish customer workflow acceptance.
- TypeScript frontend/build and explicit API typecheck passed. New Hub source lint passed.
- Browser: 1440/1280/768/390/375 x four representative routes: no horizontal overflow or runtime exception. Marketing defaults off; attribution survives internal navigation; disconnected API failure is visible. Actual iPhone not tested.
- Lighthouse local mobile /insights: performance 100, accessibility 100, best practices 96, SEO 100, LCP 0.8s, CLS 0. Favicon and accessible logo-name issues repaired after this run; final run recorded separately.
- QR decoded to exact campaign URL at 360 and 720 pixels. This is software decoding, not a physical projected/printed iPhone test.
- PDFs: 24/17/8 pages, Japanese text extraction, all pages rendered. Revised to a narrow portrait workbook for readable mobile text; source and templates included. Final visual review recorded separately.

## Existing-repository debt, not silently fixed
- Full lint: 1,072 errors and 102 warnings across the repository. New source checked separately. No broad unrelated formatting/refactor.
- npm audit: 32 advisories (1 critical, 22 high, 8 moderate, 1 low) in the unchanged dependency graph. No new runtime dependencies. Audit is a package advisory scan, not an exploitability assessment.
- Secret-pattern review found existing source credential fallbacks and test fixtures. Values suppressed. Hub uses its own explicit HUB_ADMIN_KEY with no fallback; new lead intake stays disabled. Existing fallbacks require a separately coordinated remediation/rotation to avoid breaking current clients.
- Existing route generator updates Academy's stale generated metadata from its already-committed source; no price or Academy component changes are introduced by Hub. Record this generated drift explicitly.

## Independent review and repairs
Read-only reviewer found and rechecked async error handling, queue starvation, shared CRM locking, token resurrection, withdrawal scope and campaign retention. Second pass identified receipt-history overwrite: corrected by immutable participation record plus append-only receipt/consent generations. Interrupted sends are moved to operator review, not resent. Marketing execution remains disabled.

## Remaining acceptance
Live form/Redis/CRM/mail receipt, consent withdrawal under real adapters, physical QR, TimeRex confirmed bookings, revenue attribution, retention/deletion tooling, sender/domain and legal review. Do not label these complete from mock tests.

Final local checks: 950 tests across 72 suites passed; Hub-specific 21 tests include actual PDF bytes, consumed-token replay, immutable registration across month rollover, withdrawal stickiness and interrupted-send review. Latest Lighthouse mobile run: 100/100/100/100 (performance/accessibility/best practices/SEO). All results are local, not production CWV field data.
