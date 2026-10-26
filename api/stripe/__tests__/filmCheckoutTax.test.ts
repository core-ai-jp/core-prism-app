import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../checkout';
import { FILM_PLANS, MONTHLY_PLANS, PRICE_NOTE } from '../../../src/studio/film';

const amounts = { trial: 49800, standard: 128000, m1: 74800, m2: 118000, m4: 228000, m8: 398000, m12: 548000 };
const request = (plan = 'trial', mode = 'payment', brand = 'film') => new Request('https://www.core-ai.jp/api/stripe/checkout', {
  method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://www.core-ai.jp' },
  body: JSON.stringify({ plan, mode, brand }),
});
function setup(plan: keyof typeof amounts = 'trial', overrides = {}) {
  vi.stubEnv('STRIPE_SECRET_KEY', 'test-only');
  vi.stubEnv(`STRIPE_PRICE_FILM_${plan.toUpperCase()}`, 'price_fixture');
  vi.stubEnv('STRIPE_TAX_RATE_FILM_JP_10', 'txr_fixture');
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/prices/')) return Response.json({ active: true, currency: 'jpy', unit_amount: amounts[plan], tax_behavior: 'exclusive', recurring: plan.startsWith('m') ? { interval: 'month', interval_count: 1 } : null, ...overrides });
    if (url.includes('/tax_rates/')) return Response.json({ active: true, country: 'JP', percentage: 10, inclusive: false });
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    const params = new URLSearchParams(String(init?.body));
    expect(params.get('line_items[0][price]')).toBe('price_fixture');
    expect(params.has('automatic_tax[enabled]')).toBe(false);
    const field = plan.startsWith('m') ? 'subscription_data[default_tax_rates][0]' : 'line_items[0][tax_rates][0]';
    expect(params.get(field)).toBe('txr_fixture');
    expect(params.has('subscription_data[trial_period_days]')).toBe(false);
    return Response.json({ url: 'https://checkout.stripe.com/test-fixture' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Film keeps advertised amounts and adds exclusive Japanese 10% tax', () => {
  it.each(Object.entries(amounts))('%s retains its advertised net amount and gets the correct tax field', async (id, amount) => {
    const plan = id as keyof typeof amounts; const mock = setup(plan);
    const response = await handler(request(plan, plan.startsWith('m') ? 'subscription' : 'payment'));
    expect(response.status).toBe(200); expect(mock).toHaveBeenCalledTimes(3);
    const advertised = [...FILM_PLANS, ...MONTHLY_PLANS].find(p => p.id === plan);
    expect(advertised?.priceYen).toBe(amount);
    expect(PRICE_NOTE).toContain('税込総額（消費税10%）');
  });
  it('does not open an untaxed checkout when the tax rate is absent', async () => {
    const mock = setup(); vi.stubEnv('STRIPE_TAX_RATE_FILM_JP_10', '');
    expect((await handler(request())).status).toBe(503); expect(mock).not.toHaveBeenCalled();
  });
  it.each([{ unit_amount: 1 }, { tax_behavior: 'inclusive' }, { active: false }, { currency: 'usd' }])('rejects a mismatched configured price: %j', async override => {
    const mock = setup('trial', override);
    expect((await handler(request())).status).toBe(503); expect(mock).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid mode before making a Stripe request', async () => {
    const mock = setup(); expect((await handler(request('trial', 'subscription'))).status).toBe(400); expect(mock).not.toHaveBeenCalled();
  });
  it('rejects an inclusive or wrong tax rate', async () => {
    setup(); vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('/prices/')
      ? { active: true, currency: 'jpy', unit_amount: 49800, tax_behavior: 'exclusive' }
      : { active: true, country: 'JP', percentage: 8, inclusive: true })));
    expect((await handler(request())).status).toBe(503);
  });
  it('preserves non-Film checkout and its free trial', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'test-only'); vi.stubEnv('STRIPE_PRICE_LITE', 'price_iris');
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const p = new URLSearchParams(String(init?.body));
      expect(p.get('subscription_data[trial_period_days]')).toBe('7');
      expect(p.has('subscription_data[default_tax_rates][0]')).toBe(false);
      return Response.json({ url: 'https://checkout.stripe.com/test-fixture' });
    }));
    expect((await handler(request('lite', 'subscription', 'iris'))).status).toBe(200);
  });
});
