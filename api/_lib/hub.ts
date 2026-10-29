import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export const POLICY = "hub-2026-10-29-v1";
export const files: Record<string, string[]> = {
  "harness-starter-kit": ["harness-starter-kit.pdf", "harness-templates.md"],
  "codex-claude-enterprise-guide": ["codex-claude-enterprise-guide.pdf"],
  "ai-workflow-checklist": [
    "ai-workflow-checklist.pdf",
    "ai-workflow-checklist.csv",
  ],
};
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function secureEqual(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export const origin = () =>
  process.env.HUB_ORIGIN ||
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? "https://" + process.env.VERCEL_URL
    : "https://www.core-ai.jp");
export interface Registration {
  name: string;
  company: string;
  email: string;
  interest: string;
  resource: string;
  marketing: boolean;
  event_id: string;
  campaign_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}
export function validate(input: unknown): Registration {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("INVALID_INPUT");
  const b = input as Record<string, unknown>;
  const str = (k: string, max: number, required = false) => {
    const v = b[k] ?? "";
    if (
      typeof v !== "string" ||
      v.length > max ||
      (required && !v.trim()) ||
      Array.from(v).some((c) => c.charCodeAt(0) < 32)
    )
      throw Error("INVALID_INPUT");
    return v.trim();
  };
  if (
    b.privacy !== true ||
    typeof b.marketing !== "boolean" ||
    str("website", 200)
  )
    throw Error("INVALID_INPUT");
  const email = str("email", 254, true).normalize("NFKC").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("INVALID_INPUT");
  const resource = str("resource", 80, true);
  if (!Object.hasOwn(files, resource)) throw Error("INVALID_INPUT");
  const source = (k: string) => {
    const v = str(k, 80) || "unknown";
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) throw Error("INVALID_INPUT");
    return v;
  };
  return {
    name: str("name", 100, true),
    company: str("company", 150, true),
    email,
    resource,
    interest: str("interest", 80),
    marketing: b.marketing,
    event_id: source("event_id"),
    campaign_id: source("campaign_id"),
    utm_source: source("utm_source"),
    utm_medium: source("utm_medium"),
    utm_campaign: source("utm_campaign"),
  };
}
export function canMarket(
  lead: {
    verified: boolean;
    marketing: boolean;
    booked: boolean;
    unsubscribed: boolean;
  },
  enabled: boolean,
) {
  return (
    enabled &&
    lead.verified &&
    lead.marketing &&
    !lead.booked &&
    !lead.unsubscribed
  );
}
export const sequence = [
  { day: 0, subject: "ご請求資料と、最初の一歩", path: "/resources" },
  {
    day: 2,
    subject: "AI活用例：下書きと人の確認を分ける",
    path: "/insights/ai-adoption-levels",
  },
  {
    day: 5,
    subject: "まず一つの業務を分解してみる",
    path: "/resources/ai-workflow-checklist",
  },
  {
    day: 8,
    subject: "ハーネスと安全策を点検する",
    path: "/insights/ai-security",
  },
  {
    day: 12,
    subject: "ご希望の方へ：自社の業務を相談する",
    path: "https://timerex.net/s/core-ai/061de4f3",
  },
];
export function csvCell(v: unknown) {
  const s = String(v ?? "");
  return (
    '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
  );
}
