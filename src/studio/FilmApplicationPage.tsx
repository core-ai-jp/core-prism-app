import { useEffect, useRef, useState, type FormEvent } from 'react';
import { applicationPlan, APPLICATION_VERSION, formatYen, paymentLabel, startMonths, type FilmApplicationInput } from './filmApplication';
import './filmApplication.css';

export default function FilmApplicationPage({ planId }: { planId: string }) {
  const plan = applicationPlan(planId);
  const draftKey = `studio-film-application:${planId}`;
  const [saved] = useState(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      return data?.input?.version === APPLICATION_VERSION && data.input.plan === planId ? data : null;
    } catch { return null; }
  });
  const [review, setReview] = useState(Boolean(saved));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ reference: string; receiptEmail: string } | null>(saved?.receipt || null);
  const [uncertain, setUncertain] = useState(Boolean(saved && !saved.receipt));
  const [input, setInput] = useState<FilmApplicationInput>(() => saved?.input || ({
    requestId: crypto.randomUUID(), plan: planId, amount: plan?.amount || 0, version: APPLICATION_VERSION,
    company: '', name: '', email: '', startMonth: startMonths()[0], payment: 'bank_transfer', notes: '', consent: false, website: '',
  }));
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [review, receipt]);
  if (!plan) return <section className="fa-page"><h1>プランを選び直してください</h1><a href="/studio/film#film-pricing">料金表に戻る</a></section>;
  const update = (key: keyof FilmApplicationInput, value: string | boolean) => setInput(s => ({ ...s, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!review) { setReview(true); return; }
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    // A lost response or reload must keep the same request, including its consent snapshot.
    try { sessionStorage.setItem(draftKey, JSON.stringify({ input })); } catch { /* Server-side deduplication remains available. */ }
    setUncertain(true);
    let serverError = '';
    try {
      const response = await fetch('/api/studio/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reference) {
        if ([400, 403, 404, 422, 429].includes(response.status)) setUncertain(false);
        serverError = data.error || '受付状況を確認できませんでした。入力を残したまま、もう一度お試しください。';
        throw new Error(serverError);
      }
      setReceipt(data);
      try { sessionStorage.setItem(draftKey, JSON.stringify({ input, receipt: data })); } catch { /* Receipt is still shown. */ }
    } catch {
      setError(serverError || '通信を確認して、もう一度お試しください。入力内容は残っています。');
    } finally { pending.current = false; setBusy(false); }
  }
  return <section className="fa-page">
    <a className="fa-back" href="/studio/film#film-pricing">映像制作の料金表に戻る</a>
    <p className="fa-kicker">CORE Studio / お申し込み</p>
    <h1 ref={heading} tabIndex={-1}>{receipt ? 'お申し込みを受け付けました。' : review ? 'お申し込み内容の確認' : '制作の申し込み'}</h1>
    <p className="fa-lead">{receipt ? '制作枠と開始日を確認し、担当者からご連絡します。' : 'プランを選んだまま、ここでお申し込みいただけます。制作枠と開始日を確認してから、正式なお見積りとお支払い方法をご案内します。'}</p>
    {receipt ? <div className="fa-receipt" role="status">
      <p>{plan.name} / {formatYen(input.amount)}（税込{plan.recurring ? '・月額' : '・単発'}）<br />{paymentLabel(input.payment)}</p>
      <p>受付番号</p><strong>{receipt.reference}</strong>
      <p>{receipt.receiptEmail === 'sent' ? '確認メールを送信しました。届かない場合は迷惑メールフォルダもご確認ください。' : receipt.receiptEmail === 'pending' ? 'お申し込みは保存されています。確認メールの送信を準備中です。再度申し込まず、この受付番号をお控えください。' : 'お申し込みは保存されています。確認メールの送信状況を確認中です。再度申し込まず、この受付番号をお控えください。'}</p>
      <p>この時点では契約・課金・制作開始は確定していません。{input.payment === 'bank_transfer' ? '銀行振込のご案内は、内容確定後にお送りします。' : 'カード情報を入力する決済ページは、内容確定後にお送りします。'}</p>
      <a className="st-btn st-btn-primary" href="/studio/film">映像制作のページへ</a>
    </div> : <div className="fa-layout">
      <aside className="fa-summary" aria-label="選択したプラン">
        <p className="fa-kicker">選択したプラン</p><h2>{plan.name}</h2>
        <p className="fa-price">{formatYen(plan.amount)}<small>税込{plan.recurring ? ' / 月額' : ' / 単発'}</small></p>
        <details><summary>制作仕様・条件を確認する</summary><ul>{[...plan.specification, ...plan.conditions].map(s => <li key={s}>{s}</li>)}</ul></details>
        <p className="fa-note">表示額をもとに内容を確認します。追加費用や条件の変更がある場合は、着手前にご承認をいただきます。</p>
      </aside>
      <form className="fa-form" onSubmit={submit}>
        {review ? <>
          <dl className="fa-review">{[
            ['会社名・屋号', input.company], ['ご担当者名', input.name], ['メールアドレス', input.email],
            ['希望開始月', input.startMonth.replace('-', '年') + '月'], ['お支払い方法', paymentLabel(input.payment)], ['ご要望', input.notes || 'なし'],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <p className="fa-notice">{input.payment === 'bank_transfer' ? `内容確定後に請求書と振込先をご案内します。${plan.recurring ? '毎月の請求書に沿ってお振り込みいただく方式で、自動引落しではありません。' : ''}` : '内容確定後にカード決済ページをご案内します。ここではカード情報を入力しません。'}</p>
          <p className="fa-note">申込受付後、制作枠・開始日・お見積りを確認し、双方の合意をもって正式なお申し込みとなります。</p>
          <label className="fa-consent"><input type="checkbox" required checked={input.consent} onChange={e => update('consent', e.target.checked)} /><span>選択したプラン・制作条件と上記の受付後の流れを確認し、<a href="/privacy" target="_blank" rel="noreferrer">プライバシーポリシー</a>に同意します。</span></label>
        </> : <>
          <label>会社名・屋号 <span>必須</span><input name="organization" autoComplete="organization" required maxLength={100} value={input.company} onChange={e => update('company', e.target.value)} /></label>
          <label>ご担当者名 <span>必須</span><input name="name" autoComplete="name" required maxLength={80} value={input.name} onChange={e => update('name', e.target.value)} /></label>
          <label>メールアドレス <span>必須</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={input.email} onChange={e => update('email', e.target.value)} /><small>請求・申込確認を受け取れるメールアドレスをご入力ください。</small></label>
          <label>希望開始月 <span>必須</span><select value={input.startMonth} onChange={e => update('startMonth', e.target.value)}>{startMonths().map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}</select></label>
          <fieldset><legend>お支払い方法</legend>
            <label className="fa-choice"><input type="radio" name="payment" value="bank_transfer" checked={input.payment === 'bank_transfer'} onChange={() => update('payment', 'bank_transfer')} /><span><b>銀行振込（請求書払い）</b><small>法人の経理処理に。{plan.recurring ? '毎月の請求書に沿ってお振り込み。' : '内容確定後、請求書をご案内。'}</small></span></label>
            <label className="fa-choice"><input type="radio" name="payment" value="card" checked={input.payment === 'card'} onChange={() => update('payment', 'card')} /><span><b>カード払い</b><small>{plan.recurring ? '初回のカード登録後、毎月自動でお支払い。' : '内容確定後、カード決済ページをご案内。'}</small></span></label>
          </fieldset>
          <label>制作内容・ご要望 <small>任意</small><textarea rows={4} maxLength={1000} value={input.notes} onChange={e => update('notes', e.target.value)} placeholder="映像の用途、希望する公開時期など" /></label>
          <div className="fa-honey" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={input.website} onChange={e => update('website', e.target.value)} /></label></div>
        </>}
        {error && <p className="fa-error" role="alert">{error}</p>}
        {uncertain && <p className="fa-note">前回の受付状況を確認できます。同じ内容で確認するため、新しい申込は作りません。</p>}
        <div className="fa-actions">{review && <button type="button" className="st-btn st-btn-ghost" disabled={busy || uncertain} onClick={() => { setReview(false); setError(''); }}>入力内容を修正する</button>}
          <button type="submit" className="st-btn st-btn-primary" disabled={busy}>{busy ? '受け付けています…' : review ? uncertain ? '受付状況を確認する' : 'この内容で申し込む' : '申込内容を確認する'}</button></div>
        <p className="fa-note">お申し込みの送信だけで、請求が発生することはありません。</p>
      </form>
    </div>}
  </section>;
}
