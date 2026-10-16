import { useId } from 'react';
import type { ReactNode } from 'react';
import './serviceArt.css';

type ArtKind = 'advisory' | 'intelligence' | 'academy' | 'studio' | 'ventures';
const descriptions: Record<ArtKind, [string, string]> = {
  advisory: ['経営の判断を、現場の実装へ', '経営課題から優先順位を決め、FDEが現場に実装し、運用の検証を次の判断へ返す支援の流れ。'],
  intelligence: ['情報と仕事をつなぐ、企業AI OS', '社内の情報を共通の業務基盤に整理し、NEXUS、RESONANCE、PRISMなどを業務に合わせて組み合わせる概念図。連携の提供状況は製品別です。'],
  academy: ['学ぶ、試す、使い続ける', 'AI研修で学び、自分たちの業務で実践し、社内で活用を続けるための教育の流れ。'],
  studio: ['ひとつの物語を、映像とWebへ', '企業や人の物語を企画の核にして、映像、CM、Webに展開する制作工程の概念図。'],
  ventures: ['強みを持ち寄り、事業を検証する', 'パートナーの事業知見とCOREの設計・実装を組み合わせ、共同事業を検証する。事業承継とAIロールアップは構想段階。'],
};

function Label({ x, y, children, small = false, accent = false }: { x: number; y: number; children: ReactNode; small?: boolean; accent?: boolean }) {
  return <text x={x} y={y} className={`${small ? 'sa-small' : 'sa-label'}${accent ? ' sa-accent' : ''}`}>{children}</text>;
}

