import divisions from './divisions.json';
import { ServiceArt } from './VisualStrategy';
import { CONTACT } from '../studio/plans';
import './divisions.css';

export default function DivisionPage({ id }: { id: string }) {
  const d = divisions.find(item => item.id === id);
  if (!d) return null;
  return <main className="cv-section division-page">
    <nav className="division-nav" aria-label="5部門"><a href="/corp">CORE ホーム</a>{divisions.map(item => <a key={item.id} href={`/corp/${item.id}`} aria-current={id === item.id ? 'page' : undefined}>{item.name}</a>)}</nav>
    <section className="division-hero">
      <div><p className="cv-kicker">CORE {d.name.toUpperCase()}</p><h1>{d.title}</h1><p className="division-lead">{d.summary}</p><span className="cv-status">{d.status}</span><div className="division-actions"><a className="division-primary" href="/corp#contact">無料相談を予約する</a><a href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer">LINEで相談する ↗</a></div></div>
      <ServiceArt kind={d.id as 'advisory' | 'intelligence' | 'academy' | 'studio' | 'ventures'} />
    </section>
    <section className="division-block"><p className="cv-kicker">WHAT WE DO</p><h2>サービス概要</h2><div className="division-services">{d.services.map(([title,text],i)=><article key={title}><span className="cv-number">0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="division-example division-block"><div><p className="cv-kicker">USE CASE</p><h2>活用イメージ</h2><p>{d.example}</p><small>想定する活用例です。特定のお客様の導入実績や成果保証を示すものではありません。</small></div><div><h2>導入・協業のメリット</h2><ul>{d.benefits.map(b=><li key={b}>{b}</li>)}</ul></div></section>
    <section className="division-block division-pricing"><div><p className="cv-kicker">PRICING & SCOPE</p><h2>{d.price}</h2><p>{d.note}</p></div><div className="division-links">{d.links.map(([label,href])=><a key={href} href={href}>{label} <span aria-hidden="true">→</span></a>)}</div></section>
    <section className="division-contact"><p className="cv-kicker">LET'S TALK</p><h2>どこから始めるか、一緒に考えます。</h2><p>課題が整理できていなくても大丈夫です。事業の現状と、変えたい仕事をお聞かせください。</p><div className="division-actions"><a className="division-primary" href="/corp#contact">初回無料相談</a><a href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer">公式LINEを開く ↗</a></div></section>
  </main>;
}
