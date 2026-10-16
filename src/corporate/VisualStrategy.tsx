import { type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, Compass, Network, GraduationCap, Film, Orbit, TrendingUp, Timer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { neriLpUrl } from '../lib/coreLinks';
import './visualStrategy.css';
import divisionData from './divisions.json';

type Anchor = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
type ArtKind = 'advisory' | 'intelligence' | 'academy' | 'studio' | 'ventures';

import { ServiceArt } from './ServiceArt';
export { ServiceArt };

const divisions = [
  { kind: 'advisory', name: 'Advisory', verb: '経営と現場を、つなぐ。', Icon: Compass, text: 'AI戦略から現場実装、継続改善まで。', tags: ['AI顧問', 'FDE', '業務改革'], price: '標準 月55万円（税込）', state: 'ご相談受付中', detail: '初回AI経営相談は無料。標準月額50万円（税別）／55万円（税込）。支援範囲は個別契約で定めます。', href: '/corp#advisor', cta: 'AI顧問・FDEへ' },
  { kind: 'intelligence', name: 'Intelligence', verb: '毎日の仕事を、動かす。', Icon: Network, text: '情報検索・AIエージェント・業務自動化。', tags: ['Nexus', 'AI経営OS', '自動化'], price: '製品ごとに料金をご案内', state: '提供状況は製品別', detail: 'Nexusの現行リンク先はCORE NERI表記です。連携できる環境と提供機能は製品ごとに確認。構想・検証中の機能は提供済みと区別します。', href: neriLpUrl('corp-portfolio'), cta: 'Nexusの製品ページへ' },
  { kind: 'academy', name: 'Academy', verb: '使える力を、組織に。', Icon: GraduationCap, text: 'AI教育から、定着・評価・ガバナンスへ。', tags: ['法人教育', '定着支援', '安全な活用'], price: '研修・教育は個別見積り', state: '教育相談・基盤構想', detail: '診断・教育・評価を統合する法人向け基盤は構想段階。正式な提供条件・教材構成は個別にご相談ください。', href: '/corp#contact', cta: '教育について相談' },
  { kind: 'studio', name: 'Studio', verb: '事業の価値を、伝える。', Icon: Film, text: '映像・広告・SNSで、心を動かす体験を。', tags: ['AI映像', 'クリエイティブ', 'マーケティング'], price: '内容・料金はStudioで', state: '制作のご相談受付中', detail: '映像制作・Web制作・受託開発から運用まで。現在の料金と制作実績はCORE Studioのページでご案内します。', href: '/studio', cta: '制作実績・料金へ' },
  { kind: 'ventures', name: 'Ventures', verb: '次の事業を、育てる。', Icon: Orbit, text: '顧客の課題から、新しい産業の可能性へ。', tags: ['業界SaaS', 'ロボティクス', '事業投資'], price: '協業・事業検証のご相談', state: '将来構想', detail: 'M&A・事業投資・ロボティクス等は将来構想です。事業性と実装可能性を検証し、未提供のサービスを販売中とは扱いません。', href: '/corp#contact', cta: '協業について相談' },
] .map(d => { const current = divisionData.find(item => item.id === d.kind)!; return { ...d, text: current.summary, state: current.status, price: current.price, detail: current.note }; });

export function VisualPortfolio({ onAnchor, home = false }: { onAnchor: Anchor; home?: boolean }) {
  return <section className="cv-section" id={home ? "divisions" : "services"} aria-labelledby="cv-portfolio">
    <div className="cv-heading"><div><p className="cv-kicker">CORE / FIVE BUSINESS FIELDS</p><h2 id="cv-portfolio">企業の変革を、<br /><span>ひとつながりに。</span></h2></div><div className="cv-intro"><p>戦略を決める。仕事を動かす。人を育てる。<br />5つの事業で、経営の次の一歩を支えます。</p><a className="cv-text-link" href="/corp#advisor" onClick={e=>onAnchor(e,'/corp#advisor')}>まずは無料でAI経営相談 <ArrowRight size={18}/></a></div></div>
    <div className="cv-grid">{divisions.map(({kind,name,verb,Icon,text,tags,price,state,detail},i)=><article className={'cv-card cv-card-'+kind} key={kind}>
      <div className="cv-card-top"><span className="cv-number">0{i+1}</span><span className="cv-status">{state}</span></div>
      <ServiceArt kind={kind as ArtKind}/>
      <div className="cv-card-body"><p className="cv-brand"><Icon size={17} aria-hidden="true"/> CORE {name}</p><h2>{verb}</h2><p className="cv-description">{text}</p><ul className="cv-tags">{tags.map(tag=><li key={tag}>{tag}</li>)}</ul><p className="cv-price">{price}</p>
      <details className="cv-mini-details"><summary>提供内容・条件</summary><p>{detail}</p></details>
      <a className="cv-card-link" href={`/corp/${kind}`} onClick={e=>onAnchor(e,`/corp/${kind}`)}>部門のサービスを見る<ArrowRight size={18} aria-hidden="true"/></a></div>
    </article>)}</div>
  </section>;
}

export function TransformationDiagram() {
  return <div className="cv-transformation" aria-label="課題を見つけ、仕組みを実装し、成果を測って改善する">
    {[{kind:'advisory',title:'見つける',sub:'経営課題と優先順位'},{kind:'intelligence',title:'つくる',sub:'現場で動く仕組み'},{kind:'academy',title:'育てる',sub:'定着と継続改善'}].map((item,i)=><div className="cv-flow-step" key={item.title}><ServiceArt kind={item.kind as ArtKind}/><span className="cv-step-label">0{i+1}</span><strong>{item.title}</strong><p>{item.sub}</p>{i<2&&<ArrowRight className="cv-flow-arrow" size={22} aria-hidden="true"/>}</div>)}
  </div>;
}

export function VisualImpact({ onAnchor }: { onAnchor: Anchor }) {
  return <section className="cv-section cv-impact" aria-labelledby="cv-impact-title"><div className="cv-heading"><div><p className="cv-kicker">RETURN ON AI</p><h2 id="cv-impact-title">AIの先に、<br />どんな変化をつくるか。</h2></div><p className="cv-intro">経営課題から始めて、現場で使い、成果を測る。<br />COREは、この循環を一緒につくります。</p></div><TransformationDiagram/><div className="cv-outcomes">{[{Icon:TrendingUp,title:'売上・成長',text:'新しい収益と機会'},{Icon:Timer,title:'時間・生産性',text:'人が集中できる余白'},{Icon:ShieldCheck,title:'品質・安心',text:'ミスとリスクの低減'}].map(({Icon,title,text})=><div key={title}><Icon size={25} aria-hidden="true"/><div><strong>{title}</strong><span>{text}</span></div></div>)}</div><div className="cv-impact-foot"><p>導入前後の実測で評価。成果を保証するものではありません。</p><a className="cv-text-link" href="/return-on-ai" onClick={e=>onAnchor(e,'/return-on-ai')}>ROAIの考え方 <ArrowRight size={18}/></a></div></section>;
}

export function VisualDisclosure({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <details className="cv-disclosure"><summary><span><strong>{title}</strong><small>{subtitle}</small></span><span className="cv-expand" aria-hidden="true">＋</span></summary><div className="cv-disclosure-body">{children}</div></details>;
}

export function AdvisorSignals() {
  return <div className="cv-advisor-signals">{[Compass,Network,CheckCircle2].map((Icon,i)=><span key={i}><Icon size={22} aria-hidden="true"/>{['優先順位を決める','現場に実装する','成果を測る'][i]}</span>)}</div>;
}
