# Architecture and authority

## Existing infrastructure, additive module
Vite multi-page HTML entry → isolated Hub React bundle → Vercel /api/hub → existing Redis REST adapter. No framework migration, new SaaS or duplicate Supabase schema. Existing Academy Notion lead adapter is reused only after email verification and a separate HUB_CRM_ENABLED gate. Existing prices, checkout and ROAI are not changed.

## Data
- content_items/resources: versioned src/hub/content.json and generated HTML. Files in data/toolkit, served by allowlisted server download, not public asset paths.
- lead_profiles: hub:v1:lead:{normalized-email-hash}; first anonymous identity frozen. Shared mailbox, address changes and multiple identities require operator reconciliation; email alone must not force a merge of unrelated people.
- registrations/campaign participation: separate stable email/resource/event/campaign key. A new expired download request rotates tokens. Consent evidence records policy version/time/source independently.
- opaque download/verification tokens: 256-bit random, server lookup by hash, fixed 24h expiry; verification consumption is recorded. Immediate download does not prove email ownership.
- jobs: persistent receipt state pending/sending/sent/uncertain/expired. Uncertain transport is not blindly retried. Separate CRM jobs; shared Academy lock prevents concurrent creation races.
- audit_logs: operation IDs and state codes only, bounded to last 10,000 entries. No raw email/body/secret logging.

Preview uses a separate hub:preview:v1 namespace and requires an explicit HUB_TEST_CRM_LEADS_DS; it cannot fall back to the production CRM data source.

Redis is the Hub intake and consent source of truth; Notion remains the CRM source of truth for actual commercial stage and revenue. Hub cannot infer contracts, payments or confirmed bookings. Notion's existing marketing permission is not overwritten by Hub consent. Hub withdrawal is scoped explicitly to AI Toolkit email; it does not alter separately enrolled Academy/LINE subscriptions.

## Security
Same-origin JSON writes, 8KiB input limit, field/enum/attribution validation, honeypot, distributed IP and email limits, no reflective error details. Admin report accepts only an explicit strong server HUB_ADMIN_KEY (24+ characters), never a source fallback or URL credential. No PII is returned to anonymous clients. Browser gets only resource links; email verification token goes solely into the receipt email. Report exports escape spreadsheet formulas.

Production toggles default off: HUB_ENABLED, HUB_MAIL_ENABLED, HUB_CRM_ENABLED. Marketing execution remains disabled pending domain/consent/receipt E2E and legal review. Existing runtime credentials' presence is not proof of permission or correct account configuration.
