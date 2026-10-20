import { useState, type FormEvent } from 'react';
import { formatYen, paymentLabel, type FilmApplicationInput, type ApplicationPlan } from './filmApplication';
import './filmApplication.css';

type Application = {
  reference: string; createdAt: string; input: FilmApplicationInput; plan: ApplicationPlan; status: string;
  delivery: Array<string | null>; billing?: { url?: string; complete?: boolean };
};
const statusLabel: Record<string, string> = { awaiting_review: '制作枠・開始日の確認待ち', awaiting_payment: '支払い待ち', active: '入金確認済み', payment_failed: '支払いの確認が必要', cancelled: '継続終了' };
export default function FilmApplicationsAdmin() {
  const [key, setKey] = useState('');
  const [rows, setRows] = useState<Application[] | null>(null);
  const [configured, setConfigured] = useState(false);
  const [mailConfigured, setMailConfigured] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh(e?: FormEvent) {
    e?.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/studio/applications', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || '取得できませんでした。');
      setRows(data.applications); setConfigured(data.billingConfigured); setMailConfigured(data.mailConfigured);
    } catch (e) { setError(e instanceof Error ? e.message : '取得できませんでした。'); }
    finally { setBusy(false); }
  }
  return <section className="fa-page">
    <a className="fa-back" href="/studio/film">映像制作へ戻る</a>
    <p className="fa-kicker">CORE Studio / 管理</p><h1>制作のお申し込み</h1>
    {rows === null ? <form className="fa-form fa-admin-login" onSubmit={refresh}>
      <label>管理用キー<input type="password" autoComplete="off" required value={key} onChange={e => setKey(e.target.value)} /></label>
      <button type="submit" className="st-btn st-btn-primary" disabled={busy}>受付一覧を開く</button>
    </form> : <>
      <p>最新100件を表示しています。制作枠・開始日・見積りについて、顧客の了承を確認してから請求を開始してください。</p>
      {!configured && <p className="fa-notice">法人Stripeの本番設定を確認中です。申込受付は利用できますが、請求開始は停止しています。</p>}
      {!mailConfigured && <p className="fa-notice">会社メールの送信設定を確認中です。受付一覧は保存されています。通知は設定完了後に送信してください。</p>}
      <button className="st-btn st-btn-ghost" onClick={() => refresh()} disabled={busy}>最新の状態に更新</button>
      <button className="st-btn st-btn-ghost" onClick={() => { setKey(''); setRows(null); }}>管理画面を閉じる</button>
      {rows.length === 0 && <p>現在、お申し込みはありません。新しい受付はここに表示されます。</p>}
      {rows.map(r => <ApplicationRow key={r.reference} row={r} adminKey={key} configured={configured} refresh={() => refresh()} />)}
    </>}
    {error && <p role="alert" className="fa-error">{error}</p>}
  </section>;
}
function ApplicationRow({ row: r, adminKey, configured, refresh }: { row: Application; adminKey: string; configured: boolean; refresh: () => Promise<void> }) {
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }));
  const [evidence, setEvidence] = useState('');
  const [daysUntilDue, setDaysUntilDue] = useState(7);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reconciled, setReconciled] = useState(false);
  async function action(actionName: string, kind?: string) {
    if (busy) return; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/applications?action=${actionName}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ reference: r.reference, kind, reconciled }),
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || '状態を確認してください。');
      await refresh(); setReconciled(false);
    } catch (e) { setError(e instanceof Error ? e.message : '状態を確認してください。'); }
    finally { setBusy(false); }
  }
  async function activate(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const response = await fetch('/api/studio/applications?action=activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ reference: r.reference, startDate, evidence, confirmed, daysUntilDue }),
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || '状態を確認してください。');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '状態を確認してください。'); }
    finally { setBusy(false); }
  }
  return <article className="fa-admin-row">
    <p className="fa-kicker">{statusLabel[r.status] || r.status}</p><h2>{r.input.company} / {r.plan.name}</h2>
    <p>{formatYen(r.plan.amount)}（税込{r.plan.recurring ? '・月額' : ''}） / {paymentLabel(r.input.payment)}</p>
    <p>{r.input.name} / <a href={`mailto:${r.input.email}`}>{r.input.email}</a><br />希望開始月：{r.input.startMonth}<br />受付：{new Date(r.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}<br />受付番号：{r.reference}</p>
    <pre>{r.input.notes || 'ご要望の追記なし'}</pre>
    <p className="fa-note">通知：顧客 {r.delivery[0] === 'sent' ? '送信済み' : '要確認'} / 社内 {r.delivery[1] === 'sent' ? '送信済み' : '要確認'}{r.billing?.complete ? ` / 支払い案内 ${r.delivery[2] === 'sent' ? '送信済み' : '要確認'}` : ''}</p>
    {r.billing?.url && <p><a href={r.billing.url} target="_blank" rel="noreferrer">お支払いページを確認</a></p>}
    {r.status === 'awaiting_payment' && r.input.payment === 'card' && <button className="st-btn st-btn-ghost" disabled={!configured || busy} onClick={() => action('renew-card')}>カード決済リンクの期限を確認・再発行</button>}
    {r.delivery.some((s, i) => s !== 'sent' && (i < 2 || r.billing?.complete)) && <div className="fa-form">
      <label className="fa-consent"><input type="checkbox" checked={reconciled} onChange={e => setReconciled(e.target.checked)} /><span>送信履歴を照合し、再送する通知が未送信であることを確認しました。</span></label>
      {(['customer', 'owner', 'billing'] as const).map((kind, i) => r.delivery[i] !== 'sent' && (i < 2 || r.billing?.complete) && <button key={kind} className="st-btn st-btn-ghost" disabled={!reconciled || busy} onClick={() => action('retry-notice', kind)}>{['顧客の受付通知', '社内通知', '支払い案内'][i]}を再送する</button>)}
    </div>}
    {r.status === 'awaiting_review' && <form className="fa-form" onSubmit={activate}>
      <label>合意した開始日<input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
      <label>請求書の支払期限（発行からの日数）<input type="number" required min={1} max={60} value={daysUntilDue} onChange={e => setDaysUntilDue(Number(e.target.value))} /></label>
      <label>顧客の了承を確認できる記録<textarea required minLength={5} maxLength={500} rows={2} placeholder="メールの日付・件名、合意した制作内容など" value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
      <label className="fa-consent"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>制作枠・金額・開始日・支払い方法について顧客の了承を確認しました。開始日当日に請求を開始します。</span></label>
      <button className="st-btn st-btn-primary" type="submit" disabled={!configured || busy}>{busy ? '請求の状態を確認しています…' : '合意内容で請求を開始する'}</button>
    </form>}
    {error && <p className="fa-error" role="alert">{error}</p>}
  </article>;
}
