import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { applicationPlan, APPLICATION_VERSION, startMonths } from '../../src/studio/filmApplication';

const kv = new Map<string, any>();
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: 'test' })));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));
let handler: any, core: any, failStore = false;
beforeEach(async () => {
  vi.unstubAllEnvs(); vi.restoreAllMocks(); kv.clear(); sendMail.mockClear(); failStore = false;
  vi.stubEnv('STUDIO_MAIL_ENABLED', 'true');
  Object.entries({ UPSTASH_REDIS_REST_URL: 'https://redis.invalid', UPSTASH_REDIS_REST_TOKEN: 'fake', GMAIL_USER: 'info@core-ai.jp', GMAIL_APP_PASSWORD: 'fake', CORE_AGGREGATE_KEY: 'test-admin-key-at-least-24-characters' }).forEach(([k, v]) => vi.stubEnv(k, v));
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: any) => {
    if (url !== 'https://redis.invalid') throw new Error('Unexpected external request');
    if (failStore) return Response.json({ error: 'unavailable' }, { status: 503 });
    const [cmd, ...a] = JSON.parse(options.body);
    let result: any = null;
    if (cmd === 'GET') result = kv.get(a[0]) ?? null;
    else if (cmd === 'SET') { if (!a.includes('NX') || !kv.has(a[0])) { kv.set(a[0], a[1]); result = 'OK'; } }
    else if (cmd === 'MGET') result = a.map((key: string) => kv.get(key) ?? null);
    else if (cmd === 'ZREVRANGE') result = kv.get(a[0]) || [];
    else if (cmd === 'EVAL') {
      const [script, count, ...rest] = a; const keys = rest.slice(0, count), args = rest.slice(count);
      if (script.includes("redis.call('INCR'")) { result = (kv.get(keys[0]) || 0) + 1; kv.set(keys[0], result); }
      else if (script.includes("redis.call('ZADD'")) {
        const prior = kv.get(keys[2]); result = kv.get(keys[0]) || (prior && kv.get(prior));
        if (!result) { result = args[0]; kv.set(keys[0], result); kv.set(keys[2], keys[0]); kv.set(keys[1], [...(kv.get(keys[1]) || []), args[2]]); }
      } else { if (kv.get(keys[0]) === args[0]) { kv.delete(keys[0]); result = 1; } else result = 0; }
    } else throw new Error('Unsupported Redis command');
    return Response.json({ result });
  }));
  handler = (await import('../studio/applications')).default;
  core = await import('../_lib/studio-applications');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function input(extra = {}) {
  return { requestId: randomUUID(), plan: 'm1', amount: 74800, version: APPLICATION_VERSION, company: '架空テスト会社', name: 'テスト担当', email: 'test@example.invalid', startMonth: startMonths()[0], payment: 'bank_transfer', notes: '', consent: true, website: '', ...extra };
}
async function call(body?: any, extra: any = {}) {
  const req: any = { method: body ? 'POST' : 'GET', body, headers: { origin: 'https://www.core-ai.jp', 'x-vercel-forwarded-for': 'test-ip' }, query: {}, ...extra };
  const res: any = { code: 200, headers: {}, setHeader(k: string, v: string) { this.headers[k] = v; }, status(n: number) { this.code = n; return this; }, json(data: any) { this.data = data; return this; } };
  await handler(req, res); return res;
}
describe('Studio application intake', () => {
  it('saves a pending application and sends fixed notifications without Stripe calls', async () => {
    const result = await call(input());
    expect(result.code).toBe(200); expect(result.data.receiptEmail).toBe('sent');
    const r = await core.load(result.data.reference);
    expect(r.status).toBe('awaiting_review'); expect(r.plan.amount).toBe(74800); expect(r.billing).toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ from: 'CORE Studio <info@core-ai.jp>' });
    expect(Object.keys(result.data).sort()).toEqual(['receiptEmail', 'reference']);
  });
  it('deduplicates concurrent retries and identical submissions after reload', async () => {
    const payload = input(); const [a, b] = await Promise.all([call(payload), call(payload)]);
    expect(a.data.reference).toBe(b.data.reference);
    const c = await call({ ...payload, requestId: randomUUID() });
    expect(c.data.reference).toBe(a.data.reference); expect(sendMail).toHaveBeenCalledTimes(2);
  });
  it('recovers a saved receipt after its requested month has passed', async () => {
    const payload = input(); const a = await call(payload);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
      const b = await call(payload); expect(b.code).toBe(200); expect(b.data.reference).toBe(a.data.reference);
    } finally { vi.useRealTimers(); }
  });
  it('rejects changed payload with the same request id', async () => {
    const payload = input(); await call(payload);
    expect((await call({ ...payload, company: '変更された会社' })).code).toBe(409);
  });
  it.each([{ amount: 1 }, { version: 'old' }])('rejects stale or manipulated prices %j', async extra => {
    expect((await call(input(extra))).code).toBe(409); expect(sendMail).not.toHaveBeenCalled();
  });
  it.each([{ consent: false }, { website: 'spam' }, { payment: 'direct_debit' }, { email: 'a@b.com\r\nBcc:test@test.com' }, { startMonth: '2000-01' }])('rejects invalid inputs %j', async extra => {
    expect((await call(input(extra))).code).toBe(422); expect(sendMail).not.toHaveBeenCalled();
  });
  it('does not acknowledge or mail when durable storage fails', async () => {
    failStore = true; expect((await call(input())).code).toBe(503); expect(sendMail).not.toHaveBeenCalled();
  });
  it('preserves a saved receipt if SMTP is uncertain and never automatically resends', async () => {
    sendMail.mockRejectedValueOnce(new Error('timeout'));
    const payload = input(); const a = await call(payload); const b = await call(payload);
    expect(a.data.reference).toBe(b.data.reference); expect(a.data.receiptEmail).toBe('unknown');
    expect(sendMail).toHaveBeenCalledTimes(2); expect(await core.load(a.data.reference)).not.toBeNull();
  });
  it('protects private applications and billing mutation', async () => {
    expect((await call()).code).toBe(401);
    expect((await call(input(), { query: { action: 'activate' } })).code).toBe(401);
    expect((await call(input(), { headers: { origin: 'https://attacker.invalid' } })).code).toBe(403);
  });
  it('fails closed for an unconfigured company billing account', async () => {
    const receipt = await call(input());
    const result = await call({ reference: receipt.data.reference, confirmed: true, evidence: '顧客確認の記録', startDate: startMonths()[0] + '-20' }, { headers: { origin: 'https://www.core-ai.jp', authorization: 'Bearer test-admin-key-at-least-24-characters' }, query: { action: 'activate' } });
    expect(result.code).toBe(409); expect(result.data.error).toContain('法人Stripe');
    expect((await core.load(receipt.data.reference)).billing).toBeUndefined();
  });
  it('rejects personal SMTP and requires an explicit company mail transport', async () => {
    vi.stubEnv('GMAIL_USER', 'personal@example.invalid'); vi.stubEnv('RESEND_API_KEY', '');
    const r = await call(input()); expect(r.code).toBe(200); expect(r.data.receiptEmail).toBe('pending'); expect(sendMail).not.toHaveBeenCalled();
  });
  it('exposes notifications only to authenticated administrators', async () => {
    await call(input()); const result = await call(undefined, { headers: { authorization: 'Bearer test-admin-key-at-least-24-characters' } });
    expect(result.code).toBe(200); expect(result.data.applications).toHaveLength(1); expect(result.data.billingConfigured).toBe(false);
    expect(result.headers['Cache-Control']).toBe('no-store');
  });
});
describe('shared plan and local calendar contracts', () => {
  it('uses the five displayed monthly prices without tax added', () => {
    expect(['m1', 'm2', 'm4', 'm8', 'm12'].map(id => applicationPlan(id)?.amount)).toEqual([74800, 118000, 228000, 398000, 548000]);
    expect(applicationPlan('premium')).toBeNull();
  });
  it('uses Japan local months at a UTC month boundary', () => {
    const months = startMonths(new Date('2026-10-31T15:01:00Z'));
    expect(months[0]).toBe('2026-11'); expect(months.at(-1)).toBe('2027-11');
  });
});
