# Studio film applications

## Customer flow

Pricing links to `/studio/film?apply=m1` (also m2/m4/m8/m12/trial/standard).
The selected plan, tax-inclusive price and production conditions come from `src/studio/film.ts`.
The application collects company, contact, email, desired start month, payment preference and optional notes.
Customers review conditions and consent before submitting. Submission does not create a contract, Stripe object or charge.
The saved receipt has a reference. A missing/uncertain notification is shown separately from successful storage.
LINE remains available for consultation; errors never silently redirect an applicant there.

## Storage and notification safety

`POST /api/studio/applications` validates current pricing, schema, consent and origin, limits IP/email requests, then writes the immutable application and index atomically to Redis.
The browser retains a submitted request and receipt in sessionStorage for reload recovery. An identical normalized request is also deduplicated for 24 hours on the server.
Reusing an ID with different data is rejected. No successful receipt is returned when persistence cannot be verified.
Redis namespace is `studio:applications:` in production and `studio:applications:preview:` in Preview.
Application records and invoice history are retained as operating records; no public API reads private records.
Handle access/deletion requests under the site's privacy policy through an authenticated operator.

Customer receipt contains only the reference, plan, price and payment preference. Free-text input is only sent to the fixed operator address.
Operator notices go to `info@core-ai.jp`. Company SMTP is accepted only when GMAIL_USER is exactly that address; otherwise Resend sends from `CORE Studio <info@core-ai.jp>`.
Never use a personal sender as a fallback. Configure and verify a company transport before public release.
Set `STUDIO_MAIL_ENABLED=true` only after verifying that company transport and receipt delivery; existing shared mail credentials alone do not enable Studio notifications.
If mail is unconfigured, storage still succeeds with a `pending` receipt notice and can be inspected by an operator. SMTP outcomes are not delivery confirmations.
Notifications have independent claims and states. Uncertain SMTP sends are never retried automatically; inspect provider history and then use the authenticated reconciliation/resend controls.

## Operator review

`/studio/film?manage=applications` uses the existing CORE_AGGREGATE_KEY in an Authorization header.
No fallback password, URL credential, browser-persisted admin key or unauthenticated PII read is provided.
Latest 100 applications include their payment preference, notes, mail states and billing state.

Before activation, confirm capacity, scope, price, payment method and the customer's agreement to the start date and payment terms.
Enter the agreed start date, invoice payment deadline in days and evidence of agreement. Activation is permitted only on the start day in Asia/Tokyo.
Keep explicit records of additional fees and customer approval; they are not inferred from the form.

## Billing prerequisites

All four dedicated variables must be configured before activation:

- `STUDIO_BILLING_ENABLED=true`
- `STUDIO_STRIPE_ACCOUNT_ID` — verified company merchant
- `STUDIO_STRIPE_SECRET_KEY` — restricted/live company key with required billing permissions
- `STUDIO_STRIPE_WEBHOOK_SECRET`

Do not reuse STRIPE_SECRET_KEY from other products. The connected account must match the dedicated pinned ID and have charges enabled.
The legacy `/api/stripe/checkout` rejects `brand=film` to prevent bypassing application review.
The initial release can accept applications while billing remains disabled; that is not proof of a working live payment integration.

### Bank transfer

After explicit operator activation, recurring plans use a Stripe Subscription with `collection_method=send_invoice` and Japanese bank transfer/customer balance.
Stripe creates monthly invoices and reconciles transfers. Customers still initiate each transfer: this is not Japanese direct debit.
Single orders use an invoice. Checkout subscription mode and Payment Links are not used for bank transfers.
The operator-selected due period is recorded with the approval. Prices include tax; `automatic_tax` is not enabled and no tax is added at checkout.
Verify company invoice identity, invoice-registration details where applicable, bank-transfer capability and invoice emailing in the merchant account before activation.

### Card

After operator activation, an emailed Checkout link collects payment/card details. No free trial is added.
The initial customer payment establishes recurring card billing. An expired, unpaid link can be renewed from the operator screen using a generation-specific idempotency key; a completed session cannot be reissued.
Uncertain operations older than 23 hours require Stripe object reconciliation instead of blindly creating again after the idempotency retention period.

### Webhook

Register `/api/studio/billing-webhook` on the dedicated company account for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Verify signatures against the raw body. Production rejects test-mode events.
Object mappings (Session/Subscription/Invoice IDs) identify the stored application; customer IDs must also match.
Invoice status is tracked per billing period, so paying an old invoice cannot mark a newer unpaid invoice paid.
Duplicate events are idempotent; cancellation is terminal. The return page never marks an application paid.
Stripe remains the billing source of truth. Use its Dashboard for changes/cancellation after confirming the customer's instruction; never edit prices or existing customer subscriptions as part of setup.

## Verification

Run the three `api/__tests__/studio-*.test.ts` files, repository `npm test`, frontend build and targeted backend typecheck.
Check Japan-local month boundaries under UTC and Asia/Tokyo.
Inspect desktop and 375/390/430px application, review and receipt screens, reload/retry, changed plan, error feedback and admin auth.
For Preview integration, use fictional application details and the isolated Preview namespace. Never start a real subscription or send to a real external customer during testing.
Before live enablement, separately verify company merchant identity, bank transfer setup, card checkout, signed webhook processing, recurring invoices and received company email. Mocks, READY deployments and a stored application do not establish those results.
