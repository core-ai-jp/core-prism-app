import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import Stripe from 'stripe';
import { applicationPlan, APPLICATION_VERSION } from '../../src/studio/filmApplication';
const state = vi.hoisted(() => ({ kv: new Map<string, any>(), record: null as any }));
vi.mock('../_lib/studio-applications.js', () => ({
  PREFIX: 'studio:applications:', load: async () => structuredClone(state.record), save: async (r: any) => { state.record = structuredClone(r); },
  store: async ([cmd, key, ...args]: any[]) => {
    if (cmd === 'GET') return state.kv.get(key) ?? null;
    if (cmd === 'SET') { if (args.includes('NX') && state.kv.has(key)) return null; state.kv.set(key, args[0]); return 'OK'; }
    if (cmd === 'EVAL') { if (state.kv.get(args[1]) === args[2]) state.kv.delete(args[1]); return 1; }
    throw new Error('Unexpected storage operation');
  },
}));
import handler from '../studio/billing-webhook';
const secret = 'whsec_fictional_test_secret';
beforeEach(() => {
  vi.stubEnv('STUDIO_STRIPE_SECRET_KEY', 'sk_test_fictional'); vi.stubEnv('STUDIO_STRIPE_WEBHOOK_SECRET', secret); vi.stubEnv('VERCEL_ENV', 'preview');
  state.kv.clear(); state.record = { reference: 'FILM-test', plan: applicationPlan('m1'), input: { version: APPLICATION_VERSION }, status: 'awaiting_payment', billing: { customer: 'cus_test', subscription: 'sub_test' } };
  state.kv.set('studio:applications:subscription:sub_test', 'FILM-test');
  state.kv.set('studio:applications:session:cs_test', 'FILM-test');
});
afterEach(() => vi.unstubAllEnvs());
async function deliver(type: string, object: any, created: number, extra = {}) {
  const payload = JSON.stringify({ id: 'evt_' + type + '_' + created + '_' + object.id, object: 'event', type, created, livemode: false, data: { object } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const req: any = Object.assign(Readable.from([Buffer.from(payload)]), { method: 'POST', headers: { 'stripe-signature': signature }, ...extra });
  const res: any = { code: 200, setHeader() {}, status(n: number) { this.code = n; return this; }, end() { return this; }, json(data: any) { this.data = data; return this; } };
  await handler(req, res); return res;
}
const invoice = (id: string, periodEnd: number) => ({ id, customer: 'cus_test', subscription: 'sub_test', period_end: periodEnd, created: periodEnd - 100, status: 'open', amount_paid: 0, currency: 'jpy' });
it('rejects invalid signatures before reading customer records', async () => {
  expect((await deliver('invoice.paid', invoice('in_1', 10), 100, { headers: { 'stripe-signature': 'bad' } })).code).toBe(400);
  expect(state.record.status).toBe('awaiting_payment');
});
it('does not mark a recurring plan paid from the success page or checkout alone', async () => {
  expect((await deliver('checkout.session.completed', { id: 'cs_test', customer: 'cus_test', subscription: 'sub_test', payment_status: 'paid' }, 100)).code).toBe(200);
  expect(state.record.status).toBe('awaiting_payment');
});
it('uses the newest invoice period rather than the arrival time of an old payment', async () => {
  await deliver('invoice.payment_failed', invoice('in_new', 200), 300);
  await deliver('invoice.paid', { ...invoice('in_old', 100), status: 'paid', amount_paid: 74800 }, 400);
  expect(state.record.status).toBe('payment_failed'); expect(state.record.lastInvoice.id).toBe('in_new');
});
it('does not let a same-second or later stale failure undo payment for the same invoice', async () => {
  await deliver('invoice.paid', { ...invoice('in_1', 100), status: 'paid', amount_paid: 74800 }, 300);
  await deliver('invoice.payment_failed', invoice('in_1', 100), 300);
  await deliver('invoice.payment_failed', invoice('in_1', 100), 400);
  expect(state.record.status).toBe('active');
});
it('moves a renewed bank invoice into awaiting payment, and handles cancellation permanently', async () => {
  await deliver('invoice.paid', { ...invoice('in_old', 100), status: 'paid', amount_paid: 74800 }, 100);
  await deliver('invoice.finalized', invoice('in_new', 200), 200);
  expect(state.record.status).toBe('awaiting_payment');
  await deliver('customer.subscription.deleted', { id: 'sub_test', customer: 'cus_test' }, 300);
  await deliver('invoice.paid', { ...invoice('in_new', 200), status: 'paid', amount_paid: 74800 }, 400);
  expect(state.record.status).toBe('cancelled');
});
it('ignores unrelated events but retries events for an application whose mapping is not saved yet', async () => {
  expect((await deliver('invoice.paid', { ...invoice('in_other', 100), subscription: 'sub_other' }, 100)).code).toBe(200);
  expect((await deliver('invoice.paid', { ...invoice('in_other', 100), subscription: 'sub_other', subscription_details: { metadata: { studio_application: 'FILM-test' } } }, 200)).code).toBe(503);
});
it('rejects a signed event for a different customer and production test-mode events', async () => {
  expect((await deliver('invoice.paid', { ...invoice('in_1', 100), customer: 'cus_other' }, 100)).code).toBe(400);
  vi.stubEnv('VERCEL_ENV', 'production');
  expect((await deliver('invoice.paid', invoice('in_1', 100), 200)).code).toBe(400);
});
it('preserves a newer subscription problem when an old invoice event arrives', async () => {
  await deliver('invoice.paid', { ...invoice('in_old', 100), status: 'paid', amount_paid: 74800 }, 100);
  await deliver('customer.subscription.updated', { id: 'sub_test', customer: 'cus_test', status: 'unpaid' }, 300);
  await deliver('invoice.finalized', invoice('in_old', 100), 200);
  expect(state.record.status).toBe('payment_failed');
});
