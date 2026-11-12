import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import content from './realFilmPlans.json';
import { ArrowRight } from 'lucide-react';
import { C, D, SANS, SERIF } from './theme';
import { CONTACT } from './plans';
import { track } from './track';
import './realFilm.css';

const money = (value: number) => `¥${value.toLocaleString('ja-JP')}`;
const getMode = () => new URLSearchParams(window.location.search).get('production') === 'live' ? 'live' : 'ai';

export function FilmProductionPicker({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState(getMode);
  useEffect(() => {
    const sync = () => setMode(getMode());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const select = (next: 'ai' | 'live') => {
    setMode(next);
    const url = new URL(window.location.href);
    if (next === 'live') url.searchParams.set('production', 'live');
    else url.searchParams.delete('production');
    window.history.replaceState(window.history.state, '', url);
    track('studio_film_nav', { to: next === 'live' ? 'real-pv' : 'ai-film' });
  };
  return <div style={{ '--pv-ink': C.ink, '--pv-body': C.body, '--pv-paper': C.alt,
    '--pv-gold': C.goldText, '--pv-line': C.line, '--pv-dark': D.bg,
    '--pv-sans': SANS, '--pv-serif': SERIF } as CSSProperties}>
    <nav className="pv-switch" aria-label="映像制作の種類">
      <button type="button" aria-pressed={mode === 'ai'} onClick={() => select('ai')}>
        <span>AI映像制作</span><small>撮影を伴わない映像制作</small>
      </button>
      <button type="button" aria-pressed={mode === 'live'} onClick={() => select('live')}>
        <span>実写PV制作</span><small>撮影・ヘアメイク・空撮・編集</small>
      </button>
    </nav>
    {mode === 'live' ? <RealFilmPlans /> : children}
  </div>;
}

function RealFilmPlans() {
  return <section className="pv" aria-labelledby="pv-heading">
    <div className="pv-inner">
      <header className="pv-heading">
        <p className="pv-kicker">CORE STUDIO / LIVE ACTION</p>
        <h1 id="pv-heading">{content.title.split('、').map((part, i) => <span key={part}>{part}{i === 0 ? '、' : ''}</span>)}</h1>
        <p className="pv-lead">{content.lead}</p>
      </header>
      <div className="pv-price-intro"><h2>実写PV制作、3つのプラン。</h2><p>{content.unit}</p></div>
      <div className="pv-grid">
        {content.plans.map((plan, index) => <article className="pv-plan" key={plan.id}>
          <div className="pv-plan-top"><span className="pv-number">0{index + 1}</span><h3>{plan.name}</h3></div>
          <p className="pv-headline">{plan.headline}</p>
          <p className="pv-price"><strong>{plan.price / 10000}</strong><span>万円<span className="pv-tax">税別 / 1作品</span></span></p>
          <p className="pv-inclusive">税込 {money(Math.round(plan.price * 1.1))}</p>
          <p className="pv-for">{plan.for}</p>
          <dl>{content.rows.map(([label, key]) => <div key={key}>
            <dt>{label}</dt><dd>{String(plan[key as keyof typeof plan])}</dd>
          </div>)}</dl>
          <a className="pv-cta" href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => track('studio_film_pricing_cta', { plan: `live-${plan.id}`, to: 'line' })}>
            {plan.price / 10000}万円プランを相談する<ArrowRight size={18} aria-hidden="true" />
          </a>
        </article>)}
      </div>
      <p className="pv-contact-note">LINEが開きます。ご希望のプラン名をお知らせください。ご相談・お見積もりは無料です。</p>
      <section className="pv-common" aria-labelledby="pv-common-heading">
        <h2 id="pv-common-heading">すべてのプランに含むもの。</h2>
        <div className="pv-common-grid">{content.common.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
      </section>
      <section className="pv-recurring"><p className="pv-kicker">CONTINUOUS PRODUCTION</p><h2>{content.recurring.title}</h2><p>{content.recurring.body}</p><a href={CONTACT.lineUrl} className="pv-text-link" target="_blank" rel="noopener noreferrer" onClick={() => track('studio_film_pricing_cta', { plan: 'live-recurring', to: 'line' })}>継続制作について相談する <ArrowRight size={18} aria-hidden="true" /></a></section>
      <section className="pv-terms" aria-labelledby="pv-terms-heading"><h2 id="pv-terms-heading">ご依頼前に、ご確認ください。</h2><dl>{content.terms.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.body}</dd></div>)}</dl></section>
    </div>
  </section>;
}
