# CORE Academy B2C 月額会員 — Codex 実装・受入仕様
作成: 2026-10-29 / 状態: 開発・検証中。実課金は未開始。

## 本人指示と正本
- 既存LPは `https://www.core-ai.jp/academy/`。法人研修と個人会員を分離する。
- B2Cは月額税抜5,000円、税込5,500円（国内標準10%）。初回8レッスン＋毎月テーマ別新教材。
- 教材原稿・6か月計画は **private** `core-ai-jp/core-knowledge/CORE_Academy/` を参照。本文をpublic repoに複製しない。
- 既存の `/academy/apply` は経営者勉強会のフォーム。月額決済に転用しない。
- `AGENTS.md` と `docs/ACADEMY_OPERATIONS.md` を先に読む。別サービスのStripe決済や既存AcademyのNotionデータを壊さない。
- 新サービスは **CORE Inc (acct_1Te6bDChAalnRS11)** のみ。GAUCHEのStripeアカウントは絶対に使用しない。

## 利用者導線
1. COREコーポレートサイトのAcademy部門→既存Academy LP。
2. LPで法人／個人の違い、教材8本、毎月の追加教材、価格、解約、対応端末を確認。
3. 「会員プランを見る」→ `/academy/member` → `/api/academy-membership?action=checkout` → CORE Stripe Checkout。
4. 支払完了→ `/academy/member?checkout=complete`。決済完了だけで認証済みと判定しない。
5. webhook署名検証で当該Priceの購読状態を保存→契約メール宛の15分1回限りのログインリンク→HTTP-only cookie。
6. 会員限定教材→タイトル/要約/本文の公開日判定。非契約者には本文を一切返さない。
7. Stripe Billing Portalからプラン/支払い方法/解約を操作。顧客状態とアクセス権をWebhookとStripe実照合で同期。
8. 毎月分の動画・文章・課題・クイズは公開予約日時になったら自動で表示。次の教材の準備・確認は前月25日までに完了。

## 現行実装
- `public/academy/index.html`: 価格、8レッスン、月次テーマ、FAQ、購読導線、ローカルロゴ。
- `public/academy/member.html` + `member.js` + `member.css`: 消費者向け入会・ログイン・会員図書館UI。
- `api/academy-membership/index.ts`: Stripe-hosted Checkout、会員メール認証、Library/lesson、契約者Billing Portal、教材予約公開API。
- `api/academy-membership/webhook.ts`: Stripe署名検証、対象Price判定、Redisへの購読状態同期。
- `public/academy/logos/`: OpenAI/Claude/Geminiのサイト内SVG。
- `vercel.json`: `/academy/member` ルート。
- 決済受付は初期値 **OFF** 。未設定では明確に「受付準備中」と表示。

## 新規Vercel本番環境変数（サーバー限定。VITE_接頭辞禁止）
- `ACADEMY_MEMBERSHIP_ENABLED=false` → 全受入合格後のみtrue
- `ACADEMY_CONTENT_READY=false` → 初期8教材の公開・閲覧テスト後のみtrue
- `ACADEMY_STRIPE_SECRET_KEY` → CORE Incのsk_liveキー（GAUCHE禁止）
- `ACADEMY_STRIPE_PRICE_ID` → CORE Incに存在するJPY5500/月・tax_behavior=inclusiveのPrice
- `ACADEMY_STRIPE_TAX_RATE_JP_10` → 同一CORE Stripeアカウントのinclusive10% Tax Rate
- `ACADEMY_STRIPE_ACCOUNT_ID=acct_1Te6bDChAalnRS11`
- `ACADEMY_STRIPE_WEBHOOK_SECRET` → endpoint固有署名シークレット
- `ACADEMY_MEMBER_SIGNING_KEY` → 32文字以上のランダム値（メール索引HMACに使用）
- `ACADEMY_CONTENT_ADMIN_KEY` → 32文字以上のランダム値
- `ACADEMY_CONTENT_PUBLISH_ENABLED=false` → 保守時のみtrue
- 再利用するもの: UPSTASH_REDIS_REST_URL/TOKEN、GMAIL_USER/APP_PASSWORDまたはRESEND_API_KEY。
**重要:** チャット接続のStripeがCOREでも、それだけでVercelにCOREのStripe秘密鍵が導入されるわけではない。キーの所属先はStripe accounts.retrieve()で照合する。

## Codex実装・検証の残課題
- [ ] 開発中コードのテスト：CI TypeScript check (APIを含む), Vitest, build, static analysis。
- [ ] Playwrightで375px/390px/430px/desktopの料金表示・ブランドロゴ・申込導線・キーボード操作確認。
- [ ] Stripe testmodeでProduct/Price/Tax Rate/Checkout/Portal/Webhook再送/キャンセル/支払失敗/返金のE2E。
- [ ] 会社名義のStripe product/price/payment configurationを承認付きで構築。会員教材が準備できる前に課金開始しない。
- [ ] 日本語の特定商取引法表示、利用規約、返金・解約、月次更新日、役務提供開始日の確定。
- [ ] 8教材の校正済み動画を会員限定ストレージへアップロードし、期限付きURLで配信。APIが保存する本文と動画の双方の認証を検証。
- [ ] 受講進捗（誰がどこまで見たか）・小テスト・月次フォローを追加（DB情報漏えい/リトライ/同意制御）。
- [ ] 予約公開の承認ワークフロー、前月25日までの教材完成・更新履歴・差し替え・誤公開のロールバックを用意。
- [ ] ウェルカム/更新案内メールはメール配信ドメインと同意・重複防止・配信停止を検証後に有効化。
- [ ] 有料の教材はpublic GitHub、静的HTML、`/public`、ブラウザバンドルに含めない。
- [ ] 継続課金が動く本番検証はテスト/少額の承認済み手順に従い、無断の実課金・顧客への自動配信をしない。
- [ ] 本番公開後に `https://www.core-ai.jp/academy/` と `https://www.core-ai.jp/academy/member` の最終表示・リンク/フォーム/FAQ/モバイル/SEOを確認しURL+SHA報告。

## 会員配信データ
`POST /api/academy-membership?action=publish` に Bearer `ACADEMY_CONTENT_ADMIN_KEY`、JSON:
```json
{
  "id": "2026-11-week-1-lesson-1",
  "title": "ChatGPTを初めて開く",
  "summary": "質問の基本操作を10分で学ぶ",
  "month": "2026-11",
  "releaseAt": "2026-11-01T00:00:00+09:00",
  "body": "非公開教材本文（60字以上）。映像の権限付きURLは別の保護機構が必要。"
}
```
公開APIがtoken認証・購読確認・Stripe再照会を経てbodyを返す。本文から読み込みに使う動画も署名付き配信が必要。
**未実装/未設定箇所を「完了」と報告しない。**

## 明日 2026-10-30 の制作指示（本人向け）
- ① 初月8本のうち第1〜2本の動画撮影（各5〜8分。iPhone/PCそれぞれの画面差異を検証）
- ② 台本・プロンプト・練習課題・字幕・記事本文の校正
- ③ Stripe CORE Incの有効な商品と価格、税率、Webhook、Billing Portalの契約/税務確認
- ④ モニター2名で教材動画・学習導線の理解度チェック（架空データ使用）
- ⑤ 特商法・利用規約・キャンセルと返金条件を確定。正式な受付開始日は受入完了まで未定
