import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { load, notice, origin, PREFIX, save, store, type ApplicationRecord } from './studio-applications.js';

function verifyKeyMode() {
  const key = process.env.STUDIO_STRIPE_SECRET_KEY || '';
  if (process.env.VERCEL_ENV === 'production' && !/^(sk|rk)_live_/.test(key)) throw new Error('確認：本番用の法人Stripeキーが必要です。');
  if (process.env.VERCEL_ENV === 'preview' && !/^(sk|rk)_test_/.test(key)) throw new Error('確認：Previewではテスト用のStripeキーだけを使用してください。');
}
function verifyObjectMode(object: { livemode?: boolean }) {
  if (process.env.VERCEL_ENV && object.livemode !== (process.env.VERCEL_ENV === 'production')) throw new Error('確認：Stripeオブジェクトの本番・テスト環境が一致しません。');
}

export async function activateBilling(record: ApplicationRecord, approval: Record<string, unknown>): Promise<ApplicationRecord> {
  if (process.env.STUDIO_BILLING_ENABLED !== 'true' || !process.env.STUDIO_STRIPE_ACCOUNT_ID || !process.env.STUDIO_STRIPE_SECRET_KEY || !process.env.STUDIO_STRIPE_WEBHOOK_SECRET) {
    throw new Error('確認：法人Stripeの本番接続・Webhookを設定してから請求を開始してください。');
  }
  verifyKeyMode();
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const evidence = typeof approval.evidence === 'string' ? approval.evidence.trim() : '';
  const daysUntilDue = Number(approval.daysUntilDue);
  if (approval.confirmed !== true || approval.startDate !== today || evidence.length < 5 || evidence.length > 500 || !Number.isInteger(daysUntilDue) || daysUntilDue < 1 || daysUntilDue > 60) {
    throw new Error('確認：請求開始は合意した開始日当日に行ってください。顧客の了承を確認できる記録とチェックが必要です。');
  }
  const lock = PREFIX + 'billing-lock:' + record.reference, lockToken = randomUUID();
  if (await store(['SET', lock, lockToken, 'NX', 'EX', 120]) !== 'OK') throw new Error('確認：別の請求開始処理が進行中です。時間をおいて状態を確認してください。');
  try {
    const r = await load(record.reference);
    if (!r) throw new Error('確認：受付が見つかりません。');
    if (r.billing?.complete) { await notice(r, 'billing', r.billing.url); return r; }
    if (r.status === 'cancelled') throw new Error('確認：終了した申込の請求は開始できません。');
    if (r.billing && Date.now() - Date.parse(r.billing.attemptedAt) > 23 * 3600 * 1000) throw new Error('確認：前回の処理から時間が経過しています。Stripeの顧客・請求を照合してから対応してください。');
    const stripe = new Stripe(process.env.STUDIO_STRIPE_SECRET_KEY, { maxNetworkRetries: 0, timeout: 15000 });
    const account = await stripe.accounts.retrieve();
    // Pin the merchant explicitly. Never silently reuse the other products' legacy Stripe key.
    if (account.id !== process.env.STUDIO_STRIPE_ACCOUNT_ID || !account.charges_enabled) throw new Error('確認：Stripeの法人アカウントまたは本番決済の状態を確認してください。');
    if (!r.billing) {
      r.approval = { startDate: today, evidence, approvedAt: new Date().toISOString(), daysUntilDue };
      r.billing = { attemptedAt: new Date().toISOString() };
      await save(r);
    }
    const operation = (suffix: string) => ({ idempotencyKey: `studio-${r.reference}-${suffix}` });
    if (!r.billing.customer) {
      const customer = await stripe.customers.create({ name: r.input.company, email: r.input.email, metadata: { studio_application: r.reference } }, operation('customer'));
      verifyObjectMode(customer);
      r.billing.customer = customer.id; await save(r);
    }
    if (!r.billing.price) {
      const product = await stripe.products.create({ name: `CORE Studio ${r.plan.name}`, metadata: { studio_application: r.reference } }, operation('product'));
      const price = await stripe.prices.create({ product: product.id, currency: 'jpy', unit_amount: r.plan.amount, tax_behavior: 'inclusive', ...(r.plan.recurring ? { recurring: { interval: 'month' as const } } : {}) }, operation('price'));
      verifyObjectMode(price);
      r.billing.price = price.id; await save(r);
    }
    if (r.input.payment === 'card') {
      const session = await stripe.checkout.sessions.create({
        mode: r.plan.recurring ? 'subscription' : 'payment', customer: r.billing.customer,
        line_items: [{ price: r.billing.price, quantity: 1 }],
        success_url: `${origin()}/studio/film?payment=received`, cancel_url: `${origin()}/studio/film`,
        metadata: { studio_application: r.reference },
        ...(r.plan.recurring ? { subscription_data: { metadata: { studio_application: r.reference } } } : {}),
      }, operation('checkout'));
      verifyObjectMode(session);
      r.billing.session = session.id; r.billing.url = session.url || undefined;
      await store(['SET', PREFIX + 'session:' + session.id, r.reference]);
    } else {
      // Bank transfer subscriptions use invoice collection, never Checkout subscription mode.
      let invoiceId: string;
      if (r.plan.recurring) {
        const subscription = await stripe.subscriptions.create({
          customer: r.billing.customer, items: [{ price: r.billing.price }],
          collection_method: 'send_invoice', days_until_due: r.approval!.daysUntilDue,
          payment_settings: { payment_method_types: ['customer_balance'], payment_method_options: { customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'jp_bank_transfer' } } } },
          metadata: { studio_application: r.reference },
        }, operation('subscription'));
        verifyObjectMode(subscription);
        r.billing.subscription = subscription.id;
        await store(['SET', PREFIX + 'subscription:' + subscription.id, r.reference]);
        await save(r);
        invoiceId = typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : subscription.latest_invoice!.id;
      } else {
        const invoice = await stripe.invoices.create({
          customer: r.billing.customer, collection_method: 'send_invoice', days_until_due: r.approval!.daysUntilDue,
          auto_advance: false,
          payment_settings: { payment_method_types: ['customer_balance'], payment_method_options: { customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'jp_bank_transfer' } } } },
          metadata: { studio_application: r.reference },
        }, operation('invoice'));
        invoiceId = invoice.id!;
        await stripe.invoiceItems.create({ customer: r.billing.customer, invoice: invoiceId, price: r.billing.price }, operation('invoice-item'));
        await store(['SET', PREFIX + 'invoice:' + invoiceId, r.reference]);
      }
      let invoice = await stripe.invoices.retrieve(invoiceId);
      verifyObjectMode(invoice);
      if (invoice.status === 'draft') invoice = await stripe.invoices.finalizeInvoice(invoiceId, { auto_advance: true }, operation('finalize'));
      // Stripe sends the invoice; this fixed link is also included in our billing notice.
      if (invoice.status === 'open') invoice = await stripe.invoices.sendInvoice(invoiceId, {}, operation('send-invoice'));
      r.billing.url = invoice.hosted_invoice_url || undefined;
    }
    if (!r.billing.url) throw new Error('確認：支払いページを確認できません。Stripeで請求状況を確認してください。');
    r.billing.complete = true; r.status = 'awaiting_payment'; await save(r);
    await notice(r, 'billing', r.billing.url);
    return r;
  } finally {
    await store(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, lock, lockToken]);
  }
}

