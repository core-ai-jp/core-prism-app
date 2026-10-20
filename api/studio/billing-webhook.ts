import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { load, PREFIX, save, store } from '../_lib/studio-applications.js';

export const config = { api: { bodyParser: false }, maxDuration: 30 };
const objectId = (value: any): string | undefined => typeof value === 'string' ? value : value?.id;
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STUDIO_STRIPE_SECRET_KEY || !process.env.STUDIO_STRIPE_WEBHOOK_SECRET) return res.status(503).end();
  const stripe = new Stripe(process.env.STUDIO_STRIPE_SECRET_KEY, { maxNetworkRetries: 0 });
  let event: Stripe.Event;
  try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk); if (size > 1024 * 1024) return res.status(413).end();
      chunks.push(Buffer.from(chunk));
    }
    event = stripe.webhooks.constructEvent(Buffer.concat(chunks), String(req.headers['stripe-signature'] || ''), process.env.STUDIO_STRIPE_WEBHOOK_SECRET);
  } catch { return res.status(400).end(); }
  if (!event.livemode && process.env.VERCEL_ENV === 'production') return res.status(400).end();
  if (event.livemode && process.env.VERCEL_ENV === 'preview') return res.status(400).end();
  const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'invoice.paid', 'invoice.payment_failed', 'invoice.finalized', 'customer.subscription.updated', 'customer.subscription.deleted'];
  if (!supported.includes(event.type)) return res.status(200).json({ received: true });
  try {
    if (await store(['GET', PREFIX + 'event:' + event.id])) return res.status(200).json({ received: true });
    const object = event.data.object as any;
    const subscription = objectId(object.subscription) || objectId(object.parent?.subscription_details?.subscription);
    const checkout = event.type.startsWith('checkout.');
    const subscriptionEvent = event.type.startsWith('customer.subscription.');
    const key = checkout ? 'session:' + object.id : subscriptionEvent ? 'subscription:' + object.id : subscription ? 'subscription:' + subscription : 'invoice:' + object.id;
    const reference = await store(['GET', PREFIX + key]);
    // An initial event may arrive before its object mapping is saved. Let Stripe retry.
    if (!reference) {
      const marker = object.metadata?.studio_application || object.parent?.subscription_details?.metadata?.studio_application || object.subscription_details?.metadata?.studio_application;
      return res.status(marker ? 503 : 200).end();
    }
    const lock = PREFIX + 'billing-lock:' + reference;
    if (await store(['SET', lock, event.id, 'NX', 'EX', 120]) !== 'OK') return res.status(503).end();
    try {
      const r = await load(reference);
      if (!r) return res.status(503).end();
      if (objectId(object.customer) !== r.billing?.customer) return res.status(400).end();
      if (checkout && subscription) {
        if (r.billing) r.billing.subscription = subscription;
        await store(['SET', PREFIX + 'subscription:' + subscription, reference]);
      }
      if (r.status !== 'cancelled') {
        if (subscriptionEvent && (!r.subscriptionState || event.created >= r.subscriptionState.eventCreated)) r.subscriptionState = { status: object.status, eventCreated: event.created };
        if (event.type === 'customer.subscription.deleted' || (subscriptionEvent && object.status === 'canceled')) r.status = 'cancelled';
        else if (subscriptionEvent && ['past_due', 'unpaid', 'incomplete_expired', 'paused'].includes(object.status) && (!r.lastBillingEvent || event.created >= r.lastBillingEvent)) r.status = 'payment_failed';
        else if (checkout && !r.plan.recurring && object.payment_status === 'paid') r.status = 'active';
        if (event.type.startsWith('invoice.')) {
          r.invoices ||= {};
          const previous = r.invoices[object.id];
          // A late failure must not undo payment, even when both events have the same second.
          if (!previous || (previous.status !== 'paid' && (event.type === 'invoice.paid' || event.created >= previous.eventCreated))) {
            r.invoices[object.id] = { id: object.id, periodEnd: object.period_end || object.created, status: event.type === 'invoice.paid' ? 'paid' : event.type === 'invoice.payment_failed' ? 'failed' : object.status, amountPaid: object.amount_paid, currency: object.currency, eventCreated: event.created };
          }
          const current = Object.values(r.invoices).sort((a, b) => b.periodEnd - a.periodEnd || b.eventCreated - a.eventCreated)[0];
          r.lastInvoice = current;
          r.status = current.status === 'paid' ? 'active' : current.status === 'failed' ? 'payment_failed' : 'awaiting_payment';
        }
        r.lastBillingEvent = Math.max(r.lastBillingEvent || 0, event.created);
        if (subscriptionEvent && r.subscriptionState?.status === 'active' && r.lastInvoice) r.status = r.lastInvoice.status === 'paid' ? 'active' : r.lastInvoice.status === 'failed' ? 'payment_failed' : 'awaiting_payment';
        if (r.status !== 'cancelled' && r.subscriptionState && ['past_due', 'unpaid', 'incomplete_expired', 'paused'].includes(r.subscriptionState.status)) r.status = 'payment_failed';
      }
      await save(r);
      await store(['SET', PREFIX + 'event:' + event.id, 'done', 'EX', 90 * 86400]);
      return res.status(200).json({ received: true });
    } finally {
      await store(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, lock, event.id]);
    }
  } catch { return res.status(503).end(); }
}
