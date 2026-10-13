import { useId, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, Compass, Network, GraduationCap, Film, Orbit, TrendingUp, Timer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { neriLpUrl } from '../lib/coreLinks';
import './visualStrategy.css';

type Anchor = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
type ArtKind = 'advisory' | 'intelligence' | 'academy' | 'studio' | 'ventures';

/** Original lightweight vector scenes. Decorative: adjacent copy carries the meaning. */
export function ServiceArt({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  const gradientId = `cv-brand-${useId().replace(/:/g, '')}`;
  return <svg className={'cv-art ' + className} viewBox="0 0 360 200" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0075F5" />
        <stop offset="55%" stopColor="#0064D8" />
        <stop offset="100%" stopColor="#1034B5" />
      </linearGradient>
    </defs>
    <ellipse cx="180" cy="176" rx="130" ry="13" fill="#D9E0F4" opacity=".65" />
    <circle cx="184" cy="95" r="83" fill="#EEF2FF" />
    <g stroke="#C2D0ED" strokeWidth="1"><path d="M24 145H336M44 165H316" strokeDasharray="3 7" /></g>
    {kind === 'advisory' && <g strokeLinejoin="round" strokeLinecap="round">
      <rect x="94" y="35" width="178" height="121" rx="12" fill="white" stroke="#c8ddeb" strokeWidth="2"/>
      <path d="M112 57H166M112 66H143" stroke="#A6B4D8" strokeWidth="4"/>
      <path d="M117 134V101M150 134V88M183 134V105M216 134V74" stroke="#D4DEFF" strokeWidth="15"/>
      <path d="M113 107L148 87L181 93L231 57M217 57H231V71" stroke="url(#${gradientId})" strokeWidth="4"/>
      <rect x="45" y="108" width="80" height="54" rx="9" fill="url(#${gradientId})" className="cv-highlight"/>
      <circle cx="64" cy="127" r="5" fill="white"/><path d="M77 127H109M60 142H106" stroke="#b9e5ff" strokeWidth="3"/>
      <circle cx="279" cy="124" r="26" fill="white" stroke="#AFC1FF" strokeWidth="2"/>
      <path d="M267 124L276 133L292 115" stroke="#0075F5" strokeWidth="4"/>
      <path d="M168 157V172M148 173H220" stroke="#879FCC" strokeWidth="3"/>
    </g>}
    {kind === 'intelligence' && <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M81 57L178 97L285 52M81 150L178 97L285 153" stroke="#81b9df" strokeWidth="2" strokeDasharray="5 5"/>
      <rect x="138" y="58" width="82" height="82" rx="22" fill="url(#${gradientId})" className="cv-highlight"/>
      <rect x="154" y="74" width="50" height="50" rx="13" stroke="white" strokeWidth="2"/>
      <path d="M165 99H193M179 85V113" stroke="white" strokeWidth="3"/>
      {[[58,35],[263,30],[55,128],[263,130]].map(([x,y],i)=><g key={i}><rect x={x} y={y} width="46" height="44" rx="10" fill="white" stroke="#B8C8F0" strokeWidth="2"/><path d={`M${x+12} ${y+15}H${x+34}M${x+12} ${y+23}H${x+29}M${x+12} ${y+31}H${x+22}`} stroke="#477DEB" strokeWidth="3"/></g>)}
      <circle cx="237" cy="89" r="5" fill="#0075F5"/><circle cx="121" cy="125" r="4" fill="#0075F5"/>
    </g>}
    {kind === 'academy' && <g strokeLinejoin="round" strokeLinecap="round">
      <path d="M67 75Q116 53 165 78V155Q116 130 67 148ZM165 78Q214 53 263 75V148Q214 130 165 155Z" fill="white" stroke="#B8C8F0" strokeWidth="2"/>
      <path d="M84 89Q116 77 146 90M84 104Q116 92 146 105M84 119Q109 109 134 117" stroke="#9DB5FF" strokeWidth="3"/>
      <path d="M185 104L207 116L244 88" stroke="#0064D8" strokeWidth="5"/>
      <path d="M219 43L255 27L291 43L255 60Z" fill="url(#${gradientId})" className="cv-highlight"/><path d="M234 54V68Q255 81 276 68V54" fill="#4E91FF"/>
      <path d="M291 43V71" stroke="url(#${gradientId})" strokeWidth="3"/>
      <circle cx="76" cy="48" r="9" fill="#C8D9FF"/><path d="M73 48H79M76 45V51" stroke="url(#${gradientId})" strokeWidth="2"/>
    </g>}
    {kind === 'studio' && <g strokeLinejoin="round" strokeLinecap="round">
      <rect x="70" y="37" width="211" height="118" rx="11" fill="white" stroke="#B8C8F0" strokeWidth="2"/>
      <rect x="82" y="49" width="187" height="80" rx="5" fill="#E3EBFF"/>
      <path d="M82 118L134 70L178 110L216 82L269 118V129H82Z" fill="#AFC4FF"/>
      <circle cx="230" cy="68" r="10" fill="white"/>
      <circle cx="174" cy="88" r="25" fill="url(#${gradientId})" className="cv-highlight"/><path d="M168 76L186 88L168 100Z" fill="white"/>
      <path d="M85 141H255" stroke="#D7DEEF" strokeWidth="5"/><path d="M85 141H170" stroke="#168cc9" strokeWidth="5"/>
      <rect x="220" y="116" width="74" height="55" rx="7" fill="url(#${gradientId})" className="cv-highlight"/><path d="M233 132H281M233 144H256M233 155H272" stroke="#C4D4FF" strokeWidth="3"/>
      <path d="M49 94L55 82L61 94L73 100L61 106L55 118L49 106L37 100Z" fill="#93A8F0"/>
    </g>}
    {kind === 'ventures' && <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="175" cy="105" rx="114" ry="49" transform="rotate(-22 175 105)" stroke="#93A8F0" strokeWidth="2" strokeDasharray="5 6"/>
      <path d="M151 107Q160 56 224 36Q238 94 190 126Z" fill="white" stroke="#829CE0" strokeWidth="2"/>
      <path d="M196 49Q209 42 224 36Q228 52 225 67Z" fill="url(#${gradientId})" className="cv-highlight"/>
      <circle cx="200" cy="80" r="13" fill="#E9EFFF" stroke="url(#${gradientId})" strokeWidth="2"/>
      <path d="M155 94L125 99L118 134L151 119M196 120L194 151L160 163L174 130" fill="url(#${gradientId})" className="cv-highlight"/>
      <path d="M143 136L121 158M153 146L141 166" stroke="#20a8c5" strokeWidth="5"/>
      <circle cx="277" cy="92" r="9" fill="#AFC4FF"/><circle cx="81" cy="111" r="5" fill="url(#${gradientId})" className="cv-highlight"/>
      <path d="M100 42V54M94 48H106M285 142V152M280 147H290" stroke="#7E99F0" strokeWidth="2"/>
    </g>}
  </svg>;
}

const divisions = [
  { kind: 'advisory', name: 'Advisory', verb: '経営と現場を、つなぐ。', Icon: Compass, text: 'AI戦略から現場実装、継続改善まで。', tags: ['AI顧問', 'FDE', '業務改革'], price: '標準 月55万円（税込）', state: 'ご相談受付中', detail: '範囲限定ライトは月33万円（税込）。初回AI経営相談は無料。業務診断55,000円（税込）は提案価格です。支援範囲は個別契約で定めます。', href: '/corp#advisor', cta: 'AI顧問・FDEへ' },
  { kind: 'intelligence', name: 'Intelligence', verb: '毎日の仕事を、動かす。', Icon: Network, text: '情報検索・AIエージェント・業務自動化。', tags: ['Nexus', 'AI経営OS', '自動化'], price: '製品ごとに料金をご案内', state: '提供状況は製品別', detail: 'Nexusの現行リンク先はCORE NERI表記です。連携できる環境と提供機能は製品ごとに確認。構想・検証中の機能は提供済みと区別します。', href: neriLpUrl('corp-portfolio'), cta: 'Nexusの製品ページへ' },
  { kind: 'academy', name: 'Academy', verb: '使える力を、組織に。', Icon: GraduationCap, text: 'AI教育から、定着・評価・ガバナンスへ。', tags: ['法人教育', '定着支援', '安全な活用'], price: '月990円／人は検証中の目安', state: '教育相談・基盤構想', detail: '目安価格は税込です。診断・教育・評価を統合する法人向け基盤は構想段階。正式な提供条件・教材構成は個別にご相談ください。', href: '/corp#contact', cta: '教育について相談' },
  { kind: 'studio', name: 'Studio', verb: '事業の価値を、伝える。', Icon: Film, text: '映像・広告・SNSで、心を動かす体験を。', tags: ['AI映像', 'クリエイティブ', 'マーケティング'], price: '内容・料金はStudioで', state: '制作のご相談受付中', detail: '映像制作・Web制作・受託開発から運用まで。現在の料金と制作実績はCORE Studioのページでご案内します。', href: '/studio', cta: '制作実績・料金へ' },
  { kind: 'ventures', name: 'Ventures', verb: '次の事業を、育てる。', Icon: Orbit, text: '顧客の課題から、新しい産業の可能性へ。', tags: ['業界SaaS', 'ロボティクス', '事業投資'], price: '協業・事業検証のご相談', state: '将来構想', detail: 'M&A・事業投資・ロボティクス等は将来構想です。事業性と実装可能性を検証し、未提供のサービスを販売中とは扱いません。', href: '/corp#contact', cta: '協業について相談' },
] as const;

export function VisualPortfolio({ onAnchor }: { onAnchor: Anchor }) {
  return <section className="cv-section" id="services" aria-labelledby="cv-portfolio">
    <div className="cv-heading"><div><p className="cv-kicker">CORE / FIVE BUSINESS FIELDS</p><h1 id="cv-portfolio">企業の変革を、<br /><span>ひとつながりに。</span></h1></div><div className="cv-intro"><p>戦略を決める。仕事を動かす。人を育てる。<br />5つの事業で、経営の次の一歩を支えます。</p><a className="cv-text-link" href="/corp#advisor" onClick={e=>onAnchor(e,'/corp#advisor')}>まずは無料でAI経営相談 <ArrowRight size={18}/></a></div></div>
    <div className="cv-grid">{divisions.map(({kind,name,verb,Icon,text,tags,price,state,detail,href,cta},i)=><article className={'cv-card cv-card-'+kind} key={kind}>
      <div className="cv-card-top"><span className="cv-number">0{i+1}</span><span className="cv-status">{state}</span></div>
      <ServiceArt kind={kind}/>
      <div className="cv-card-body"><p className="cv-brand"><Icon size={17} aria-hidden="true"/> CORE {name}</p><h2>{verb}</h2><p className="cv-description">{text}</p><ul className="cv-tags">{tags.map(tag=><li key={tag}>{tag}</li>)}</ul><p className="cv-price">{price}</p>
      <details className="cv-mini-details"><summary>提供内容・条件</summary><p>{detail}</p></details>
      <a className="cv-card-link" href={href} onClick={e=>onAnchor(e,href)}>{cta}<ArrowRight size={18} aria-hidden="true"/></a></div>
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
