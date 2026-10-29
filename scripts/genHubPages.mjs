import { writeFileSync, readFileSync } from "node:fs";
const { articles, resources, checked } = JSON.parse(
  readFileSync(new URL("../src/hub/content.json", import.meta.url), "utf8"),
);
const pages = [
  {
    path: "/admin/lead-funnel",
    title: "Lead funnel 管理",
    summary: "CORE 管理者向け集計",
  },
  {
    path: "/insights",
    title: "CORE Intelligence Hub",
    summary: "AIを使える会社から、成果が出る会社へ。経営と実装をつなぐ実践知。",
  },
  ...articles.map((a) => ({ ...a, path: "/insights/" + a.slug })),
  {
    path: "/resources",
    title: "CORE AI Toolkit",
    summary: "AI導入の実務に使える無料資料とテンプレート。",
  },
  ...resources.map((r) => ({ ...r, path: "/resources/" + r.slug })),
  {
    path: "/resources/security-self-check",
    title: "AI導入セキュリティ自己点検",
    summary: "8項目の問診で、AI運用の準備を確認。外部スキャンは実施しません。",
  },
  {
    path: "/resources/confirm",
    title: "メール設定の確認",
    summary: "COREのメール設定を確認します。",
  },
];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
for (const p of pages) {
  const canonical = "https://www.core-ai.jp" + p.path;
  const structured = {
    "@context": "https://schema.org",
    "@type": p.sections ? "Article" : "WebPage",
    name: p.title,
    headline: p.title,
    url: canonical,
    ...(p.sections
      ? {
          datePublished: checked,
          dateModified: checked,
          author: { "@type": "Organization", name: "株式会社CORE" },
        }
      : {}),
  };
  writeFileSync(
    "hub" + p.path.replaceAll("/", "-") + ".html",
    `<!doctype html><html lang="ja"><head><meta charset="UTF-8"/><link rel="icon" href="/core-icon-v2.svg"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(p.title)} | CORE</title><meta name="description" content="${esc(p.summary)}"/><link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(p.title)}"/><meta property="og:description" content="${esc(p.summary)}"/><meta property="og:url" content="${canonical}"/><meta property="og:type" content="${p.sections ? "article" : "website"}"/><meta property="og:image" content="https://www.core-ai.jp/og-core-v2.png"/><meta name="referrer" content="strict-origin-when-cross-origin"/>${p.path.includes("confirm") || p.path.startsWith("/admin") ? '<meta name="robots" content="noindex,nofollow"/>' : ""}<script type="application/ld+json">${JSON.stringify(structured).replaceAll("<", "\\u003c")}</script></head><body><div id="root"></div><noscript><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p>${(p.sections || []).map((s) => `<h2>${esc(s.title)}</h2><p>${esc(s.body)}</p>`).join("")}<a href="/insights">CORE Intelligence Hub</a><p>フォームの利用にはJavaScriptを有効にしてください。</p></noscript><script type="module" src="/src/hubMain.tsx"></script></body></html>\n`,
  );
}
writeFileSync(
  "scripts/hubRoutes.json",
  JSON.stringify(
    pages.map((p) => ({
      path: p.path,
      file: "hub" + p.path.replaceAll("/", "-") + ".html",
    })),
    null,
    2,
  ) + "\n",
);
const sitemap = readFileSync("public/sitemap-corp.xml", "utf8")
  .replace(
    /\s*<url><loc>https:\/\/www\.core-ai\.jp\/(?:insights|resources)[\s\S]*?<\/url>/g,
    "",
  )
  .replace(
    "</urlset>",
    pages
      .filter(
        (p) => !p.path.includes("confirm") && !p.path.startsWith("/admin"),
      )
      .map(
        (p) =>
          `<url><loc>https://www.core-ai.jp${p.path}</loc><lastmod>${checked}</lastmod></url>`,
      )
      .join("\n") + "\n</urlset>",
  );
writeFileSync("public/sitemap-corp.xml", sitemap);
