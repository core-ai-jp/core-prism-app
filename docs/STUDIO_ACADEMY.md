# CORE Studio Academy

The Academy landing page and corporate Academy page start with a choice between general AI learning and a dedicated three-month AI video program at `/academy/studio`.

The studio curriculum and plan numbers are defined in `public/academy/studio-curriculum.json`. Regenerate the static LP with `python3 scripts/generateStudioAcademy.py`. The public page contains course descriptions, not protected lesson materials. Weekly details and FAQs use native HTML disclosure controls and work without JavaScript.

Standard monthly prices: JPY 300,000 / 500,000 / 700,000 excluding tax, with 10% inclusive monthly and three-month totals displayed. Delivery schedules, practice outputs and coaching scope are standard program designs, confirmed in writing before contracting. Tool credits and advertising spend are excluded. Revenue and mastery are not guaranteed; example service prices are exercises, not historical results.

Existing Academy registration and B2C membership flows remain unchanged. No payment product, live advertising, subscription or content access is enabled by this change.

## Validation

- TypeScript project build and Vite production bundle.
- Existing Vitest suite and static factual checks.
- Desktop and 375/390/430 CSS-pixel responsive layout, disclosures, fee totals and navigation.
- Verify `/academy/`, `/corp/academy` and `/academy/studio` on the deployed domain.

## Sources for model names

Checked 2026-11-12: [Cinema Studio 4.0](https://higgsfield.ai/blog/cinema-studio-4-0-complete-guide), [Seedance 2.5](https://www.capcut.com/newsroom/giving-creators-more-control-with-dreamina-seedance-2-5-and-dola-seedream-5-0-pro). Availability depends on account, region and provider plans.

## 2026-11-12 visual and offer revision

The Studio landing page uses the owner-requested reference-matched hero artwork and Mincho headings. `studio-hero-20261112.png` is a generated edit of the supplied Academy visual; the existing general Academy poster is preserved. No event date, venue, capacity or sales result was added. Image copy is also represented in accessible page text.

The revised offer flow presents tangible learning deliverables, the practice/review cycle, a clearly attributed existing CORE Studio production example, intent-to-plan navigation and the scope of coaching hours. Existing plan prices and curriculum data are unchanged. Performance/conversion uplift is not yet measured.
