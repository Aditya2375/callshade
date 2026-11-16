import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:8352/";
let server;
if (!process.env.BASE_URL) {
  server = spawn(
    "python3",
    ["-m", "http.server", "8352", "--bind", "127.0.0.1", "--directory", "docs"],
    { stdio: "ignore" },
  );
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ headless: true });
let count = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  count++;
};
await mkdir("/tmp/callshade-shots", { recursive: true });
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }),
      errors = [],
      failed = [],
      third = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("requestfailed", (r) => failed.push(r.url()));
    page.on("request", (r) => {
      if (!r.url().startsWith(base)) third.push(r.url());
    });
    await page.goto(base);
    await page.waitForFunction(() =>
      document.querySelector("#run-title").textContent.includes("LOCAL RESULT"),
    );
    ok((await page.locator(".sentence").count()) === 7, "seven sentences");
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no overflow",
    );
    await page.screenshot({ path: `/tmp/callshade-shots/hero-${width}.png` });
    const expected = await page.evaluate(async () => {
      const { fit, analyze } = await import("./core.js"),
        { RECORDS } = await import("./corpus.js");
      const m = fit(RECORDS.filter((r) => r.call < "call-10"));
      return analyze(m, document.querySelector("#transcript").value);
    });
    const metrics = await page.locator("#metrics b").allTextContents();
    ok(
      JSON.stringify(metrics) === JSON.stringify(expected.counts.map(String)),
      "counts exact",
    );
    ok((await page.locator(".group").count()) === 4, "groups separated");
    await page.locator(".sentence").nth(4).click();
    ok(
      (await page.locator("#inspect-text").innerText()) ===
        expected.rows[4].text,
      "selected exact text",
    );
    ok(
      (await page.locator("#inspect-id").innerText()) === "SENTENCE 05",
      "selected id",
    );
    ok(
      (await page.locator("#evidence tr").count()) ===
        expected.rows[4].evidence.length,
      "all evidence",
    );
    const cells = await page.locator("#evidence tr").allTextContents();
    ok(
      cells.some((s) => s.includes(expected.rows[4].evidence[0].feature)),
      "actual model evidence",
    );
    ok(
      (await page.locator("#decomposition").innerText()).includes("prior Δ"),
      "accounting text",
    );
    ok(
      (await page.locator(".sentence[aria-pressed=true]").count()) === 1,
      "one selected",
    );
    await page.locator("#transcript").fill("Revenue declined.");
    ok(
      await page
        .locator(".desk")
        .evaluate((e) => e.classList.contains("stale")),
      "dirty stale",
    );
    ok(
      await page.locator(".sentence").first().isDisabled(),
      "dirty prevents inspection",
    );
    ok(
      (await page.locator("#notice").innerText()).includes(
        "Previous result is stale",
      ),
      "dirty warning",
    );
    await page.locator("#run").click();
    ok((await page.locator(".sentence").count()) === 1, "new run");
    ok(
      (await page.locator("#inspect-text").innerText()) === "Revenue declined",
      "new exact text",
    );
    await page.locator("#transcript").fill("a".repeat(600));
    await page.locator("#run").click();
    ok(
      (await page.locator("#inspect-text").innerText()).length === 600,
      "max token accepted whole",
    );
    ok(
      (await page.locator(".sentence").innerText()).includes("a".repeat(600)),
      "max token ledger retained whole",
    );
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "600-char token wraps within viewport",
    );
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/callshade-shots/max-token-${width}.png`,
      fullPage: true,
    });
    await page.locator("#transcript").fill("😀".repeat(600));
    await page.locator("#run").click();
    ok(
      (await page.locator("#inspect-text").innerText()) === "😀".repeat(600),
      "600-codepoint Unicode run accepted whole",
    );
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Unicode ledger run wraps",
    );
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/callshade-shots/unicode-${width}.png`,
      fullPage: true,
    });
    const longest = await page.evaluate(async () => {
      const { fit } = await import("./core.js"),
        { RECORDS } = await import("./corpus.js");
      const m = fit(RECORDS.filter((r) => r.call < "call-10"));
      return m.vocab.reduce((a, b) => (b.length > a.length ? b : a));
    });
    await page.locator("#transcript").fill(longest.replaceAll("_", " "));
    await page.locator("#run").click();
    ok(
      (await page.locator("#evidence").innerText()).includes(longest),
      "longest recognized feature retained whole",
    );
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "longest feature local scroll only",
    );
    const featureBounds = await page.locator("#evidence").evaluate((e) => {
      const r = e.closest(".table-wrap").getBoundingClientRect();
      return [r.left, r.right];
    });
    ok(
      featureBounds[0] >= 0 && featureBounds[1] <= width,
      "feature table contained",
    );
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/callshade-shots/long-known-${width}.png`,
      fullPage: true,
    });
    for (const bad of [
      "",
      "a".repeat(601),
      "a ".repeat(129),
      "a. ".repeat(161),
      "x".repeat(16001),
    ]) {
      await page.locator("#transcript").fill(bad);
      await page.locator("#run").click();
      ok(
        (await page.locator("#notice").innerText()).includes("Not applied"),
        "reject bad",
      );
      ok(
        await page.locator(".sentence").first().isDisabled(),
        "bad keeps old disabled",
      );
    }
    await page.locator("#sample").selectOption("unknown");
    await page.locator("#load").click();
    await page.locator("#run").click();
    ok((await page.locator(".sentence").count()) === 4, "unknown control");
    ok(
      (await page.locator("#metrics b").nth(3).innerText()) === "3",
      "three fullyunknown",
    );
    ok(
      (await page.locator("#inspect-text").innerText()) === "123 456",
      "numbercontrol",
    );
    ok(
      (await page.locator("#evidence tr").count()) === 0,
      "no fabricated evidence",
    );
    ok(
      (await page.locator("#no-evidence").innerText()).includes(
        "not a neutral finding",
      ),
      "unscored disclaimer",
    );
    ok(
      (await page.locator("#detail-metrics").innerText()).includes(
        "Not assigned",
      ),
      "no spurious margin",
    );
    await page.locator("#sample").selectOption("negation");
    await page.locator("#load").click();
    await page.locator("#run").click();
    ok((await page.locator(".sentence").count()) === 5, "negation control");
    await page.locator("#alpha").selectOption("4");
    ok(await page.locator(".sentence").first().isDisabled(), "smoothing stale");
    await page.locator("#run").click();
    ok(
      (await page.locator("#model-info").innerText()).startsWith("α 4"),
      "smoothing applied",
    );
    await page
      .locator("#transcript")
      .fill(
        "[Prepared]\nCEO:\n<img src=x onerror=alert(1)> Revenue grew.\n[Q&A]\nAnalyst:\nWhy did demand weaken?",
      );
    await page.locator("#run").click();
    ok((await page.locator("#sentences img").count()) === 0, "XSS literal");
    ok(
      (await page.locator("#inspect-text").innerText()).includes("<img"),
      "literal retained",
    );
    await page.locator("#sample").selectOption("mixed");
    await page.locator("#load").click();
    await page.locator("#alpha").selectOption("1");
    await page.locator("#run").click();
    await page.locator("#evaluation summary").first().click();
    ok(
      (await page.locator("#holdout .audit-item").count()) === 18,
      "18heldout",
    );
    ok((await page.locator("#confusion tr").count()) === 3, "matrix3rows");
    ok(
      (await page.locator("#evaluation").innerText()).includes(
        "does not establish real-world accuracy",
      ),
      "toyhonesty",
    );
    const ev = await page.evaluate(async () => {
      const { fit, evaluate } = await import("./core.js"),
        { RECORDS } = await import("./corpus.js");
      return evaluate(
        fit(RECORDS.filter((r) => r.call < "call-10")),
        RECORDS.filter((r) => r.call >= "call-10"),
      );
    });
    ok(
      (await page.locator("#eval-metrics b").first().innerText()) ===
        (100 * ev.accuracy).toFixed(1) + "%",
      "actualtoyaccuracy",
    );
    await page.locator("#evaluation details summary").click();
    ok((await page.locator("#corpus .audit-item").count()) === 72, "allcorpus");
    await page.locator("#evaluation details summary").click();
    await page.locator(".sentence").last().click();
    await page.screenshot({
      path: `/tmp/callshade-shots/lab-${width}.png`,
      fullPage: true,
    });
    ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "finalnooverflow",
    );
    ok(errors.length === 0, errors.join(","));
    ok(failed.length === 0, failed.join(","));
    ok(third.length === 0, third.join(","));
    ok(
      (await page.evaluate(
        () => localStorage.length + sessionStorage.length,
      )) === 0,
      "nostorage",
    );
    ok((await page.context().cookies()).length === 0, "nocookies");
    await page.close();
  }
  console.log(`${count} browser checks across 5 widths PASS`);
} finally {
  await browser.close();
  if (server) server.kill();
}
