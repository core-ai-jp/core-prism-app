# CORE Academy operations

Status: implementation for review; not connected to production. Do not advertise the application or LINE flows as operational until the acceptance checklist below is complete.

## Entry points

- `/academy/`: persistent LP and application form. Dates come from Notion, never from site code.
- `/academy/thanks`: client-side application acknowledgement; does not imply mail delivery or consultation booking.
- `/academy/verify#<opaque-token>`: email ownership confirmation; fragment is immediately removed from browser history.
- `/academy/survey#<opaque-token>`: participant feedback, saved to the linked attendance record.
- `/api/academy`: config, registration, verification, LINE Login callback, survey and cron job actions.
- `/api/academy/line-webhook`: raw body LINE webhook. Do not point LINE at the parsed-body dispatcher.

The application creates a customer once per normalized email and a history record once per customer/event. Company name and industry are visible in the customer list. A repeated anonymous submission cannot change an existing customer's identity or marketing permission. Email ownership confirmation is required before LINE linking or accepting that email's marketing preference. Identity linking uses LINE Login state cookies and nonce validation. LINE Login and Messaging API must use the same LINE provider, with the existing CORE account linked to the Login channel.

## Environment configuration

Set these server-only variables on the verified existing project, never in VITE-prefixed variables:

| Variable | Purpose |
| --- | --- |
| `NOTION_API_KEY` | Existing authorized integration; access only to the Academy data and required existing tasks/deals |
| `ACADEMY_EVENTS_DS` | Event data source ID |
| `ACADEMY_LEADS_DS` | Lead data source ID |
| `ACADEMY_REGISTRATIONS_DS` | Attendance data source ID |
| `ACADEMY_SETTINGS_DS` | Operating settings data source ID |
| `ACADEMY_TASKS_DS` | Existing sales task data source ID |
| `ACADEMY_DEALS_DS` | Existing deal data source ID |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Existing durable locks, outbox, deduplication, opaque tokens |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Existing CORE Messaging API credentials |
| `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET` | Existing authorized LINE Login channel |
| `CRON_SECRET` | Authorization for cron; do not change an existing shared secret casually |
| `RESEND_API_KEY`, `EMAIL_FROM` | Existing mail delivery configuration, if available |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Existing SMTP fallback; reused without exposing credentials |
| `ACADEMY_ORIGIN` | Optional canonical HTTPS origin; production defaults to `https://www.core-ai.jp` |

Preview defaults to its `VERCEL_URL` origin. LINE redirect URIs must exactly match the active origin plus `/api/academy?action=line-callback`. Do not weaken deployment protection or disclose an admin token to make tests pass. Deployment permission and Notion connector access inside ChatGPT do not automatically supply the application's runtime credentials.

## Event maintenance

Create a Notion event with theme, date range, venue, capacity, application deadline and participation fee. Keep it unpublished and in preparation until its public conditions are ready. Turn on publication and set recruitment to open after approval. The LP selects the earliest published future event accepting applications; an ended/expired event is excluded. An unavailable API produces an error, not a fictitious date. With no next event, the form offers advance notice. Capacity is rechecked server-side under a durable event lock; excess registrations become waitlisted. Date-only deadlines use the end of that date in Japan.

Dates and prices are not encoded in the reference poster or LP markup. The poster's weekday is not a source of truth. Do not invent venue photographs, past events, results or participation fees.

## Sales and follow-up

- Application persists the lead, attendance record and receipt job. SMTP/Resend failure leaves a retryable durable job instead of silently dropping it.
- Consultation interest generates a deduplicated task in the existing task database. The completion page links directly to the owner's approved TimeRex page.
- Only an operator-set commercial stage (negotiating/proposing) creates and links an Academy deal. Contract value, revenue, invoice and payment fields are never inferred or overwritten.
- Daily cron at 09:00 Japan retries up to 20 jobs, sends reminders within the next 36 hours, sends feedback to confirmed attendees within two days, and sends new event invitations to consented linked leads (up to 20 per run). No paid plan or tighter schedule is assumed.
- LINE `unfollow` and the messages `停止`, `配信停止`, `STOP` revoke marketing permission. Re-following does not automatically restore it.
- The next session invitation excludes people already registered for that event. Message retry keys remain stable per delivery. A changed event start time gets a new reminder key.
- Maintain attendance/cancellation status in Notion. Capacity reservations are conservative; cancellation reconciliation currently occurs through a queued count refresh, and uncertain creates require operator review. Do not promise automatic waitlist promotion.

The Notion dashboard displays real rows and explicitly labels unmeasured metrics. LP sessions and confirmed TimeRex bookings are not yet measured. Clicking a booking link is never counted as a completed booking. The external survey URL is optional; leaving it empty uses the built-in survey. An external survey does not automatically write back into this attendance database.

## Acceptance before launch

1. Verify team/project/domains and latest production commit. Keep unrelated edits isolated. Obtain approval for the user-visible production release.
2. Confirm the integration can query and write the four new data sources and required tasks/deals with restricted permissions.
3. Test a designated non-production application through the browser: actual Notion rows, duplicate retry, second event history, capacity/waitlist, notification, and consultation task.
4. Confirm email delivery; follow the actual emailed token; verify consent, LINE Login, nonce/state rejection, account association, unfollow/STOP and redelivery.
5. Test survey save and consultation follow-up. Confirm the actual TimeRex booking is completed; do not mark it confirmed from navigation alone. Booking webhook/calendar reconciliation remains unimplemented.
6. Inspect at 375, 390 and 430 pixels; check form errors, submit state, success/back flow and existing corporate/product routes. Unit tests do not substitute for this browser check.
7. Require independent security review before enabling customer-facing identity and automated messaging. None has been claimed at this checkpoint.
8. Deploy a staged build; verify LP/API/CRM end to end; only then promote after approval.

Notion creates are not transactional. A pending create with an uncertain result is deliberately not blindly retried: reconcile its unique key against Notion, retain the successful ID or resolve the pending marker. Logs contain failure codes, never contact values or secrets. Redis and Notion both hold personal information; protect administrative access and handle deletion/access requests across both. Review retention and implement a cleanup policy before production. SMTP acknowledgements cannot guarantee exactly-once delivery after a transport timeout.
