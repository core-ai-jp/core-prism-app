import { useEffect, type CSSProperties } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import content from './realFilmPlans.json';
import { C, D, SANS, SERIF } from './theme';
import { Band, H2 } from './ui';
import { CONTACT } from './plans';
import { track } from './track';
import './realFilm.css';

const money = (value: number) => `¥${value.toLocaleString('ja-JP')}`;

export function RealFilmPlans() {
  useEffect(() => {
    // Preserve previously shared direct links without replacing the AI-first page.
    if (new URLSearchParams(window.location.search).get('production') !== 'live') return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById('film-live');
      const header = document.querySelector('header');
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - (header?.getBoundingClientRect().height ?? 115), behavior: 'instant' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="pv" style={{ '--pv-ink': C.ink, '--pv-body': C.body,
    '--pv-paper': C.alt, '--pv-gold': C.goldText, '--pv-line': C.line,
    '--pv-dark': D.bg, '--pv-sans': SANS, '--pv-serif': SERIF } as CSSProperties}>
    <Band id="film-live" flat wide pad="64px 0">
      <div className="pv-heading">
        <H2 en="LIVE ACTION" sub="人・商品・空間を、長尺のPVに。実際の撮影をご希望の方へ。">実写の撮影も、CORE Studioで。</H2>
        <p className="pv-unit">{content.unit}</p>
      </div>
      <div className="pv-grid">
        {content.plans.map(plan => <article className="pv-plan" key={plan.id}>
          <p className="pv-name">{plan.name}</p>
          <h3>{plan.headline}</h3>
          <p className="pv-price"><strong>{plan.price / 10000}</strong><span>万円<small>税別 / 1作品</small></span></p>
          <p className="pv-inclusive">税込 {money(Math.round(plan.price * 1.1))}</p>
          <p className="pv-for">{plan.for}</p>
          <dl className="pv-summary">
            <div><dt>撮影</dt><dd>{plan.days}</dd></div>
            <div><dt>体制</dt><dd>{plan.crew}</dd></div>
            <div><dt>本編</dt><dd>{plan.mainFilm}</dd></div>
            <div><dt>SNS</dt><dd>{plan.shorts}</dd></div>
          </dl>
          <details className="pv-detail">
            <summary>制作内容を詳しく見る<ChevronDown size={17} aria-hidden="true" /></summary>
            <dl>{content.rows.filter(([,key]) => !['days','crew','mainFilm','shorts'].includes(key)).map(([label,key]) => <div key={key}><dt>{label}</dt><dd>{String(plan[key as keyof typeof plan])}</dd></div>)}</dl>
          </details>
          <a className="pv-cta st-btn" href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('studio_film_pricing_cta', { plan: `live-${plan.id}`, to: 'line' })}>このプランを相談する<ArrowRight size={17} aria-hidden="true" /></a>
        </article>)}
      </div>
      <p className="pv-contact-note">ヘアメイク・基本機材・条件付きドローン空撮・編集を含みます。ロケ地代等は別途お見積もり。相談ボタンからLINEが開きます。</p>
      <details className="pv-conditions"><summary>含まれるもの・撮影条件<ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="pv-common">{content.common.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
        <dl className="pv-terms">{content.terms.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.body}</dd></div>)}</dl>
      </details>
      <div className="pv-recurring"><div><h3>{content.recurring.title}</h3><p>{content.recurring.body}</p></div><a className="pv-text-link" href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('studio_film_pricing_cta', { plan: 'live-recurring', to: 'line' })}>継続制作のご相談<ArrowRight size={17} aria-hidden="true" /></a></div>
    </Band>
  </div>;
}
