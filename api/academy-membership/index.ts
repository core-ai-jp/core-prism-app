import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { redis, mail } from '../_lib/academy.js';

const ORIGIN = 'https://www.core-ai.jp';
const PREFIX = 'academy:members:v1:';
const SESSION_DAYS = 30;
const enabled = () => process.env.ACADEMY_MEMBERSHIP_ENABLED === 'true'
  && !!process.env.ACADEMY_STRIPE_SECRET_KEY
  && !!process.env.ACADEMY_STRIPE_PRICE_ID
  && !!process.env.ACADEMY_STRIPE_TAX_RATE_JP_10
  && process.env.ACADEMY_CONTENT_READY === 'true'
  && !!process.env.ACADEMY_STRIPE_ACCOUNT_ID
  && !!process.env.ACADEMY_MEMBER_SIGNING_KEY
  && !!process.env.UPSTASH_REDIS_REST_URL
  && !!process.env.UPSTASH_REDIS_REST_TOKEN
  && !!(process.env.RESEND_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
const stripe = () => new Stripe(process.env.ACADEMY_STRIPE_SECRET_KEY!);
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const keyed = (v: string) => createHmac('sha256', process.env.ACADEMY_MEMBER_SIGNING_KEY!).update(v).digest('hex');
const randomToken = () => randomBytes(32).toString('hex');
const answer = (res: VercelResponse, data: unknown, status = 200) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(data);
};
const sameOrigin = (req: VercelRequest) => req.headers.origin === ORIGIN
  || (process.env.VERCEL_ENV === 'preview' && req.headers.origin === `https://${process.env.VERCEL_URL}`);