/** Original semantic diagrams. Processes and relationships, never fabricated product UI or metrics. */
export function ServiceArt({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  const id = useId().replace(/:/g, '');
  const [title, description] = descriptions[kind];
  return <svg className={`cv-art service-art service-art-${kind} ${className}`} viewBox="0 0 480 300" fill="none" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>{description}</desc>
    <defs>
      <marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="m0 0 5 3-5 3" fill="none" stroke="currentColor" strokeWidth="1.3" /></marker>
    </defs>
    <g className="sa-registration" stroke="currentColor"><path d="M24 42V24h18m396 0h18v18M24 258v18h18m396 0h18v-18" /></g>
    <g className="sa-ruler" stroke="currentColor"><path d="M66 26h348M66 274h348" />{[96,144,192,240,288,336,384].map(x=><path key={x} d={`M${x} 24v4M${x} 272v4`} />)}</g>

    {kind === 'advisory' && <>
      <path className="sa-wire" d="M114 150h252" markerEnd={`url(#${id}-arrow)`} />
      <path className="sa-return" d="M366 187v52H114v-52" markerEnd={`url(#${id}-arrow)`} />
      <Label x={240} y={265} small>検証を、次の判断へ</Label>
      <g className="sa-slab"><path d="m56 106 58-25 58 25v79l-58 25-58-25Z" /><path className="sa-facet" d="m56 106 58 25 58-25M114 131v79" /></g>
      <g className="sa-core"><path d="m182 88 58-25 58 25v113l-58 25-58-25Z" /><path className="sa-core-edge" d="m182 88 58 25 58-25M240 113v113" /></g>
      <g className="sa-slab"><path d="m308 106 58-25 58 25v79l-58 25-58-25Z" /><path className="sa-facet" d="m308 106 58 25 58-25M366 131v79" /></g>
      <Label x={114} y={67} small>経営課題</Label><Label x={240} y={49} small accent>CORE ADVISORY</Label><Label x={366} y={67} small>現場</Label>
      <Label x={114} y={158}>判断</Label><text x="240" y="153" className="sa-core-label">FDE</text><Label x={366} y={158}>実装</Label>
      <circle cx="114" cy="238" r="3" className="sa-point" /><circle cx="366" cy="238" r="3" className="sa-point" />
    </>}

    {kind === 'intelligence' && <>
      <Label x={240} y={54} small>社内の情報・日々の仕事</Label>
      <g className="sa-inputs"><path d="M90 76h72m42 0h72m42 0h72M126 76v25m114-25v25m114-25v25" /></g>
      <path className="sa-layer-back" d="m62 157 178-68 178 68-178 69Z" />
      <path className="sa-layer-edge" d="M62 157v30l178 68 178-68v-30M240 226v29" />
      <path className="sa-layer-front" d="m62 132 178-68 178 68-178 69Z" />
      <path className="sa-wire" d="M62 132v25l178 69 178-69v-25" />
      <path className="sa-core" d="m146 132 94-36 94 36-94 36Z" />
      <text x="240" y="139" className="sa-core-label">企業AI OS</text>
      <path className="sa-wire" d="M126 212v39m114-12v12m114-39v39" />
      <Label x={114} y={276} small>NEXUS</Label><Label x={240} y={276} small>RESONANCE</Label><Label x={366} y={276} small>PRISM</Label>
    </>}

    {kind === 'academy' && <>
      <path className="sa-wire" d="M57 230h366" markerEnd={`url(#${id}-arrow)`} />
      <path className="sa-step-back" d="M62 221v-70h111v70m12 0V113h111v108m12 0V75h111v146" />
      <path className="sa-step-top" d="m62 151 18-13h111l-18 13Zm123-38 18-13h111l-18 13Zm123-38 18-13h111l-18 13Z" />
      <path className="sa-core" d="M308 75h111v146H308Z" />
      <Label x={117} y={190}>学ぶ</Label><Label x={240} y={166}>試す</Label><text x="363" y="137" className="sa-core-label">使う</text>
      <Label x={117} y={259} small>AI研修</Label><Label x={240} y={259} small>業務で実践</Label><Label x={363} y={259} small>組織に定着</Label>
      <path className="sa-wire" d="M117 120h42l81-39h40l83-38" markerEnd={`url(#${id}-arrow)`} />
      <circle cx="117" cy="120" r="4" className="sa-point" /><circle cx="240" cy="81" r="4" className="sa-point" />
    </>}

    {kind === 'studio' && <>
      <Label x={240} y={52} small>企業と人の物語</Label>
      <path className="sa-frame-back" d="M84 86h312v143H84Z" />
      <path className="sa-frame" d="M62 69h312v143H62Z" />
      <path className="sa-frame-rule" d="M62 97h312M90 69v143M346 69v143" />
      <path className="sa-crop" d="M112 128v-16h20m150 0h20v16m-190 44v16h20m150 0h20v-16" />
      <path className="sa-aperture" d="m207 111 34 20v39l-34 20-34-20v-39Z" /><path className="sa-core" d="m202 136 24 14-24 14Z" />
      <path className="sa-film-line" d="M108 205h15m10 0h15m10 0h15m10 0h15m10 0h15m10 0h15m10 0h15m10 0h15" />
      <path className="sa-wire" d="M396 132h25v111H91v-14" />
      <Label x={123} y={270} small>映像・CM</Label><Label x={240} y={270} small>Web</Label><Label x={357} y={270} small>Human Story</Label>
      <path className="sa-output" d="M123 243v10m117-10v10m117-10v10" />
    </>}

    {kind === 'ventures' && <>
      <Label x={112} y={62} small>パートナー</Label><Label x={368} y={62} small accent>CORE</Label>
      <path className="sa-slab" d="m54 104 58-25 58 25v63l-58 25-58-25Z" />
      <path className="sa-slab" d="m310 104 58-25 58 25v63l-58 25-58-25Z" />
      <path className="sa-wire" d="M170 136h40m60 0h40" />
      <path className="sa-core" d="m240 100 39 36-39 36-39-36Z" />
      <path className="sa-join" d="M230 136h20m-10-10v20" />
      <Label x={112} y={141}>事業知見</Label><Label x={368} y={141}>設計・実装</Label>
      <path className="sa-wire" d="M240 172v26" markerEnd={`url(#${id}-arrow)`} />
      <Label x={240} y={224}>共同事業を検証</Label>
      <path className="sa-return" d="M104 248h272" />
      <Label x={240} y={274} small>承継・AIロールアップは構想</Label>
    </>}
  </svg>;
}
