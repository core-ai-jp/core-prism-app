import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  BookOpen,
  ShieldCheck,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { articles, resources, checked, booking } from "./content";
import type { Article } from "./content";
import "./hub.css";
import Admin from "./Admin";
const prefix = "/insights/";
const query = new URLSearchParams(location.search);
const sourceKeys = [
  "event_id",
  "campaign_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
];
function readAttribution() {
  try {
    const saved = JSON.parse(sessionStorage.getItem("core-hub-source") || "{}");
    const hasSource = sourceKeys.some((k) => query.has(k));
    const value = Object.fromEntries(
      sourceKeys.map((k) => {
        const v = hasSource ? query.get(k) : saved[k];
        return [
          k,
          typeof v === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(v)
            ? v
            : "unknown",
        ];
      }),
    );
    sessionStorage.setItem("core-hub-source", JSON.stringify(value));
    return value;
  } catch {
    return Object.fromEntries(sourceKeys.map((k) => [k, "unknown"]));
  }
}
const attribution = readAttribution();
const withSource = (url: string) =>
  url +
  (url.includes("?") ? "&" : "?") +
  new URLSearchParams(attribution).toString();
function Cta() {
  return (
    <aside className="hub-cta">
      <div>
        <span className="eyebrow">FROM KNOWING TO DOING</span>
        <h2>
          次は、自社の仕事で
          <br />
          確かめてみる。
        </h2>
        <p>
          業務を一つ選び、任せる範囲と確認方法を書き出す。
          <br />
          その一歩を、スターターキットで。
        </p>
      </div>
      <a className="button" href={withSource("/resources/harness-starter-kit")}>
        無料キットを見る <ArrowUpRight size={18} />
      </a>
    </aside>
  );
}
function Diagram() {
  return (
    <div
      className="harness-map"
      aria-label="業務の目的を中心に、知識・権限・検証・改善を設計する図"
    >
      <div className="map-label">THE HARNESS / COREの実務定義</div>
      <div className="map-top">
        <span>正本の知識</span>
        <span>役割と指示</span>
      </div>
      <div className="map-core">
        <Layers size={30} />
        <strong>仕事の目的</strong>
        <small>人に、時間を返す。</small>
      </div>
      <div className="map-bottom">
        <span>権限・承認</span>
        <span>テスト・記録</span>
      </div>
      <div className="map-loop">実行 → 検証 → 回復 → 改善</div>
    </div>
  );
}
function ArticleView({ article: a }: { article: Article }) {
  return (
    <>
      <header className="article-head">
        <a className="breadcrumb" href="/insights">
          Insights / {a.category}
        </a>
        <p className="eyebrow">CORE INTELLIGENCE / FIELD NOTES</p>
        <h1>{a.title}</h1>
        <p className="lead">{a.summary}</p>
        <div className="meta">
          株式会社CORE 編集部 · 公開・情報確認 {checked} · 約{a.minutes}分
        </div>
      </header>
      <div className="article-layout">
        <nav className="toc" aria-label="目次">
          <strong>この記事の内容</strong>
          {a.sections.map((s, i) => (
            <a key={s.title} href={"#section-" + i}>
              {String(i + 1).padStart(2, "0")} {s.title}
            </a>
          ))}
          <a href="/resources/harness-starter-kit">
            無料キットで実践する <ArrowUpRight size={16} />
          </a>
        </nav>
        <article className="article-body">
          {a.slug === "harness-engineering" && <Diagram />}
          {a.sections.map((s, i) => (
            <section id={"section-" + i} key={s.title}>
              <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {s.steps && (
                <ol className="steps">
                  {s.steps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              )}
              {s.technical && (
                <details>
                  <summary>技術担当者向けの実装ポイント</summary>
                  <p>{s.technical}</p>
                </details>
              )}
            </section>
          ))}
          <section className="sources">
            <h2>出典と、この解説の位置づけ</h2>
            <p>
              公式資料を参照し、COREが実務向けに再構成した解説です。導入計画・成熟度・例示はCOREの提案であり、効果の保証ではありません。講演者の逐語引用や未検証の価格・実績は含めていません。
            </p>
            {a.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                {s.title} <ArrowUpRight size={16} />
              </a>
            ))}
            <p>
              情報確認日：{checked}
              。仕様や契約条件は導入時に公式情報で再確認してください。
            </p>
          </section>
        </article>
      </div>
      <Cta />
      <section className="section">
        <h2>続けて読む</h2>
        <div className="article-grid">
          {articles
            .filter((x) => x.slug !== a.slug)
            .slice(0, 3)
            .map((x) => (
              <ArticleCard key={x.slug} article={x} />
            ))}
        </div>
      </section>
    </>
  );
}
function ArticleCard({ article: a }: { article: Article }) {
  return (
    <a className="article-card" href={prefix + a.slug}>
      <span className="eyebrow">{a.category}</span>
      <h3>{a.title}</h3>
      <p>{a.summary}</p>
      <span className="card-end">
        約{a.minutes}分で読む <ArrowUpRight size={20} />
      </span>
    </a>
  );
}
function Home() {
  const [category, setCategory] = useState("すべて");
  return (
    <>
      <header className="hub-hero">
        <div>
          <p className="eyebrow">CORE INTELLIGENCE HUB</p>
          <h1>
            AIを使える会社から、
            <br />
            <em>成果が出る会社へ。</em>
          </h1>
          <p className="lead">
            技術を知る。その先の、仕事を変える。
            <br />
            経営と実装をつなぐ、COREの実践知。
          </p>
          <a className="button" href="/insights/harness-engineering">
            ハーネス設計から学ぶ <ArrowRight size={19} />
          </a>
          <p className="hero-note">
            記事は無料・登録不要でお読みいただけます。
          </p>
        </div>
        <Diagram />
      </header>
      <div className="path-strip">
        <span>LEARNING PATH</span>
        <a href="/insights/ai-adoption-levels">01 現在地を知る</a>
        <ArrowRight size={16} />
        <a href="/insights/harness-engineering">02 仕組みを設計する</a>
        <ArrowRight size={16} />
        <a href="/resources">03 自社で試す</a>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FEATURED INSIGHT</p>
            <h2>
              モデルの力を、
              <br />
              仕事の成果に変えるもの。
            </h2>
          </div>
          <p>
            よい回答が返ることと、
            <br />
            安心して仕事を任せられること。
            <br />
            その間を埋めるのがハーネスです。
          </p>
        </div>
        <a className="feature" href="/insights/harness-engineering">
          <div>
            <span className="eyebrow">START HERE / ハーネス設計</span>
            <h3>プロンプトの、その先へ。</h3>
            <p>
              知識の正本、権限、検証、失敗からの回復。
              <br />
              再現性のあるAI活用を、ひとつずつ。
            </p>
            <span className="text-link">
              実務ガイドを読む <ArrowUpRight size={20} />
            </span>
          </div>
          <div className="feature-list">
            {[
              "何を任せるか",
              "何を参照するか",
              "どこで人が判断するか",
              "どう確かめ、戻すか",
            ].map((x, i) => (
              <div key={x}>
                <span>0{i + 1}</span>
                {x}
              </div>
            ))}
          </div>
        </a>
      </section>
      <section className="section" id="articles">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KNOWLEDGE LIBRARY</p>
            <h2>知る。選ぶ。実践する。</h2>
          </div>
          <span>経営者と、実装を担う人のために。</span>
        </div>
        <div className="filters" aria-label="記事カテゴリ">
          {["すべて", ...new Set(articles.map((a) => a.category))].map((c) => (
            <button
              key={c}
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="article-grid">
          {articles
            .filter((a) => category === "すべて" || a.category === category)
            .map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
        </div>
      </section>
      <Cta />
      <section className="section next-grid">
        <a href="/roai-score">
          <ShieldCheck />
          <h3>自社の現在地を知る</h3>
          <p>ROAI SCORE。約2分、連絡先不要の無料診断。</p>
          <span className="text-link">
            無料で診断する <ArrowUpRight size={18} />
          </span>
        </a>
        <a href="/corp/academy">
          <BookOpen />
          <h3>人と一緒に、学びを実践へ</h3>
          <p>CORE Academyで、職種や業務に合わせて学ぶ。</p>
          <span className="text-link">
            Academyを見る <ArrowUpRight size={18} />
          </span>
        </a>
      </section>
    </>
  );
}
function ResourceList() {
  return (
    <>
      <header className="article-head">
        <p className="eyebrow">CORE AI TOOLKIT</p>
        <h1>
          読んで終わらない。
          <br />
          明日の仕事に使う。
        </h1>
        <p className="lead">
          設計する、比較する、棚卸しする。
          <br />
          AI導入を具体化する無料の実務資料。
        </p>
      </header>
      <section className="section resources-list">
        {resources.map((r, i) => (
          <a href={withSource("/resources/" + r.slug)} key={r.slug}>
            <span className="resource-number">0{i + 1}</span>
            <div>
              <p className="eyebrow">
                {r.format} / {r.time}
              </p>
              <h2>{r.title}</h2>
              <p>{r.summary}</p>
              <p>対象：{r.audience}</p>
            </div>
            <ArrowUpRight />
          </a>
        ))}
      </section>
      <section className="section">
        <a className="feature" href="/resources/security-self-check">
          <ShieldCheck size={36} />
          <div>
            <h2>AI導入の安全策を自己点検する</h2>
            <p>入力内容は送信しません。問診で運用の不足を整理します。</p>
          </div>
          <ArrowUpRight />
        </a>
      </section>
    </>
  );
}
function Registration({ slug }: { slug: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/hub?action=config")
      .then(async (r) => r.ok && (await r.json()).enabled === true)
      .then((value) => {
        if (active) setAvailable(value);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [downloads, setDownloads] = useState<{ title: string; url: string }[]>(
    [],
  );
  const [mailStatus, setMailStatus] = useState("");
  return state === "done" ? (
    <div className="download-result" role="status">
      <Check />
      <h2>資料を受け取れます。</h2>
      <p>下のリンクは24時間有効です。この画面から保存してください。</p>
      {downloads.map((d) => (
        <a className="button" key={d.url} href={d.url}>
          {d.title} <ArrowRight size={18} />
        </a>
      ))}
      <p>
        {mailStatus === "queued"
          ? "受付メールは送信待ちです。メールの到着を待たずに資料を保存できます。"
          : "メール送信は現在有効になっていません。この画面から資料を保存してください。"}
      </p>
      <a href={withSource(booking)}>
        自社の業務について相談する <ArrowUpRight size={16} />
      </a>
    </div>
  ) : (
    <form
      className="hub-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!available) return;
        setError("");
        setState("sending");
        const f = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/hub?action=register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: f.get("name"),
              company: f.get("company"),
              email: f.get("email"),
              interest: f.get("interest"),
              website: f.get("website"),
              privacy: f.get("privacy") === "on",
              marketing: f.get("marketing") === "on",
              resource: slug,
              ...attribution,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw Error(data.error || "受付できませんでした。");
          setDownloads(data.downloads);
          setMailStatus(data.mailStatus);
          setState("done");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "通信を確認してください。",
          );
          setState("idle");
        }
      }}
    >
      <h2>無料で受け取る</h2>
      <p>営業メールへの同意は任意です。</p>
      {available !== true && (
        <p role="status" className="availability-note">
          {available === null
            ? "受付状況を確認しています。"
            : "現在、資料登録の受付を休止しています。入力・送信はできません。記事と自己点検は登録不要でご利用いただけます。"}
        </p>
      )}
      <fieldset disabled={available !== true} className="registration-fields">
        <label>
          氏名 <span>必須</span>
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
        <label>
          会社名 <span>必須</span>
          <input
            name="company"
            autoComplete="organization"
            required
            maxLength={150}
          />
        </label>
        <label>
          メールアドレス <span>必須</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          関心テーマ <span>任意</span>
          <select name="interest">
            <option value="">選択してください</option>
            <option>業務改善</option>
            <option>開発の効率化</option>
            <option>セキュリティ</option>
            <option>社員研修</option>
          </select>
        </label>
        <div className="honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="check-label">
          <input name="privacy" type="checkbox" required />
          <span>
            <a href="/privacy" target="_blank" rel="noreferrer">
              個人情報の取扱い
            </a>
            を確認し、資料提供・受付対応のための利用に同意します。
          </span>
        </label>
        <label className="check-label">
          <input name="marketing" type="checkbox" />
          <span>
            CORE AI
            Toolkitから活用例やイベント・相談の案内をメールで受け取る（任意・いつでも停止可能）。メール本人確認後に有効になります。
          </span>
        </label>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button"
        disabled={state === "sending" || available !== true}
      >
        {state === "sending" ? "受付中…" : "登録して資料を受け取る"}{" "}
        <ArrowRight size={18} />
      </button>
      <p className="form-note">
        資料は登録後の画面から取得できます。メール送信に失敗しても、画面のリンクをご利用いただけます。
      </p>
    </form>
  );
}
function Resource({ slug }: { slug: string }) {
  const r = resources.find((x) => x.slug === slug)!;
  return (
    <>
      <header className="article-head">
        <a className="breadcrumb" href="/resources">
          AI Toolkit / 無料資料
        </a>
        <p className="eyebrow">CORE AI TOOLKIT / VERSION 1.0</p>
        <h1>{r.title}</h1>
        <p className="lead">{r.summary}</p>
      </header>
      <div className="resource-layout">
        <div>
          <div className="book-cover">
            <span>CORE AI TOOLKIT</span>
            <h2>{r.title}</h2>
            <div className="cover-rule" />
            <p>知識を、仕事の仕組みに。</p>
            <small>株式会社CORE / {checked}</small>
          </div>
          <section>
            <h2>この資料でできること</h2>
            <ul className="check-list">
              {r.items.map((x) => (
                <li key={x}>
                  <Check size={18} />
                  {x}
                </li>
              ))}
            </ul>
            <p>
              対象：{r.audience}
              <br />
              形式：{r.format}
              <br />
              取り組む時間の目安：{r.time}
            </p>
            <p>
              社内の営利業務で利用・編集できます。資料本体の再販売・無断再配布はできません。成果や法令適合を保証する資料ではありません。
            </p>
          </section>
        </div>
        <Registration slug={slug} />
      </div>
    </>
  );
}
const checks = [
  "入力してよい情報と禁止する情報が決まっている",
  "利用サービスの契約・データ保持条件を確認した",
  "接続先と操作権限を必要な範囲に限定している",
  "外部送信・公開・支払いの承認者が決まっている",
  "通常・例外・失敗のテストを実施している",
  "秘密情報を含めず操作記録を残している",
  "事故時の停止・連絡・復旧手順がある",
  "退職や異動時にアクセスを取り消せる",
];
function SelfCheck() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const complete = Object.keys(answers).length === checks.length;
  const gaps = checks.filter((_, i) => answers[i] !== "yes");
  return (
    <>
      <header className="article-head">
        <p className="eyebrow">SECURITY SELF-CHECK</p>
        <h1>
          安全に任せる準備を、
          <br />
          確かめる。
        </h1>
        <p className="lead">
          8項目の問診。回答は端末内だけで処理し、送信・保存しません。
          <br />
          外部スキャンや監査保証を行うものではありません。
        </p>
      </header>
      <section className="self-check">
        {checks.map((c, i) => (
          <fieldset key={c}>
            <legend>
              {i + 1}. {c}
            </legend>
            {[
              ["yes", "はい"],
              ["no", "いいえ"],
              ["unknown", "わからない"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name={"q" + i}
                  checked={answers[i] === value}
                  onChange={() => setAnswers({ ...answers, [i]: value })}
                />
                {label}
              </label>
            ))}
          </fieldset>
        ))}
        {complete && (
          <div className="check-result" role="status">
            <h2>
              {gaps.length
                ? `${gaps.length}項目を、次の改善対象に。`
                : "8項目の準備を確認しました。"}
            </h2>
            <p>
              自己申告に基づく整理です。安全性や法令適合を保証する結果ではありません。
            </p>
            <ul>
              {gaps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>まず担当者を決め、不足項目の証拠と期限を記録してください。</p>
            <a href="/insights/ai-security">具体的な安全策を読む</a>
          </div>
        )}
      </section>
    </>
  );
}
function TokenAction() {
  const [result, setResult] = useState("");
  const [token] = useState(() => {
    const t = location.hash.slice(1);
    history.replaceState(null, "", location.pathname + location.search);
    return t;
  });
  const action =
    query.get("action") === "unsubscribe" ? "unsubscribe" : "verify";
  return (
    <section className="article-head">
      <h1>
        {action === "unsubscribe"
          ? "AI Toolkitのメール配信を停止する"
          : "メールアドレスを確認する"}
      </h1>
      <p>
        {action === "unsubscribe"
          ? "停止すると、今後のAI Toolkitメール案内を受け取りません。Academyなど別に登録した案内の設定は変更しません。"
          : "ご自身が申し込んだ資料と、任意で選択したメール案内の希望を確認します。"}
      </p>
      <button
        className="button"
        onClick={async () => {
          try {
            const r = await fetch("/api/hub?action=" + action, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const j = await r.json();
            setResult(r.ok ? "手続きが完了しました。" : j.error);
          } catch {
            setResult("通信できませんでした。再度お試しください。");
          }
        }}
      >
        手続きを確定する
      </button>
      <p role="status">{result}</p>
    </section>
  );
}
export default function Hub() {
  const [menu, setMenu] = useState(false);
  const path = location.pathname.replace(/\/$/, "");
  const article = articles.find((a) => path === prefix + a.slug);
  const resource = resources.find((r) => path === "/resources/" + r.slug);
  return (
    <div className="hub">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header className="hub-header">
        <a
          className="hub-brand"
          href="/corp"
          aria-label="CORE Intelligence Hub 公式サイト"
        >
          <img src="/core-icon-v2.svg" alt="" />
          <strong>CORE</strong>
          <span>Intelligence Hub</span>
        </a>
        <button
          className="menu-toggle"
          aria-label={menu ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "open" : ""} aria-label="メインナビゲーション">
          <a href="/insights">Insights</a>
          <a href="/resources">AI Toolkit</a>
          <a href="/corp/academy">Academy</a>
          <a className="nav-cta" href={withSource(booking)}>
            自社の業務を相談する <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main id="main">
        {path === "/admin/lead-funnel" ? (
          <Admin />
        ) : article ? (
          <ArticleView article={article} />
        ) : resource ? (
          <Resource slug={resource.slug} />
        ) : path === "/resources/security-self-check" ? (
          <SelfCheck />
        ) : path === "/resources/confirm" ? (
          <TokenAction />
        ) : path === "/resources" ? (
          <ResourceList />
        ) : path === "/insights" ? (
          <Home />
        ) : (
          <section className="article-head">
            <h1>ページが見つかりません。</h1>
            <a href="/insights">Insightsへ戻る</a>
          </section>
        )}
      </main>
      <footer className="hub-footer">
        <div>
          <strong>いつの時代も、変わらない核を。</strong>
          <p>
            核とは、人。
            <br />
            人が、人にしかできないことに、時間を使える世界を。
          </p>
        </div>
        <nav aria-label="フッター">
          <a href="/corp">株式会社CORE</a>
          <a href="/resources">無料資料</a>
          <a href="/roai-score">無料ROAI SCORE</a>
          <a href="/privacy">プライバシーポリシー</a>
        </nav>
        <small>© {new Date().getFullYear()} CORE Inc.</small>
      </footer>
    </div>
  );
}
