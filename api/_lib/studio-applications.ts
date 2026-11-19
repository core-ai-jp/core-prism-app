import { createHash, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { VercelRequest } from '@vercel/node';
import { applicationPlan, APPLICATION_VERSION, formatYen, paymentLabel, startMonths, type ApplicationPlan, type FilmApplicationInput } from '../../src/studio/filmApplication.js';

export const PREFIX = process.env.VERCEL_ENV === 'preview' ? 'studio:applications:preview:' : 'studio:applications:';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export type ApplicationRecord = {
  reference: string; fingerprint: string; createdAt: string; input: FilmApplicationInput; plan: ApplicationPlan;
  status: 'awaiting_review' | 'awaiting_payment' | 'active' | 'payment_failed' | 'cancelled';
  approval?: { startDate: string; evidence: string; approvedAt: string; daysUntilDue: number };
  billing?: { attemptedAt: string; customer?: string; price?: string; session?: string; subscription?: string; url?: string; complete?: boolean; checkoutGeneration?: number; pendingCheckoutGeneration?: number };
  lastBillingEvent?: number; lastInvoice?: { id: string; status: string; amountPaid: number; currency: string };
  invoices?: Record<string, { id: string; periodEnd: number; status: string; amountPaid: number; currency: string; eventCreated: number }>;
  subscriptionState?: { status: string; eventCreated: number };
};
export async function store(command: (string | number)[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('STORE_NOT_CONFIGURED');
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('STORE_UNAVAILABLE');
  const data = await response.json();
  if (data.error) throw new Error('STORE_UNAVAILABLE');
  return data.result;
}
export const recordKey = (reference: string) => PREFIX + 'record:' + reference;
export async function load(reference: string): Promise<ApplicationRecord | null> {
  const raw = await store(['GET', recordKey(reference)]);
  return raw ? JSON.parse(raw) : null;
}
export const save = (r: ApplicationRecord) => store(['SET', recordKey(r.reference), JSON.stringify(r)]);
export function admin(req: VercelRequest): boolean {
  const key = process.env.CORE_AGGREGATE_KEY?.trim();
  const given = String(req.headers.authorization || '').replace(/^Bearer /, '');
  const supplied = Buffer.from(given), expected = Buffer.from(key || '');
  return Boolean(key && key.length >= 24 && supplied.length === expected.length && timingSafeEqual(expected, supplied));
}
export function sameOrigin(req: VercelRequest): boolean {
  const allowed = ['https://www.core-ai.jp', 'https://core-ai.jp', 'https://studio.core-ai.jp', 'https://core-prism-app.vercel.app'];
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) allowed.push(`https://${process.env.VERCEL_URL}`);
  if (!process.env.VERCEL_ENV) allowed.push('http://localhost:5173', 'http://localhost:4173');
  return typeof req.headers.origin === 'string' && allowed.includes(req.headers.origin);
}
export function validate(raw: unknown, now = new Date(), existing?: ApplicationRecord | null): { input: FilmApplicationInput; plan: ApplicationPlan } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('入力内容を確認してください。');
  const b = raw as Record<string, unknown>;
  const string = (name: string, min: number, max: number) => {
    const v = typeof b[name] === 'string' ? (b[name] as string).trim() : '';
    if (v.length < min || v.length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)) throw new Error('入力内容を確認してください。');
    return v;
  };
  const requestId = string('requestId', 36, 36);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw new Error('ページを開き直してください。');
  const planId = string('plan', 1, 20);
  const plan = existing?.input.plan === planId ? existing.plan : applicationPlan(planId);
  if (!plan) throw new Error('プランを選び直してください。');
  const version = existing?.input.version || APPLICATION_VERSION;
  if (b.version !== version || b.amount !== plan.amount) throw new Error('PRICE_CHANGED');
  if (b.consent !== true || b.website) throw new Error('制作条件と個人情報の取り扱いへの同意をご確認ください。');
  const email = string('email', 3, 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(email)) throw new Error('メールアドレスを確認してください。');
  const startMonth = string('startMonth', 7, 7);
  if (!startMonths(now).includes(startMonth) && startMonth !== existing?.input.startMonth) throw new Error('希望開始月を選び直してください。');
  if (b.payment !== 'bank_transfer' && b.payment !== 'card') throw new Error('お支払い方法を選んでください。');
  return { plan, input: {
    requestId: requestId.toLowerCase(), plan: plan.id, amount: plan.amount, version,
    company: string('company', 1, 100), name: string('name', 1, 80), email, startMonth,
    payment: b.payment, notes: string('notes', 0, 1000), consent: true, website: '',
  } };
}
export async function rateLimit(key: string, max: number, seconds: number): Promise<boolean> {
  const result = await store(['EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, PREFIX + 'rate:' + key, seconds]);
  return result <= max;
}
export function origin() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.core-ai.jp';
}
export function mailConfigured() {
  return Boolean(process.env.STUDIO_MAIL_ENABLED === 'true' && ((process.env.GMAIL_USER?.trim().toLowerCase() === 'info@core-ai.jp' && process.env.GMAIL_APP_PASSWORD) || process.env.RESEND_API_KEY));
}
async function mail(to: string, subject: string, text: string, idempotency: string) {
  if (process.env.GMAIL_USER?.trim().toLowerCase() === 'info@core-ai.jp' && process.env.GMAIL_APP_PASSWORD) {
    const smtp = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'info@core-ai.jp', pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
    await smtp.sendMail({ from: 'CORE Studio <info@core-ai.jp>', to, subject, text, messageId: `<${hash(idempotency)}@core-ai.jp>` });
    return;
  }
  if (!process.env.RESEND_API_KEY) throw new Error('MAIL_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotency },
    body: JSON.stringify({ from: 'CORE Studio <info@core-ai.jp>', to, subject, text }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('MAIL_UNCONFIRMED');
}
export async function notice(r: ApplicationRecord, kind: 'customer' | 'owner' | 'billing', billingUrl?: string): Promise<string> {
  if (!mailConfigured()) return 'pending';
  const key = mailKey(r, kind);
  // SMTP timeouts may mean the email was accepted. Never resend an uncertain attempt automatically.
  if (await store(['SET', key, 'sending:' + Date.now(), 'NX']) !== 'OK') return (await store(['GET', key])) || 'unknown';
  const amount = `${formatYen(r.plan.amount)}（税込${r.plan.recurring ? '・月額' : '・単発'}）`;
  const subject = kind === 'owner' ? `【Studio 申込】${r.reference}` : kind === 'billing' ? `【CORE Studio】お支払いのご案内 ${r.reference}` : `【CORE Studio】お申し込み受付 ${r.reference}`;
  const summary = `受付番号：${r.reference}\nプラン：${r.plan.name}\n金額：${amount}\nお支払い：${paymentLabel(r.input.payment)}`;
  const body = kind === 'owner'
    ? `${summary}\n会社：${r.input.company}\n担当者：${r.input.name}\nメール：${r.input.email}\n希望開始月：${r.input.startMonth}\nご要望：${r.input.notes || 'なし'}\n\n管理画面：${origin()}/studio/film?manage=applications\n制作枠・開始日・顧客の了承を確認するまで請求を開始しないでください。`
    : kind === 'billing'
      ? `${summary}\n\nご確認いただいた内容で、お支払いのご案内をお送りします。\n${billingUrl}\n\n${r.input.payment === 'bank_transfer' ? '請求書の振込先・支払期限をご確認のうえお振り込みください。自動引落しではありません。' : '上記のStripe決済ページでカード情報をご登録ください。'}\n\n株式会社CORE / CORE Studio\ninfo@core-ai.jp`
      : `${summary}\n\nお申し込みを受け付けました。\n制作枠と開始日を確認し、担当者からご連絡します。\nこのメールは契約成立・入金完了を示すものではありません。この時点では請求は発生していません。\n\n心当たりがない場合は、このメールに返信してお知らせください。\n株式会社CORE / CORE Studio\ninfo@core-ai.jp`;
  try {
    await mail(kind === 'owner' ? 'info@core-ai.jp' : r.input.email, subject, body, `studio-${r.reference}-${kind}-${r.billing?.checkoutGeneration || 0}`);
    await store(['SET', key, 'sent']); return 'sent';
  } catch {
    await store(['SET', key, 'unknown']); return 'unknown';
  }
}
export function mailKey(r: ApplicationRecord, kind: string) {
  return PREFIX + 'mail:' + r.reference + ':' + kind + (kind === 'billing' && r.billing?.checkoutGeneration ? '-' + r.billing.checkoutGeneration : '');
}