const asString = (v: unknown) => typeof v === 'string' ? v : '';
const getCookie = (req: VercelRequest, name: string) => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || '';
const cookie = (res: VercelResponse, value: string, days = SESSION_DAYS) => res.setHeader('Set-Cookie', `academy_member=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`);
const active = (status: string) => status === 'active' || status === 'trialing';
type Member = { customerId: string; subscriptionId: string; status: string };
type Lesson = { id: string; title: string; summary: string; month: string; releaseAt: string; body: string };
const keyForEmail = (email: string) => PREFIX + 'subscriber:' + keyed(email.trim().toLowerCase());
async function rateLimit(req: VercelRequest, identity: string, max = 5) {
  const ip = asString(req.headers['x-vercel-forwarded-for']) || asString(req.headers['x-forwarded-for']) || 'unknown';
  const key = PREFIX + 'rate:' + keyed(ip.split(',')[0] + ':' + identity) + ':' + new Date().toISOString().slice(0, 13);
  const count = Number(await redis(['INCR', key])); await redis(['EXPIRE', key, 7200]);
  return count <= max;
}
async function account(s: Stripe) {
  const expected = process.env.ACADEMY_STRIPE_ACCOUNT_ID;
  const current = await s.accounts.retrieve();
  if (!expected || current.id !== expected) throw new Error('MERCHANT_MISMATCH');
}
async function member(req: VercelRequest): Promise<Member | null> {
  const token = getCookie(req, 'academy_member');
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const emailKey = await redis(['GET', PREFIX + 'session:' + digest(token)]);
  if (typeof emailKey !== 'string' || !emailKey.startsWith(PREFIX + 'subscriber:')) return null;
  const record = await redis(['GET', emailKey]);
  if (typeof record !== 'string') return null;
  const data = JSON.parse(record) as Member;
  if (!data.customerId || !data.subscriptionId) return null;
  return data;
}
async function paidMember(req: VercelRequest): Promise<Member | null> {
  const data = await member(req); if (!data) return null;
  const s = stripe(); await account(s);
  const sub = await s.subscriptions.retrieve(data.subscriptionId);
  if (sub.customer !== data.customerId || !active(sub.status) || !sub.items.data.some(x => x.price.id === process.env.ACADEMY_STRIPE_PRICE_ID)) return null;
  return data;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = asString(req.query.action || 'config');
  if (req.method === 'GET' && action === 'config') return answer(res, { ready: enabled(), amount: 5500, currency: 'jpy', interval: 'month' });
  if (action !== 'publish' && !enabled()) return answer(res, { error: 'MEMBERSHIP_NOT_READY', message: '現在、会員受付の準備中です。' }, 503);
  if (req.method === 'POST' && action !== 'publish' && !sameOrigin(req)) return answer(res, { error: 'ORIGIN' }, 403);
  try {
    if (action === 'checkout' && req.method === 'POST') {
      if (!await rateLimit(req, 'checkout', 8)) return answer(res, { error: 'RATE_LIMIT' }, 429);
      const s = stripe(); await account(s);
      const p = await s.prices.retrieve(process.env.ACADEMY_STRIPE_PRICE_ID!);
      if (p.currency !== 'jpy' || p.unit_amount !== 5500 || p.recurring?.interval !== 'month' || p.tax_behavior !== 'inclusive' || !p.active) throw new Error('INVALID_PRICE');
      const tax = await s.taxRates.retrieve(process.env.ACADEMY_STRIPE_TAX_RATE_JP_10!);
      if (!tax.active || tax.percentage !== 10 || tax.inclusive !== true) throw new Error('INVALID_TAX_RATE');
      const session = await s.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: p.id, quantity: 1, tax_rates: [tax.id] }],
        success_url: ORIGIN + '/academy/member?checkout=complete',
        cancel_url: ORIGIN + '/academy/member?checkout=cancelled',
        allow_promotion_codes: false,
        billing_address_collection: 'auto',
        metadata: { source: 'core_academy_b2c' }
      });
      return answer(res, { url: session.url });
    }
    if (action === 'login' && req.method === 'POST') {
      const email = asString(req.body?.email).trim().toLowerCase();
      if (!/^[^\s@]{1,70}@[^\s@]{1,180}\.[^\s@]{2,}$/.test(email)) return answer(res, { error: 'EMAIL_INVALID' }, 422);
      if (!await rateLimit(req, 'login:' + keyed(email), 4)) return answer(res, { error: 'RATE_LIMIT' }, 429);
      const key = keyForEmail(email);
      const record = await redis(['GET', key]);
      if (typeof record === 'string') {
        const m = JSON.parse(record) as Member;
        if (m.customerId && m.subscriptionId) {
          const token = randomToken();
          await redis(['SET', PREFIX + 'magic:' + digest(token), key, 'EX', 900]);
          const link = ORIGIN + '/academy/member#token=' + token;
          await mail(email, 'CORE Academy 会員ログイン', '会員ページへのログインはこちら（15分間・1回限り）:\n' + link + '\n\n心当たりがなければ、このメールを無視してください。', 'academy-member-login:' + digest(token));
        }
      }
      return answer(res, { ok: true, message: '会員登録のあるメールアドレス宛にログインリンクを送信しました。' });
    }
    if (action === 'verify' && req.method === 'POST') {
      const token = asString(req.body?.token);
      if (!/^[a-f0-9]{64}$/.test(token)) return answer(res, { error: 'TOKEN_INVALID' }, 422);
      const key = await redis(['GETDEL', PREFIX + 'magic:' + digest(token)]);
      if (typeof key !== 'string' || !key.startsWith(PREFIX + 'subscriber:')) return answer(res, { error: 'TOKEN_EXPIRED' }, 401);
      const session = randomToken();
      await redis(['SET', PREFIX + 'session:' + digest(session), key, 'EX', SESSION_DAYS * 86400]);
      cookie(res, session);
      return answer(res, { ok: true });
    }
    if (action === 'logout' && req.method === 'POST') {
      const session = getCookie(req, 'academy_member');
      if (/^[a-f0-9]{64}$/.test(session)) await redis(['DEL', PREFIX + 'session:' + digest(session)]);
      cookie(res, '', 0); return answer(res, { ok: true });
    }
    if (action === 'library' && req.method === 'GET') {
      if (!await paidMember(req)) return answer(res, { error: 'SUBSCRIPTION_REQUIRED' }, 401);
      const ids = await redis(['ZRANGEBYSCORE', PREFIX + 'lessons:released', '-inf', Date.now(), 'LIMIT', 0, 100]);
      const lessons: Omit<Lesson, 'body'>[] = [];
      if (Array.isArray(ids)) for (const id of ids) {
        const raw = await redis(['GET', PREFIX + 'lesson:' + id]);
        if (typeof raw !== 'string') continue;
        const { body: _body, ...meta } = JSON.parse(raw) as Lesson;
        void _body;
        lessons.push(meta);
      }
      return answer(res, { lessons });
    }
    if (action === 'lesson' && req.method === 'GET') {
      if (!await paidMember(req)) return answer(res, { error: 'SUBSCRIPTION_REQUIRED' }, 401);
      const id = asString(req.query.id);
      if (!/^[a-z0-9-]{4,80}$/.test(id)) return answer(res, { error: 'INVALID_ID' }, 422);
      const raw = await redis(['GET', PREFIX + 'lesson:' + id]);
      if (typeof raw !== 'string') return answer(res, { error: 'NOT_FOUND' }, 404);
      const lesson = JSON.parse(raw) as Lesson;
      if (Date.parse(lesson.releaseAt) > Date.now()) return answer(res, { error: 'NOT_RELEASED' }, 404);
      return answer(res, { lesson });
    }
    if (action === 'portal' && req.method === 'POST') {
      const m = await member(req); if (!m) return answer(res, { error: 'LOGIN_REQUIRED' }, 401);
      const s = stripe(); await account(s);
      const session = await s.billingPortal.sessions.create({ customer: m.customerId, return_url: ORIGIN + '/academy/member' });
      return answer(res, { url: session.url });
    }
    if (action === 'publish' && req.method === 'POST') {
      const secret = asString(req.headers.authorization).replace(/^Bearer /, '');
      const expected = process.env.ACADEMY_CONTENT_ADMIN_KEY || '';
      const correct = expected.length >= 32 && secret.length === expected.length && timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
      if (process.env.ACADEMY_CONTENT_PUBLISH_ENABLED !== 'true' || !correct) return answer(res, { error: 'FORBIDDEN' }, 403);
      const l = req.body as Lesson;
      if (!/^[a-z0-9-]{4,80}$/.test(l?.id || '') || typeof l.title !== 'string' || l.title.length > 150 ||
          typeof l.summary !== 'string' || l.summary.length > 300 || typeof l.body !== 'string' ||
          l.body.length < 60 || l.body.length > 20000 || !/^\d{4}-\d{2}$/.test(l.month || '') ||
          !Number.isFinite(Date.parse(l.releaseAt))) return answer(res, { error: 'INVALID_LESSON' }, 422);
      await redis(['SET', PREFIX + 'lesson:' + l.id, JSON.stringify(l)]);
      await redis(['ZADD', PREFIX + 'lessons:released', Date.parse(l.releaseAt), l.id]);
      return answer(res, { ok: true, id: l.id, releaseAt: l.releaseAt });
    }
    return answer(res, { error: 'NOT_FOUND' }, 404);
  } catch (err) {
    console.error('academy-membership', err instanceof Error ? err.message : 'unknown');
    return answer(res, { error: 'TEMPORARY_UNAVAILABLE', message: '処理できませんでした。時間をおいてお試しください。' }, 503);
  }
}
