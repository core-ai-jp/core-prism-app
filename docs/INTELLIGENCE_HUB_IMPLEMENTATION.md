# CORE Intelligence Hub implementation

Status: superseded by [current execution ledger](intelligence-hub/EXECUTION_PLAN.md). Complete master specification was supplied in the subsequent owner message; original audio remains unavailable. The baseline below is historical evidence.

## Baseline, 2026-10-29

- Repository: `core-ai-jp/core-prism-app`, isolated branch based on `7dbc7992e874afa40899ee7cd1585dbf841269cc`.
- Existing React / TypeScript / Vite multi-page application and Vercel Functions remain in place. No framework migration or new service subscription.
- `/corp`, `/roai-score`, `/academy/`, `/intelligence`, pricing and customer management must remain compatible.
- Academy already implements Notion customer/attendance records, Redis locks/outbox, email ownership verification, optional marketing permission and TimeRex navigation. See `docs/ACADEMY_OPERATIONS.md`. Implementation existence does not establish live delivery or booking.
- Existing `/intelligence` is a product page. Do not replace it with an assumed Hub information architecture.
- Observed production deployment: `dpl_2U2HiQaFkftcUEVZrNNXardmBb6S`, aliases include `www.core-ai.jp`. Platform Ready is not application acceptance.
- Existing checkout has unrelated edits; all work stays on this isolated branch.

## Required source inputs

`CORE_Intelligence_Hub_Codex_Master_Prompt.md` and the lecture audio/memo were not available in the conversation or searched local locations. Request their actual paths or attachments. Do not claim to have loaded them, invent lecture quotes or infer their detailed requirements. Reconcile the following provisional phases with the master before building dependent functionality.

## Implementation sequence

1. Record baseline and add bounded, credential-free public-route regression checks. Test failure modes locally; use GET only for public HTML. This is safe to implement before the missing specification arrives.
2. Read master and audio/memo; map each requirement to existing modules, acceptance checks and source evidence. Record ambiguous statements explicitly. Verify Codex and Claude Code technical claims against official documentation with retrieval dates.
3. Build additive Hub pages with existing stack and scoped styling. Reuse official assets and routing contracts. Review desktop and 375/390/430px rendering, keyboard navigation, errors and loading states.
4. Produce the actual free PDF from approved source material; inspect every page, Japanese fonts, links and QR decoding. Keep editable source and source references. Do not advertise an unfinished download.
5. Implement registration and material delivery using verified existing persistence and mail infrastructure. Keep required processing acknowledgement separate from optional marketing consent, default marketing off, verify email ownership, support withdrawal and recheck consent at send time. Reuse customer identity only through authorized verified matching; do not change anonymous users' existing permissions.
6. Add deduplicated durable delivery/CRM states, bounded retries and reconciliation for uncertain writes. Never equate mail-provider acceptance with receipt or TimeRex navigation with a completed booking. No real marketing sends during tests.
7. Run targeted unit/integration tests, repository checks and independent security review for identity/consent/write flows. Test synthetic data through designated test adapters before approved live acceptance. Keep sensitive content out of logs and public Git.
8. Release the exact reviewed commit through the existing authorized deployment workflow. Verify public routes/assets and the actual funnel; record rollback commit/deployment, test receipts and remaining limits. No new subscriptions or paid API calls.

## Acceptance ledger

| Deliverable | Current state |
| --- | --- |
| Master and lecture sources | Missing; dependent implementation held |
| Existing system inventory | Source inspected; runtime acceptance pending |
| Public route regression harness | Implemented; 4 offline tests passed; added to existing CI unit job |
| Hub UI and completed PDF | Not implemented |
| Hub registration / CRM / delivery / consent | Not implemented; existing Academy integration identified |
| Mobile/desktop visual verification | Not performed |
| Hub production URL and end-to-end verification | Not available |

Run `node scripts/check-hub-baseline.mjs https://www.core-ai.jp` for public HTML identity checks. Run `node --test scripts/check-hub-baseline.node-tests.mjs` for offline safety/failure checks. These checks do not validate rendered UI, authentication, CRM persistence, pricing values, email receipt or bookings.

## Initial verification receipt

2026-10-29 09:42 UTC: `/corp`, `/roai-score`, `/academy/`, `/intelligence` and `/pricing` each returned HTTP 200, HTML content, the expected title marker and viewport metadata. Requests followed no redirects, used no authentication and called no APIs. This verifies existing pages only, not a new Hub release.

Offline verification: 4 tests passed under Node 24.21.0. Covered origin validation, observed GET-only/no-cookie/no-authorization requests to a real local server, wrong-page HTTP 200 responses, incorrect MIME, missing viewport, HTTP failures and redirection response rejection. CI execution is not yet observed; no workflow was dispatched.

Independent source review identified overly broad title matching; repaired corporate/Prism entry identifiers and added cross-entry misrouting tests. Pricing shares Prism HTML, so this check cannot prove that its client-side pricing view renders.
