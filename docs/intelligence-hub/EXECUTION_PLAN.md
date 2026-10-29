# Intelligence Hub execution ledger

2026-10-29. User supplied the complete master specification in the conversation. It supersedes the missing-input status in ../INTELLIGENCE_HUB_IMPLEMENTATION.md. The original audio/transcript is unavailable; only the explicitly supplied editorial themes may be used, without attribution or uncertain numbers.

## Baseline
- Repository core-ai-jp/core-prism-app; branch codex/intelligence-hub-20261029; main 7dbc799; previous baseline 5381314.
- React 19 / TypeScript / Vite 8 multi-page build, Vercel Functions. Preserve existing corporate, Academy, ROAI, Studio, authentication and price contracts.
- Existing Academy adapter provides Notion identity/history, Redis locks and delivery jobs. Its operations document explicitly does not establish production acceptance.
- Read-only company environment checks confirm GitHub organization write access and company Vercel CLI identity. Contacts and connector access have unresolved historical checks; not needed for this implementation.

## Execution / acceptance
1. Add isolated editorial entry, route metadata, six sourced articles and Toolkit catalog. No replacement of /intelligence.
2. Produce real Japanese guides and editable worksheet; verify PDF rendering and links.
3. Implement resource registration, expiring download, consent verification/withdrawal, durable jobs, CRM adapter and authenticated metrics. Default delivery disabled until configuration and test-receipt verification.
4. Run protected-route regression, unit, typecheck, lint, build, browser responsive and accessibility checks; independently review security changes.
5. Publish only within applicable approval boundaries, verify exact deployment and public behavior. Record every unverified dependency explicitly.

Current status: implementation checkpoint / runtime acceptance pending. No Hub production completion claimed.

## Implementation checkpoint
- Added 14 dedicated routes (six articles, catalog/LPs/self-check/confirmation/admin), scoped styles, canonical/OG/Article metadata and existing corporate footer links.
- Completed real files: 24-page harness, 17-page enterprise guide, 8-page worksheet guide, editable CSV and Markdown templates. Reproducible generator plus campaign QR generator.
- Added disabled-by-default intake/download/verification/withdrawal APIs, immutable participation plus versioned receipt/consent history, durable receipt jobs, shared-lock Notion adapter and authenticated aggregate report.
- Day 0/2/5/8/12 have full draft copy in EMAIL_DRAFTS.md, but are drafts only; no marketing scheduler or actual campaign sends enabled.
- 951 unit tests pass; 4 standalone baseline tests pass; build, new source lint and API typecheck pass. Repository-wide lint and dependency advisories remain existing debt (QUALITY_REPORT.md).
- Preview deployment is being verified. Production Hub release, runtime configuration and real-recipient/CRM acceptance remain pending. No completed production funnel is claimed.

## Concurrent-main reconciliation
Before handoff, main advanced to 7117c17 (Academy membership). Merged it without conflict, preserving all Academy routes and protected membership APIs. Full suite after merge: 953 tests / 73 suites; build passed. No changes to those imported components were made by Hub. Added a read-only Hub route/admin-denial monitor for the existing daily CI schedule; activation awaits a verified production origin.