export async function renewCardLink(record: ApplicationRecord): Promise<ApplicationRecord> {
  if (process.env.STUDIO_BILLING_ENABLED !== 'true' || !process.env.STUDIO_STRIPE_ACCOUNT_ID || !process.env.STUDIO_STRIPE_SECRET_KEY || !process.env.STUDIO_STRIPE_WEBHOOK_SECRET) throw new Error('確認：法人Stripeの本番設定を確認してください。');
  verifyKeyMode();
  const key = PREFIX + 'billing-lock:' + record.reference, token = randomUUID();
  if (await store(['SET', key, token, 'NX', 'EX', 120]) !== 'OK') throw new Error('確認：処理中です。時間をおいてご確認ください。');
  try {
    const r = await load(record.reference);
    if (!r?.billing?.complete || r.input.payment !== 'card' || r.status !== 'awaiting_payment') throw new Error('確認：未払いのカード申込のみ再発行できます。');
    const stripe = new Stripe(process.env.STUDIO_STRIPE_SECRET_KEY, { maxNetworkRetries: 0, timeout: 15000 });
    const account = await stripe.accounts.retrieve();
    if (account.id !== process.env.STUDIO_STRIPE_ACCOUNT_ID || !account.charges_enabled) throw new Error('確認：法人アカウントを確認してください。');
    if (!r.billing.pendingCheckoutGeneration) {
      const current = await stripe.checkout.sessions.retrieve(r.billing.session!);
      verifyObjectMode(current);
      if (current.status === 'complete' || current.payment_status === 'paid') throw new Error('確認：支払い手続き済みです。入金通知の反映を確認してください。');
      if (current.status !== 'expired') return r;
      r.billing.pendingCheckoutGeneration = (r.billing.checkoutGeneration || 0) + 1;
      r.billing.attemptedAt = new Date().toISOString(); await save(r);
    } else if (Date.now() - Date.parse(r.billing.attemptedAt) > 23 * 3600 * 1000) throw new Error('確認：前回の再発行結果をStripeで照合してください。');
    const generation = r.billing.pendingCheckoutGeneration;
    const session = await stripe.checkout.sessions.create({
      mode: r.plan.recurring ? 'subscription' : 'payment', customer: r.billing.customer,
      line_items: [{ price: r.billing.price!, quantity: 1 }],
      success_url: `${origin()}/studio/film?payment=received`, cancel_url: `${origin()}/studio/film`,
      metadata: { studio_application: r.reference },
      ...(r.plan.recurring ? { subscription_data: { metadata: { studio_application: r.reference } } } : {}),
    }, { idempotencyKey: `studio-${r.reference}-checkout-${generation}` });
    verifyObjectMode(session);
    if (!session.url) throw new Error('確認：再発行結果をStripeで確認してください。');
    await store(['SET', PREFIX + 'session:' + session.id, r.reference]);
    r.billing.session = session.id; r.billing.url = session.url; r.billing.checkoutGeneration = generation;
    delete r.billing.pendingCheckoutGeneration; await save(r);
    await notice(r, 'billing', session.url); return r;
  } finally {
    await store(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, key, token]);
  }
}
