import type { MouseEvent } from 'react';
import { ArrowRight, Check, Compass, Code2, RefreshCw, Users, Factory, HardHat, Utensils, MessagesSquare } from 'lucide-react';
import { AI_ADVISOR as plan } from './aiAdvisorData';
import CorpContactForm from './CorpContactForm';
import { rememberIntent } from './corpIntent';
import { track } from './roai/track';
import './aiAdvisor.css';
import { ServiceArt, TransformationDiagram, AdvisorSignals } from './VisualStrategy';

type Props = { onAnchor: (event: MouseEvent<HTMLAnchorElement>, href: string) => void };
const challenges = [
  ['何から始めるか、決められない。', 'AIを導入したいが、何から始めればいいか分からない', '経営課題と業務を整理し、成果につながる優先順位と実行計画を決めます。'],
  ['実装を任せる人がいない。', '社内にAIを実装できる人材がいない', '社内担当者と一緒に、設計・試作・既存システムとの接続を進めます。'],
  ['導入したのに、変わらない。', '導入しても成果につながらない', '現場で使われる運用を整え、導入前後の数字を見ながら改善します。'],
  ['あの人がいないと、止まる。', '既存業務が属人化している', '仕事の手順と判断基準を見える化し、定型業務を仕組みに移します。'],
];
const industries = [
  ['製造業', '検査・報告・工程管理', '検査記録の整理、日報の自動作成、工程情報の集約。品質確認と判断に集中できる現場へ。'],
  ['建設業', '見積・図面・書類作成', '見積の下書き、図面・仕様書の情報検索、施工関連書類の作成支援。確認は人が担います。'],
  ['飲食業', '予約・顧客管理・店舗運営', '予約情報の集約、顧客対応の補助、売上・シフト報告の自動化。店舗ごとの運用に合わせます。'],
  ['サービス業', '問い合わせ・営業・顧客対応', '問い合わせの分類、返信案の作成、商談記録と顧客情報の連携。対応の速度と一貫性を高めます。'],
];
const metrics = [['工数削減', '業務ごとの作業時間'], ['コスト削減', '実際に減った支出'], ['生産性向上', '同じ時間での処理件数'], ['売上成長', '商談・受注・継続率'], ['品質改善', 'ミス・手戻りの件数'], ['スピード', '対応・処理のリードタイム'], ['リスク', '損失・属人化の低減'], ['セキュリティ', '権限・情報管理の改善'], ['意思決定', '判断に必要な情報と時間'], ['新規事業', '仮説検証と新たな収益機会']];
const steps = [['無料相談', '経営と現場の状況、変えたい仕事を伺います。'], ['経営課題・業務の診断', '業務フローとデータを整理し、優先課題と測定指標を設定。'], ['支援内容と契約条件の決定', '支援範囲・開発工数・訪問頻度・費用を合意します。'], ['AI実装・運用開始', '試作と検証を経て、現場で使える仕組みを導入します。'], ['継続改善と成果測定', '利用状況と成果を定期レポートで共有し、次の改善へ。']];
const faqs = [
  ['契約期間はどれくらいですか？', '標準プランは原則3か月契約です。初回3か月の総額は150万円（税別）／165万円（税込）。ライトプランの期間と総額は支援範囲とともに契約前にご提示します。更新・解約条件は契約前にご提示します。'],
  ['現場への訪問にも対応できますか？', 'オンラインと訪問を組み合わせて支援します。訪問地域・頻度・交通費等の扱いは、課題と支援範囲に応じて個別契約で定めます。'],
  ['どの業種に対応していますか？', '製造・建設・飲食・サービス業など、幅広い業種の業務改善をご相談いただけます。業種固有の要件や規制を確認し、対応可能な範囲をご提案します。'],
  ['開発費は月額に含まれますか？', '契約で合意した範囲のAIエージェント構築支援・業務自動化・継続改善を含みます。無制限の開発ではありません。大規模開発や範囲外の追加開発、外部API・クラウド等の利用料は別途見積もりです。'],
  ['既存のシステムや社内データと連携できますか？', '既存システムのAPI、アクセス権、データ形式を確認して設計します。すべてのシステムとの連携を保証するものではなく、可否と必要な作業を事前に整理します。'],
  ['情報セキュリティはどう扱いますか？', '利用するデータ、権限、AIサービスのデータ取扱条件を確認し、必要最小限のアクセスと運用ルールを設計します。機密情報の取り扱い・秘密保持の条件は契約時に合意します。'],
  ['無料相談では何を話せますか？', '初回相談は完全無料です。困っている業務やAI活用の方向性を伺い、支援できる内容を整理します。相談だけで有料契約にはなりません。診断・開発等の有償作業は、範囲と費用を合意した後に開始します。'],
];
export default function AiAdvisorTab({ onAnchor }: Props) {
  const consult = (event: MouseEvent<HTMLAnchorElement>) => {
    rememberIntent('AI顧問', 'ai-advisor');
    track('corp_cta_click', 'ai-advisor');
    onAnchor(event, '#advisor-consult');
  };
  const cta = <a className="aa-cta" href="/corp#advisor-consult" onClick={consult}>無料でAI経営相談をする<ArrowRight size={19} aria-hidden="true" /></a>;
  return <main className="aa-page" aria-label="CORE AI Advisory">
    <section className="aa-hero" id="advisor">
      <div className="aa-hero-visual"><div><p className="aa-eyebrow">AI戦略から実装まで、一気通貫で。</p>
      <p className="aa-name">{plan.name}</p>
      <h1>AIを導入するだけで、<br /><span>終わらせない。</span></h1>
      <p className="aa-lead">経営戦略から現場実装まで。AI前提で企業の仕組みを再設計する、COREのAI顧問・FDEサービス。</p>
      <div className="aa-hero-price">月額 <strong>55万円</strong>（税込）<span>税抜500,000円 ／ 標準AI顧問・FDE・原則3か月契約</span></div>
      <div className="aa-actions">{cta}<a className="aa-link" href="#advisor-price" onClick={event => onAnchor(event, '#advisor-price')}>支援内容・料金を見る<ArrowRight size={18} aria-hidden="true" /></a></div>
      <p className="aa-note">初回相談は完全無料。まずは、変えたい仕事を一つ教えてください。</p>
      <AdvisorSignals /></div><ServiceArt kind="advisory" /></div>
    </section>
    <section className="aa-section" aria-labelledby="aa-challenges"><p className="aa-eyebrow">YOUR CHALLENGES</p><h2 id="aa-challenges">AIの課題は、<br />経営の課題から始まる。</h2><div className="aa-cards">{challenges.map(([title, , support], i) => { const Icon = [Compass, Code2, RefreshCw, Users][i]; return <article className="aa-card" key={title}><Icon className="aa-card-icon" size={28} aria-hidden="true"/><h3>{title}</h3><p className="aa-answer">{support}</p></article>; })}</div></section>
    <section className="aa-section" aria-labelledby="aa-services"><p className="aa-eyebrow">ONE PARTNER, END TO END</p><h2 id="aa-services">戦略も、実装も、その先も。<br />一つのチームでつなぐ。</h2><p>AI顧問・現場伴走・AIエージェント・業務自動化・DX推進・ROAI測定を、分断しない統合サービスとして提供します。</p><TransformationDiagram/><details className="aa-compact-details"><summary>6つの支援内容・成果物を詳しく見る</summary><div className="aa-services">{plan.services.map((service, index) => <article key={service.title} className="aa-service"><span className="aa-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{service.title}</h3><p>{service.text}</p><p className="aa-output">{service.output}</p></div></article>)}</div></details></section>
    <section className="aa-section" aria-labelledby="aa-field"><p className="aa-eyebrow">WORK WITH YOUR TEAM</p><h2 id="aa-field">提案して終わりではなく、<br />現場で動く仕組みを作る。</h2><p>現場に入り、業務を理解し、担当者と一緒に実装する。これがCOREのFDE型（Forward Deployed Engineer）の現場伴走です。</p><div className="aa-compare"><article><h3>AI顧問：経営の優先順位を決める</h3><p>経営課題 → AI戦略 → 実行計画 → 成果レビュー</p><p className="aa-note">経営者の意思決定と社内担当者の推進を支えます。</p></article><article className="aa-compare-core"><p className="aa-eyebrow">CORE AI ADVISORY</p><h3>FDE：現場で動く仕組みを作る</h3><p>現場分析 → 試作 → 実装 → 運用 → 改善</p><p>既存ツールや業務に合わせて設計し、担当者への引き継ぎと利用状況の確認まで伴走します。</p></article></div>{cta}</section>
    <section className="aa-section" aria-labelledby="aa-industries"><p className="aa-eyebrow">USE CASES</p><h2 id="aa-industries">貴社の仕事に、<br />AIをどう組み込むか。</h2><p className="aa-note">以下は活用例です。導入実績や成果の保証ではありません。実際の業務・データ・システムに合わせて設計します。</p><div className="aa-cards">{industries.map(([industry, title, text], i) => {const Icon = [Factory, HardHat, Utensils, MessagesSquare][i]; return <article className="aa-card" key={industry}><Icon className="aa-card-icon" size={28} aria-hidden="true"/><p className="aa-eyebrow">{industry}</p><h3>{title}</h3><details className="cv-mini-details"><summary>活用イメージを見る</summary><p>{text}</p></details></article>;})}</div></section>
    <section className="aa-section" aria-labelledby="aa-roai"><p className="aa-eyebrow">RETURN ON AI</p><h2 id="aa-roai">AIを入れたか、よりも。<br />経営に何が返ったか。</h2><p>ROAI（Return on AI）は、AIへの投資が生んだ経営成果を可視化する考え方です。導入前の基準値を決め、導入後の変化を継続して測ります。</p><div className="aa-metrics">{metrics.map(([title, value]) => <article key={title}><h3>{title}</h3><p>{value}</p></article>)}</div><div className="aa-measure"><span>導入前の基準値</span><ArrowRight aria-hidden="true" /><span>導入後の実測</span><ArrowRight aria-hidden="true" /><span>経営者向け定期レポート</span></div><p className="aa-note">削減時間の金額換算と、実際の支出削減・利益増加は分けて報告します。成果や投資回収は保証せず、確認できる根拠に基づいて改善を判断します。</p><a className="aa-link" href="/return-on-ai" onClick={e => onAnchor(e, '/return-on-ai')}>ROAIの考え方を読む<ArrowRight size={18} aria-hidden="true" /></a></section>
    <section className="aa-section aa-price-layout" id="advisor-price" aria-labelledby="aa-price"><div className="aa-price"><p className="aa-eyebrow">STANDARD PLAN</p><h2 id="aa-price">AI顧問・FDE</h2><p>戦略から実装・改善までの統合支援</p><p className="aa-amount"><span>月額</span><strong>55</strong><span>万円（税込）</span></p><p><strong>500,000円（税別）／税込550,000円</strong></p><dl className="aa-terms"><div><dt>契約期間</dt><dd>原則3か月</dd></div><div><dt>初回3か月の総額</dt><dd>1,500,000円（税別）<br />1,650,000円（税込）</dd></div><div><dt>初回相談</dt><dd>完全無料</dd></div></dl>{cta}<p className="aa-note">支援範囲・開発工数・訪問頻度は個別契約で定めます。更新・解約条件も契約前にご提示します。</p></div><div className="aa-scope"><h3>月額に含まれる支援</h3><ul className="aa-included">{plan.included.map(text => <li key={text}><Check size={18} aria-hidden="true" />{text}</li>)}</ul><h3>別途お見積もり</h3><ul>{plan.separate.map(text => <li key={text}>{text}</li>)}</ul><p className="aa-note">追加費用は事前に内容と金額をご提示し、合意後に着手します。</p></div></section>
    <section className="aa-section" aria-labelledby="aa-options"><p className="aa-eyebrow">START AT THE RIGHT SCOPE</p><h2 id="aa-options">課題と支援範囲に合わせて。</h2><div className="aa-cards"><article className="aa-card"><h3>AI顧問ライト</h3><p><strong>月額330,000円（税込）</strong><br />税抜300,000円</p><p>対象業務を限定し、AI活用の方針整理・担当者への助言・改善レビューを中心に支援します。</p><p className="aa-note">標準プランの値引きではありません。現場実装・開発・訪問の範囲、契約期間は個別に定めます。</p>{cta}</article><article className="aa-card"><h3>AI業務診断</h3><p><strong>55,000円（税込・提案価格）</strong><br />税抜50,000円</p><p>業務フロー、課題、改善効果の仮説を整理し、次に取り組む仕事を絞ります。</p><p className="aa-note">初回AI経営相談は無料です。有償診断は内容・成果物・金額を合意した場合のみ開始します。</p>{cta}</article></div></section>
    <section className="aa-section" aria-labelledby="aa-start"><p className="aa-eyebrow">HOW WE START</p><h2 id="aa-start">無料相談から、<br />現場の変化まで。</h2><ol className="aa-steps">{steps.map(([title, text], i) => <li key={title}><span className="aa-step-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>
    <section className="aa-section" aria-labelledby="aa-faq"><p className="aa-eyebrow">FAQ</p><h2 id="aa-faq">よくあるご質問</h2><div className="aa-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="aa-invitation" id="advisor-consult" aria-labelledby="aa-consult"><p className="aa-eyebrow">LET’S BEGIN</p><h2 id="aa-consult">まずは無料で、貴社の<br />AI活用について相談しませんか？</h2><p>課題が整理できていなくても大丈夫です。<br />いま困っている仕事から、一緒に考えます。</p><p className="aa-note">初回相談は完全無料。ご相談だけで契約にはなりません。</p><CorpContactForm advisor /></section>
  </main>;
}
