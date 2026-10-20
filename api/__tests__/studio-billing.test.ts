import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { applicationPlan } from '../../src/studio/filmApplication';
const state = vi.hoisted(() => ({ record: null as any, kv: new Map<string, any>(), notice: vi.fn(async () => 'sent') }));
const client = vi.hoisted(() => ({
  accounts: { retrieve: vi.fn(async () => ({ id: 'acct_company', charges_enabled: true })) },
  customers: { create: vi.fn(async () => ({ id: 'cus_test' })) },
  products: { create: vi.fn(async () => ({ id: 'prod_test' })) },
  prices: { create: vi.fn(async () => ({ id: 'price_test' })) },
  subscriptions: { create: vi.fn(async () => ({ id: 'sub_test', latest_invoice: 'in_test' })) },
  invoices: { create: vi.fn(async () => ({ id: 'in_test' })), retrieve: vi.fn(async () => ({ id: 'in_test', status: 'draft' })), finalizeInvoice: vi.fn(async () => ({ id: 'in_test', status: 'open' })), sendInvoice: vi.fn(async () => ({ hosted_invoice_url: 'https://invoice.stripe.com/test' })) },
  invoiceItems: { create: vi.fn(async () => ({})) },
  checkout: { sessions: { create: vi.fn(async () => ({ id: 'cs_test', url: 'https://checkout.stripe.com/test' })), retrieve: vi.fn(async () => ({ status: 'expired', payment_status: 'unpaid' })) } },
}));
vi.mock('stripe', () => ({ default: class { constructor() { return client; } } }));
vi.mock('../_lib/studio-applications.js', () => ({
  PREFIX: 'studio:applications:', origin: () => 'https://www.core-ai.jp', notice: state.notice,
  load: async () => structuredClone(state.record), save: async (r: any) => { state.record = structuredClone(r); },
  store: async ([cmd, key, ...a]: any[]) => {
    if (cmd === 'SET') { if (a.includes('NX') && state.kv.has(key)) return null; state.kv.set(key, a[0]); return 'OK'; }
    if (cmd === 'EVAL') { if (state.kv.get(a[1]) === a[2]) state.kv.delete(a[1]); return 1; }
    throw new Error('Unexpected store command');
  },
}));
import { activateBilling, renewCardLink } from '../_lib/studio-billing';
const approval = () => ({ startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }), evidence: '確認メールで顧客の了承を記録', confirmed: true, daysUntilDue: 7 });
beforeEach(() => {
  vi.clearAllMocks(); state.kv.clear();
  client.accounts.retrieve.mockResolvedValue({ id: 'acct_company', charges_enabled: true });
  client.checkout.sessions.retrieve.mockResolvedValue({ status: 'expired', payment_status: 'unpaid' });
  Object.entries({ STUDIO_BILLING_ENABLED: 'true', STUDIO_STRIPE_ACCOUNT_ID: 'acct_company', STUDIO_STRIPE_SECRET_KEY: 'sk_test_fictional', STUDIO_STRIPE_WEBHOOK_SECRET: 'whsec_fictional' }).forEach(([k, v]) => vi.stubEnv(k, v));
  state.record = { reference: 'FILM-test', plan: applicationPlan('m1'), input: { company: '架空会社', email: 'test@example.invalid', payment: 'bank_transfer' }, status: 'awaiting_review' };
});
afterEach(() => vi.unstubAllEnvs());
it('creates invoice collection for monthly bank payments with the displayed tax-inclusive amount', async () => {
  const r = await activateBilling(state.record, approval());
  expect(client.subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ collection_method: 'send_invoice', days_until_due: 7 }), expect.objectContaining({ idempotencyKey: 'studio-FILM-test-subscription' }));
  expect(client.prices.create.mock.calls[0][0]).toMatchObject({ unit_amount: 74800, tax_behavior: 'inclusive', recurring: { interval: 'month' } });
  expect(client.checkout.sessions.create).not.toHaveBeenCalled(); expect(r.status).toBe('awaiting_payment');
  await activateBilling(state.record, approval());
  expect(client.subscriptions.create).toHaveBeenCalledTimes(1); expect(state.notice).toHaveBeenCalledTimes(2);
});
it('creates card checkout only after approval with no free trial or tax surcharge', async () => {
  state.record.input.payment = 'card'; await activateBilling(state.record, approval());
  const params = client.checkout.sessions.create.mock.calls[0][0];
  expect(params).toMatchObject({ mode: 'subscription', customer: 'cus_test' });
  expect(params).not.toHaveProperty('subscription_data.trial_period_days'); expect(params).not.toHaveProperty('automatic_tax');
  expect(params.subscription_data.metadata.studio_application).toBe('FILM-test');
  expect(client.subscriptions.create).not.toHaveBeenCalled();
});
it('rejects an unexpected merchant before creating any billing object', async () => {
  client.accounts.retrieve.mockResolvedValue({ id: 'acct_other', charges_enabled: true });
  await expect(activateBilling(state.record, approval())).rejects.toThrow('法人');
  expect(client.customers.create).not.toHaveBeenCalled();
});
it('requires customer agreement and the actual start day', async () => {
  await expect(activateBilling(state.record, { ...approval(), confirmed: false })).rejects.toThrow('了承');
  await expect(activateBilling(state.record, { ...approval(), startDate: '2099-01-01' })).rejects.toThrow('開始日');
  expect(client.accounts.retrieve).not.toHaveBeenCalled();
});
it('will not blindly repeat uncertain Stripe calls after idempotency retention', async () => {
  state.record.billing = { attemptedAt: '2000-01-01T00:00:00Z' };
  await expect(activateBilling(state.record, approval())).rejects.toThrow('照合');
  expect(client.customers.create).not.toHaveBeenCalled();
});
it('renews an expired unpaid card session with a generation-specific idempotency key', async () => {
  state.record.input.payment = 'card'; state.record.status = 'awaiting_payment';
  state.record.billing = { complete: true, customer: 'cus_test', price: 'price_test', session: 'cs_old', attemptedAt: new Date().toISOString() };
  await renewCardLink(state.record);
  expect(client.checkout.sessions.create.mock.calls[0][1]).toEqual({ idempotencyKey: 'studio-FILM-test-checkout-1' });
  expect(state.record.billing.checkoutGeneration).toBe(1); expect(state.notice).toHaveBeenCalledOnce();
});
it('does not issue a new session for already completed payment', async () => {
  state.record.input.payment = 'card'; state.record.status = 'awaiting_payment'; state.record.billing = { complete: true, customer: 'cus_test', session: 'cs_old' };
  client.checkout.sessions.retrieve.mockResolvedValue({ status: 'complete', payment_status: 'paid' });
  await expect(renewCardLink(state.record)).rejects.toThrow('手続き済み'); expect(client.checkout.sessions.create).not.toHaveBeenCalled();
});
it('rejects test keys in production and live keys in Preview before accessing Stripe', async () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  await expect(activateBilling(state.record, approval())).rejects.toThrow('本番用');
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('STUDIO_STRIPE_SECRET_KEY', 'rk_live_fictional');
  await expect(activateBilling(state.record, approval())).rejects.toThrow('テスト用');
  expect(client.accounts.retrieve).not.toHaveBeenCalled();
});
