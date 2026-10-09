import type { MouseEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { AI_ADVISOR as plan } from './aiAdvisorData';
import { rememberIntent } from './corpIntent';
import { track } from './roai/track';
import './aiAdvisor.css';

type Props = { onAnchor: (event: MouseEvent<HTMLAnchorElement>, href: string) => void };
export default function AiAdvisorTab({ onAnchor }: Props) {
  const consult = (event: MouseEvent<HTMLAnchorElement>) => {
    rememberIntent('AI顧問', 'ai-advisor');
    track('corp_cta_click', 'ai-advisor');
    onAnchor(event, '#contact');
  };
  const cta = <a className="aa-cta" href="/corp#contact" onClick={consult}>AI顧問について相談する<ArrowRight size={19} aria-hidden="true" /></a>;
  return <main className="aa-page" aria-label="AI顧問サービス">
    <section className="aa-hero" id="advisor">
      <p className="aa-eyebrow">AI ADVISORY / 法人向け</p>
      <h1>御社のAI推進を、<br />戦略から実行まで。</h1>
      <p className="aa-name">{plan.name}</p>
      <p className="aa-lead">社外AI変革責任者として、経営と現場をつなぐ。<br className="aa-desktop" />人にしかできない仕事に、時間を返すためのAI顧問です。</p>
      <div className="aa-actions">{cta}<a className="aa-link" href="#advisor-price" onClick={event => onAnchor(event, '#advisor-price')}>料金・対応範囲を見る<ArrowRight size={18} aria-hidden="true" /></a></div>
      <p className="aa-note">初回相談は無料。課題と対応範囲を整理してから、ご提案します。</p>
    </section>
    <section className="aa-section" aria-labelledby="aa-services">
      <div className="aa-heading"><p className="aa-eyebrow">WHAT WE DO</p><h2 id="aa-services">相談で終わらせず、<br />使える仕組みへ。</h2><p>経営判断、実装、現場への定着。<br />必要な支援を、一つの継続プランに。</p></div>
      <div className="aa-services">{plan.services.map((service, index) => <article key={service.title} className="aa-service"><span className="aa-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{service.title}</h3><p>{service.text}</p><p className="aa-output">{service.output}</p></div></article>)}</div>
    </section>
    <section className="aa-section aa-process" aria-labelledby="aa-process">
      <p className="aa-eyebrow">FIRST 3 MONTHS</p><h2 id="aa-process">最初の3ヶ月で、<br />改善の土台をつくる。</h2>
      <ol className="aa-phases">{plan.phases.map(phase => <li key={phase.month}><p className="aa-month">MONTH {phase.month}</p><h3>{phase.title}</h3><p>{phase.text}</p><p className="aa-output">{phase.output}</p></li>)}</ol>
      <p className="aa-note">標準的な進行例です。データや接続環境の状況に応じて調整し、実装件数・納期は着手前に合意します。</p>
    </section>
    <section className="aa-section aa-price-layout" id="advisor-price" aria-labelledby="aa-price">
      <div className="aa-price"><p className="aa-eyebrow">ENGAGEMENT</p><h2 id="aa-price">3ヶ月から始める、<br />AI変革パートナー。</h2><p className="aa-amount"><span>月額</span><strong>{plan.monthlyFee / 10000}</strong><span>万円</span></p><p>税別 ／ 税込55万円</p><dl className="aa-terms"><div><dt>最低契約期間</dt><dd>{plan.minimumMonths}ヶ月</dd></div><div><dt>初回3ヶ月の総額</dt><dd>150万円（税別）<br />165万円（税込）</dd></div><div><dt>提供形態</dt><dd>オンライン中心・全国対応</dd></div></dl>{cta}<p className="aa-note">ご相談後に業務・実装範囲と条件をご提示。更新・解約条件は契約前に確認します。</p></div>
      <div className="aa-scope"><h3>月額に含まれる範囲</h3><ul>{plan.included.map(text => <li key={text}>{text}</li>)}</ul><h3>別途お見積りとなるもの</h3><ul>{plan.separate.map(text => <li key={text}>{text}</li>)}</ul><p className="aa-note">小規模実装は無制限の開発枠ではありません。追加費用が必要な場合は、内容と金額を事前に提示し、合意後に着手します。</p></div>
    </section>
    <section className="aa-section aa-close" aria-labelledby="aa-return"><div><p className="aa-eyebrow">RETURN ON AI</p><h2 id="aa-return">導入したか、よりも。<br />何が変わったか。</h2></div><div><p>削減時間、業務品質、利用状況を導入前後で測定。売上やコストへの影響は、確認できる根拠とともに報告します。</p><p className="aa-note">成果や投資回収は保証しません。削減時間の金額換算は、実際の利益・現金削減と分けて扱います。</p><a className="aa-link" href="/return-on-ai" onClick={event => onAnchor(event, '/return-on-ai')}>ROAIの考え方を読む<ArrowRight size={18} aria-hidden="true" /></a></div></section>
    <section className="aa-invitation"><p className="aa-eyebrow">LET’S BEGIN</p><h2>まず、変えたい仕事の話から。</h2><p>課題が整理できていなくても大丈夫です。<br />経営と現場の状況を伺い、最初の一歩を一緒に考えます。</p>{cta}</section>
  </main>;
}
