const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright"
);
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.HUB_QA_OUT || "/tmp/core-hub-browser-qa";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const width of [1440, 1280, 768, 430, 390, 375]) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  for (const path of [
    "/insights",
    "/insights/harness-engineering",
    "/resources/harness-starter-kit",
    "/resources/security-self-check",
  ]) {
    const errors = [];
    const onError = (e) => errors.push(e.message);
    page.on("pageerror", onError);
    await page.goto("http://127.0.0.1:4387" + path);
    await page.waitForSelector("h1");
    await page.screenshot({
      path: out + "/" + path.replaceAll("/", "-") + "-" + width + ".png",
      fullPage: true,
    });
    results.push({
      width,
      path,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      h1: await page.locator("h1").innerText(),
      errors,
    });
    page.off("pageerror", onError);
  }
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:4387/resources/harness-starter-kit");
await page
  .getByText("現在、資料登録の受付を休止しています。", { exact: false })
  .waitFor();
results.push({
  disabledIntake: await page.locator("input[name=email]").isDisabled(),
});
// Block every registration request even if the local server gains API support.
let registrationRequests = 0;
await page.route("**/api/hub?action=register", (route) => {
  registrationRequests++;
  return route.fulfill({ status: 503, json: { error: "検証用の送信失敗" } });
});
// Explicit local-only fake config to test the submit-error path. No backend writes.
await page.route("**/api/hub?action=config", (route) =>
  route.fulfill({ json: { enabled: true } }),
);
await page.goto(
  "http://127.0.0.1:4387/insights?event_id=lecture-qa&campaign_id=qa",
);
await page.getByRole("link", { name: "ハーネス設計から学ぶ" }).click();
await page.getByRole("link", { name: "無料キットを見る" }).click();
results.push({ attribution: page.url().includes("event_id=lecture-qa") });
await page.locator("input[name=name]").fill("架空担当者");
await page.locator("input[name=company]").fill("架空会社");
await page.locator("input[name=email]").fill("qa@example.invalid");
await page.locator("input[name=privacy]").check();
results.push({
  marketingOff: !(await page.locator("input[name=marketing]").isChecked()),
});
await page.getByRole("button", { name: "登録して資料を受け取る" }).click();
await page.getByRole("alert").waitFor();
results.push({
  registrationRequests,
  failureVisible: await page.getByRole("alert").innerText(),
});
await browser.close();
await writeFile(out + "/results.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));

if (results.some((r) => r.overflow || r.errors?.length || r.disabledIntake === false || r.attribution === false || r.marketingOff === false || (r.registrationRequests !== undefined && (r.registrationRequests !== 1 || r.failureVisible !== "検証用の送信失敗")))) process.exitCode = 1;
