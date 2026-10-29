import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, createHash } from 'node:crypto';
import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };
const PREFIX = 'academy:members:v1:';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const hashEmail = (email: string) => createHmac('sha256', process.env.ACADEMY_MEMBER_SIGNING_KEY!).update(email.trim().toLowerCase()).digest('hex');
async function redis(cmd: (string | number)[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('REDIS_UNAVAILABLE');
  const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('REDIS_UNAVAILABLE');
  const obj = await r.json() as { result: unknown; error?: string };
  if (obj.error) throw new Error('REDIS_UNAVAILABLE');
  return obj.result;
}
async function raw(req: VercelRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    if (chunks.reduce((n, b) => n + b.length, 0) > 1024 * 1024) throw new Error('BODY_TOO_LARGE');
  }
  return Buffer.concat(chunks);
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (process.env.ACADEMY_MEMBERSHIP_ENABLED !== 'true' || !process.env.ACADEMY_STRIPE_SECRET_KEY ||
      !process.env.ACADEMY_STRIPE_WEBHOOK_SECRET || !process.env.ACADEMY_STRIPE_PRICE_ID ||
      !process.env.ACADEMY_STRIPE_ACCOUNT_ID || !process.env.ACADEMY_MEMBER_SIGNING_KEY) {
    return res.status(503).json({ error: 'MEMBERSHIP_NOT_READY' });
  }
  try {
    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') return res.status(400).json({ error: 'INVALID_SIGNATURE' });
    const s = new Stripe(process.env.ACADEMY_STRIPE_SECRET_KEY);
    const event = s.webhooks.constructEvent(await raw(req), sig, process.env.ACADEMY_STRIPE_WEBHOOK_SECRET);
    const account = await s.accounts.retrieve();
    if (account.id !== process.env.ACADEMY_STRIPE_ACCOUNT_ID) throw new Error('MERCHANT_MISMATCH');
    const doneKey = PREFIX + 'webhook:' + hash(event.id);
    const first = await redis(['SET', doneKey, 'processing', 'EX', 300, 'NX']);
    if (first !== 'OK') return res.status(200).json({ received: true });
    try {
      let subscription: Stripe.Subscription | null = null;
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.source !== 'core_academy_b2c' || !session.subscription || typeof session.subscription !== 'string') {
          await redis(['SET', doneKey, 'ignored', 'EX', 2592000]); return res.status(200).json({ received: true });
        }
        subscription = await s.subscriptions.retrieve(session.subscription);
      } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        subscription = await s.subscriptions.retrieve((event.data.object as Stripe.Subscription).id);
      } else {
        await redis(['SET', doneKey, 'ignored', 'EX', 2592000]); return res.status(200).json({ received: true });
      }
      if (!subscription.items.data.some(item => item.price.id === process.env.ACADEMY_STRIPE_PRICE_ID)) {
        await redis(['SET', doneKey, 'ignored', 'EX', 2592000]); return res.status(200).json({ received: true });
      }
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const customer = await s.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) throw new Error('CUSTOMER_EMAIL_UNAVAILABLE');
      await redis(['SET', PREFIX + 'subscriber:' + hashEmail(customer.email), JSON.stringify({
        customerId, subscriptionId: subscription.id, status: subscription.status, updatedAt: new Date().toISOString()
      })]);
      await redis(['SET', doneKey, 'done', 'EX', 2592000]);
      return res.status(200).json({ received: true });
    } catch (e) {
      await redis(['DEL', doneKey]); throw e;
    }
  } catch (err) {
    console.error('academy-stripe-webhook', err instanceof Error ? err.message : 'unknown');
    return res.status(400).json({ error: 'WEBHOOK_REJECTED' });
  }
}
