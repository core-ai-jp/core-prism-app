'use strict';
const api = async (action, payload) => {
  const r = await fetch('/api/academy-membership?action=' + action, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : {},
    credentials: 'same-origin', body: payload ? JSON.stringify(payload) : undefined
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || d.error || '現在処理できません。');
  return d;
};
const status = document.querySelector('#membership-status');
const message = document.querySelector('#member-message');
const checkout = document.querySelector('#checkout-button');
const login = document.querySelector('#member-login');
const library = document.querySelector('#member-library');
const list = document.querySelector('#member-lessons');
const detail = document.querySelector('#member-lesson-detail');
const submitLink = url => {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !(/(^|\.)stripe\.com$/.test(target.hostname))) throw new Error('決済先を確認できません。');
  window.location.assign(url);
};
checkout.addEventListener('click', async () => {
  checkout.disabled = true; status.textContent = 'Stripe決済画面を準備しています。';
  try { const r = await api('checkout', {}); submitLink(r.url); } catch (e) { status.textContent = e.message; checkout.disabled = false; }
});
login.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = login.querySelector('button'); btn.disabled = true; message.textContent = '送信しています…';
  try { const r = await api('login', { email: login.querySelector('input').value }); message.textContent = r.message; }
  catch(e) { message.textContent = e.message; }
  finally { btn.disabled = false; }
});
async function showLibrary() {
  try {
    const data = await api('library');
    library.hidden = false; list.replaceChildren(); detail.hidden = true;
    if (!data.lessons.length) { const p = document.createElement('p'); p.textContent = '現在公開中の教材を確認しています。新しい教材が公開されるとここに表示されます。'; list.append(p); return; }
    for (const lesson of data.lessons) {
      const card = document.createElement('article');
      const title = document.createElement('h3'); title.textContent = lesson.title;
      const summary = document.createElement('p'); summary.textContent = lesson.summary;
      const open = document.createElement('button'); open.type = 'button'; open.textContent = '教材を開く →';
      open.addEventListener('click', async () => {
        try { const response = await api('lesson&id=' + encodeURIComponent(lesson.id)); detail.hidden = false;
          document.querySelector('#lesson-title').textContent = response.lesson.title;
          document.querySelector('#lesson-body').textContent = response.lesson.body;
          detail.scrollIntoView({ behavior:'smooth', block:'start' });
        } catch(err) {message.textContent = err.message;}
      });
      card.append(title,summary,open); list.append(card);
    }
    message.textContent = 'ログイン済みです。';
  } catch { library.hidden = true; }
}
document.querySelector('#member-back').addEventListener('click',()=>{detail.hidden=true;list.scrollIntoView({behavior:'smooth'});});
document.querySelector('#billing-button').addEventListener('click', async () => {
  try { const r = await api('portal', {}); submitLink(r.url); } catch (e) { message.textContent = e.message; }
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await api('logout', {}); library.hidden=true;message.textContent='ログアウトしました。'; } catch(e) {message.textContent=e.message;}
});
(async () => {
  if (new URLSearchParams(location.search).get('checkout') === 'complete') message.textContent='決済手続きを受け付けました。確認後、決済メールアドレスからログインしてください。';
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  if (token) {
    history.replaceState(null, '', '/academy/member');
    try { await api('verify',{ token }); message.textContent='ログインしました。'; }
    catch(e){message.textContent='リンクの有効期限を確認してください。新しいログインリンクをお申し込みください。';}
  }
  try {
    const r = await api('config');
    if (r.ready) { checkout.disabled=false;status.textContent='月額5,500円（税込）で入会できます。'; }
    else status.textContent='会員受付準備中です。決済を開始していません。';
  } catch {status.textContent='現在、申込状況を確認できません。';}
  await showLibrary();
})();
