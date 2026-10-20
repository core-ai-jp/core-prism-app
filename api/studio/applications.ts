import type { VercelRequest, VercelResponse } from '@vercel/node';
import { admin, hash, load, mailKey, notice, PREFIX, rateLimit, recordKey, sameOrigin, store, validate, type ApplicationRecord } from '../_lib/studio-applications.js';
import { activateBilling, renewCardLink } from '../_lib/studio-billing.js';

export const config = { maxDuration: 60 };
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'GET') {
      if (!admin(req)) return res.status(401).json({ error: '管理者認証が必要です。' });
      const ids: string[] = await store(['ZREVRANGE', PREFIX + 'index', 0, 99]);
      const records = ids.length ? await store(['MGET', ...ids.map(recordKey)]) : [];
      const applications = await Promise.all(records.filter(Boolean).map(async (raw: string) => {
        const r = JSON.parse(raw) as ApplicationRecord;
        const delivery = await store(['MGET', ...['customer', 'owner', 'billing'].map(k => mailKey(r, k))]);
        return { ...r, delivery };
      }));
      return res.status(200).json({ applications, billingConfigured: Boolean(process.env.STUDIO_BILLING_ENABLED === 'true' && process.env.STUDIO_STRIPE_ACCOUNT_ID && process.env.STUDIO_STRIPE_SECRET_KEY && process.env.STUDIO_STRIPE_WEBHOOK_SECRET) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!sameOrigin(req)) return res.status(403).json({ error: 'ページを開き直してお試しください。' });
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: '入力内容を確認してください。' }); }
    if (!body || JSON.stringify(body).length > 12000) return res.status(400).json({ error: '入力内容を確認してください。' });
    if (['activate', 'renew-card', 'retry-notice'].includes(String(req.query.action))) {
      if (!admin(req)) return res.status(401).json({ error: '管理者認証が必要です。' });
      if (!/^FILM-[a-f0-9]{32}$/.test(body.reference || '')) return res.status(400).json({ error: '受付番号を確認してください。' });
      const r = await load(body.reference);
      if (!r) return res.status(404).json({ error: '申込が見つかりません。' });
      if (req.query.action === 'retry-notice') {
        if (!['customer', 'owner', 'billing'].includes(body.kind) || body.reconciled !== true) return res.status(422).json({ error: '送信履歴を照合し、未送信であることを確認してください。' });
        if (body.kind === 'billing' && !r.billing?.url) return res.status(409).json({ error: '請求は開始されていません。' });
        const key = mailKey(r, body.kind);
        const previous = await store(['GET', key]);
        if (previous?.startsWith('sending:') && Date.now() - Number(previous.slice(8)) < 120000) return res.status(409).json({ error: '通知の処理中です。時間をおいて送信履歴を確認してください。' });
        // Only an administrator who has reconciled the mail history may release an uncertain attempt.
        if (previous && previous !== 'sent') await store(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0", 1, key, previous]);
        return res.status(200).json({ status: await notice(r, body.kind, r.billing?.url) });
      }
      const result = req.query.action === 'renew-card' ? await renewCardLink(r) : await activateBilling(r, body);
      return res.status(200).json({ reference: result.reference, status: result.status, url: result.billing?.url });
    }
    let validated;
    try { validated = validate(body); } catch (e) {
      const error = e instanceof Error ? e.message : '入力内容を確認してください。';
      return res.status(error === 'PRICE_CHANGED' ? 409 : 422).json({ error: error === 'PRICE_CHANGED' ? '料金または制作条件が更新されています。ページを再読み込みしてご確認ください。' : error });
    }
    const { input, plan } = validated;
    let reference = 'FILM-' + input.requestId.replaceAll('-', '');
    const fingerprint = hash(JSON.stringify({ ...input, requestId: undefined }));
    let r = await load(reference);
    if (r && r.fingerprint !== fingerprint) return res.status(409).json({ error: 'この受付の入力内容が変更されています。受付状況の確認が必要です。再送せず、info@core-ai.jpへお問い合わせください。' });
    if (!r) {
      const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0];
      if (!(await rateLimit('ip:' + hash(ip), 10, 3600)) || !(await rateLimit('email:' + hash(input.email), 5, 86400))) return res.status(429).json({ error: '送信が続いています。時間をおいてお試しください。' });
      const candidate: ApplicationRecord = { reference, fingerprint, input, plan, createdAt: new Date().toISOString(), status: 'awaiting_review' };
      // Record and index are written atomically. Retry after a lost response reads the exact same application.
      const raw = await store(['EVAL', "local old=redis.call('GET',KEYS[1]); if old then return old end; local prior=redis.call('GET',KEYS[3]); if prior then local record=redis.call('GET',prior); if record then return record end end; redis.call('SET',KEYS[1],ARGV[1]); redis.call('ZADD',KEYS[2],ARGV[2],ARGV[3]); redis.call('SET',KEYS[3],KEYS[1],'EX',86400); return ARGV[1]", 3, recordKey(reference), PREFIX + 'index', PREFIX + 'dedup:' + fingerprint, JSON.stringify(candidate), Date.now(), reference]);
      r = JSON.parse(raw) as ApplicationRecord;
      if (r.fingerprint !== fingerprint) return res.status(409).json({ error: '申込内容の確認が必要です。再送せずお問い合わせください。' });
    }
    reference = r.reference;
    const [receiptEmail] = await Promise.all([notice(r, 'customer'), notice(r, 'owner')]);
    return res.status(200).json({ reference, receiptEmail });
  } catch (e) {
    // Never emit provider errors or input payloads: they can contain credentials and personal data.
    const message = e instanceof Error ? e.message : '';
    if (message.startsWith('確認：')) return res.status(409).json({ error: message.slice(3) });
    return res.status(503).json({ error: '受付状況を確認できませんでした。入力を残したまま、もう一度お試しください。' });
  }
}
