# Hub operations

## Launch gates
1. Confirm company Vercel project and preview commit. Verify resource render and responsive forms.
2. Confirm Redis retention/access controls and CRM permissions without exposing customer data.
3. Set HUB_ENABLED only for the reviewed environment. Mail additionally requires HUB_MAIL_ENABLED, existing verified sender credentials and HUB_SENDER_ADDRESS. Do not use a guessed address.
4. Use a designated operator test inbox, verify actual receipt, token use, unsubscribe, retry, CRM row and download before enabling customer intake/marketing.
5. No automated marketing runs are active. Day 0/2/5/8/12 drafts are in api/_lib/hub.ts. Existing customers are not enrolled.

## Credentials and reporting
- Existing UPSTASH_REDIS_REST_URL/TOKEN, Notion and mail adapter credentials remain server-only.
- HUB_ADMIN_KEY must be explicitly configured and at least 24 characters. Never use existing source-code fallback keys. Enter only via /admin/lead-funnel; it remains in memory, never URL/localStorage.
- GET /api/hub?action=health with Authorization bearer returns configuration flags, no secrets.
- POST /api/hub?action=jobs runs at most 10 receipt and 5 CRM attempts under administrator authorization. No new timer or external sends have been enabled.

## Uncertain mail recovery
A sending/uncertain job requires operator comparison with the mail provider. SMTP Message-ID is not an exactly-once guarantee. Confirm accepted/delivered/failed separately. Never reset it to pending blindly. A new request after expiry rotates download/verification tokens. Jobs older than 24 hours are expired. A provider outage must leave immediate browser download available.

## Consent and deletion
AI Toolkit email permission is separate from Academy/LINE. Withdrawal is immediate in Hub and sticky; old verification cannot resubscribe. Access/deletion requests require identity verification and a coordinated deletion across Hub records, indexes, tokens, jobs, audits and any CRM records, subject to valid retention obligations. Automated retention cleanup and a full deletion tool are not yet implemented; establish retention and legal review before production PII intake.

## Incident / rollback
Disable HUB_MAIL_ENABLED first for mail incidents, HUB_ENABLED for intake incidents. Pausing intake leaves existing download, verification and withdrawal links functional while Redis remains configured. Preserve masked audit evidence and reconcile unknown external effects. Redeploy the prior verified commit; do not delete data to roll back code. Review privacy notice, processing scope, sender address and Japanese personal-data/email obligations with a qualified reviewer before marketing launch.

## Missing live acceptance
HUB flags and strong administrator key were absent from the observed production variable-name inventory. Sender credentials exist, but actual domain alignment/receipt and Notion access for this new flow have not been tested. Physical iPhone QR, TimeRex booking reconciliation, confirmed sales attribution and ongoing marketing remain pending.

## Repeatable public monitoring
After approved production rollout, set the repository variable HUB_PUBLIC_BASE_URL to the verified HTTPS origin. The existing daily CI schedule then runs scripts/check-hub-public.mjs: 14 HTML routes, public configuration shape and unauthorized-admin denial. It never submits forms or sends mail. This variable has not been set by this change, so production monitoring for Hub is prepared but inactive. Browser/PDF acceptance and delivery monitoring remain separate.
