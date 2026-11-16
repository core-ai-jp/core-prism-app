import { Component, lazy, Suspense, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import data from './robotsContent.json';
import { rememberIntent } from './corpIntent';
import './robots.css';

const SorterScene = lazy(() => import('./robots/SorterScene'));
type AnchorHandler = (e: MouseEvent<HTMLAnchorElement>, href: string) => void;

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="robots-scene-hint" role="status">{data.scene.fallback}</p> : this.props.children; }
}

export function RobotsHome({ onAnchor }: { onAnchor: AnchorHandler }) {
  return <aside className="robots-home" aria-labelledby="robots-home-title">
    <div><p className="robots-kicker">CORE ROBOTS / {data.state}</p><h3 id="robots-home-title">{data.home.title}</h3><p>{data.home.body}</p></div>
    <a href={data.seo.path} onClick={e => onAnchor(e, data.seo.path)}>{data.home.cta}<ArrowUpRight size={20} aria-hidden="true" /></a>
    <span className="robots-stage">{data.stage}</span>
  </aside>;
}

export default function RobotsPage({ onAnchor }: { onAnchor: AnchorHandler }) {
  const [show3d, setShow3d] = useState(true);
  return <main className="robots-page" id="robots-main">
    <a className="robots-skip" href="#robots-field">研究開発の方針へ進む</a>
    <section className="robots-hero" aria-labelledby="robots-title">
      <div className="robots-hero-copy robots-wrap">
        <p className="robots-kicker">{data.hero.kicker}</p>
        <div className="robots-hero-head"><h1 id="robots-title">{data.hero.title.map(line => <span key={line}>{line}</span>)}</h1>
          <div><p className="robots-hero-lead">{data.hero.lead}</p><p className="robots-stage">{data.stage}</p></div></div>
        <a className="robots-button robots-hero-primary" href="#robots-contact">{data.hero.primary}<ArrowRight size={19} aria-hidden="true" /></a>
      </div>
      <figure className="robots-figure robots-wrap">
        <div className="robots-scene-top"><span>{data.scene.title}</span><span>{data.scene.label} / CONCEPT</span></div>
        <div className="robots-scene-shell">
          <img className="robots-poster" src="/corp/robots/sorter-concept.png" width="1200" height="720" alt="卓上仕分けの構想図。左の投入トレー、中央のロボットアームと上方カメラ、右の仕分けトレー。" />
          {show3d && <SceneBoundary><Suspense fallback={null}><SorterScene /></Suspense></SceneBoundary>}
        </div>
        <div className="robots-media-switch"><button type="button" aria-pressed={!show3d} onClick={() => setShow3d(!show3d)}>{show3d ? data.scene.still : data.scene.interactive}</button></div>
        <figcaption><strong>{data.scene.caption}</strong><span>{data.scene.disclaimer}</span></figcaption>
      </figure>
      <div className="robots-wrap robots-hero-bottom"><ol className="robots-flow">{data.scene.steps.map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, '0')}</span>{step}{i < 3 && <ArrowRight size={18} aria-hidden="true" />}</li>)}</ol>
        <a className="robots-text-link" href="#robots-areas">{data.hero.secondary}<ArrowRight size={19} aria-hidden="true" /></a></div>
    </section>

    <section id={data.field.id} className="robots-section robots-wrap" aria-labelledby="robots-field-title">
      <p className="robots-kicker">{data.field.kicker}</p><div className="robots-split"><h2 id="robots-field-title">{data.field.title}</h2><div><p className="robots-lead">{data.field.lead}</p><a className="robots-text-link" href="#robots-areas">{data.hero.secondary}<ArrowRight size={18} aria-hidden="true" /></a></div></div>
      <div className="robots-field-grid">{data.field.examples.map((item, i) => <article key={item.title}><span className="robots-index">0{i + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div><p className="robots-note">{data.field.note}</p>
    </section>

    <section id={data.sim.id} className="robots-section robots-soft" aria-labelledby="robots-sim-title"><div className="robots-wrap"><p className="robots-kicker">{data.sim.kicker}</p><div className="robots-split"><h2 id="robots-sim-title">{data.sim.title}</h2><p className="robots-lead">{data.sim.lead}</p></div>
      <ol className="robots-phases">{data.sim.phases.map((phase, i) => <li key={phase.name}><span className="robots-index">0{i + 1}</span><h3>{phase.name}</h3><span className="robots-status">{phase.status}</span><p>{phase.body}</p></li>)}</ol></div></section>

    <section id={data.areas.id} className="robots-section robots-wrap" aria-labelledby="robots-areas-title"><p className="robots-kicker">{data.areas.kicker}</p><h2 id="robots-areas-title">{data.areas.title}</h2><p className="robots-lead">{data.areas.note}</p>
      <div className="robots-areas">{data.areas.items.map(area => <article key={area.code}><p className="robots-area-code">{area.code}</p><div><h3>{area.title}</h3><p>{area.body}</p><p className="robots-question">{area.question}</p></div></article>)}</div>
    </section>

    <section id={data.sorter.id} className="robots-section robots-soft" aria-labelledby="robots-sorter-title"><div className="robots-wrap"><p className="robots-kicker">{data.sorter.kicker}</p><div className="robots-split"><div><h2 id="robots-sorter-title">{data.sorter.title}</h2><p className="robots-status">{data.sorter.status}</p></div><p className="robots-lead">{data.sorter.lead}</p></div>
      <dl className="robots-checks">{data.sorter.checks.map((check, i) => <div key={check.title}><dt><span className="robots-index">0{i + 1}</span>{check.title}</dt><dd>{check.body}</dd></div>)}</dl><p className="robots-note">{data.sorter.note}</p></div></section>

    <section id={data.roai.id} className="robots-section robots-wrap" aria-labelledby="robots-roai-title"><p className="robots-kicker">{data.roai.kicker}</p><div className="robots-split"><div><h2 id="robots-roai-title">{data.roai.title}</h2><p className="robots-status">{data.roai.status}</p></div><p className="robots-lead">{data.roai.lead}</p></div>
      <ol className="robots-roai">{data.roai.items.map(item => <li key={item.label}><span className="robots-index">{item.label}</span><h3>{item.value}</h3><p>{item.body}</p></li>)}</ol><p className="robots-note">{data.roai.note}</p><a className="robots-text-link" href="/return-on-ai" onClick={e => onAnchor(e, '/return-on-ai')}>{data.roai.link}<ArrowUpRight size={20} aria-hidden="true" /></a>
    </section>

    <section id={data.contact.id} className="robots-section robots-contact" aria-labelledby="robots-contact-title"><div className="robots-wrap"><p className="robots-kicker">{data.contact.kicker}</p><h2 id="robots-contact-title">{data.contact.title}</h2><p className="robots-lead">{data.contact.lead}</p><div className="robots-contact-grid">{data.contact.intents.map(intent => <article key={intent.id}><h3>{intent.audience}</h3><p>{intent.body}</p><a className="robots-button" href="/corp#contact" onClick={e => { rememberIntent(intent.interest, intent.id, intent.message); onAnchor(e, '/corp#contact'); }}>{intent.label}<ArrowRight size={19} aria-hidden="true" /></a></article>)}</div><p className="robots-note">{data.contact.note}</p></div></section>
    <div className="robots-source robots-wrap"><p>出典：{data.source.title} v{data.source.version}（{data.source.date}・{data.source.status}）</p><p>{data.source.note}</p><p>更新日：<time dateTime={data.updatedAt}>{data.updatedAt}</time></p></div>
  </main>;
}
