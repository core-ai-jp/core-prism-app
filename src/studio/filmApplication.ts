import { FILM_PLANS, MONTHLY_PLANS, MONTHLY_SPEC, MONTHLY_TERMS } from './film.js';

export const APPLICATION_VERSION = 'film-application-2026-10-20-v1';
export type PaymentChoice = 'bank_transfer' | 'card';
export type ApplicationPlan = {
  id: string; name: string; amount: number; recurring: boolean; specification: string[]; conditions: string[];
};
export function applicationPlan(id: string): ApplicationPlan | null {
  const monthly = MONTHLY_PLANS.find(p => p.id === id);
  if (monthly) return {
    id, name: `月${monthly.count}本`, amount: monthly.priceYen, recurring: true,
    specification: MONTHLY_SPEC.rows.map(r => `${r.label}：${r.value}`),
    conditions: [...MONTHLY_TERMS, ...MONTHLY_SPEC.excludes],
  };
  const once = FILM_PLANS.find(p => p.id === id && p.checkout);
  return once ? {
    id, name: `${once.name} / ${once.unit}`, amount: once.priceYen, recurring: false,
    specification: once.spec.map(r => `${r.label}：${r.value}`),
    conditions: [once.terms, ...once.excludes],
  } : null;
}
export const paymentLabel = (p: PaymentChoice) => p === 'card' ? 'カード払い' : '銀行振込（請求書払い）';
export const formatYen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
export function startMonths(now = new Date()): string[] {
  const [y, m] = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7).split('-').map(Number);
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}
export type FilmApplicationInput = {
  requestId: string; plan: string; amount: number; version: string;
  company: string; name: string; email: string; startMonth: string;
  payment: PaymentChoice; notes: string; consent: boolean; website: string;
};
