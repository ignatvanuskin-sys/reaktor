import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.CHECK_URL || "http://localhost:4199";
const OUT = path.join(os.tmpdir(), "opencode", "reaktor-final");
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { w: 320, h: 568, name: "320", mobile: true },
  { w: 360, h: 740, name: "360", mobile: true },
  { w: 390, h: 844, name: "390", mobile: true },
  { w: 428, h: 926, name: "428", mobile: true },
  { w: 768, h: 1024, name: "768", mobile: true },
  { w: 1024, h: 768, name: "1024", mobile: false },
  { w: 1440, h: 900, name: "1440", mobile: false },
  { w: 1920, h: 1080, name: "1920", mobile: false },
];

const results = [];
const browser = await chromium.launch();

async function overflowX(page) {
  return page.evaluate(() => ({
    inner: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    bad: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
}

for (const vp of viewports) {
  const r = { viewport: vp.name, errors: [], failed: [], checks: {} };
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    deviceScaleFactor: vp.mobile ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && r.errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => r.errors.push("pageerror: " + String(e).slice(0, 160)));
  page.on("requestfailed", (q) => r.failed.push(q.url().slice(0, 120)));
  page.on("response", (s) => s.status() >= 400 && r.failed.push(`${s.status()} ${s.url().slice(0, 120)}`));
  try {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".app-stage.is-ready", { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `hero-${vp.name}.png`) });
    r.checks.topOverflow = await overflowX(page);
    r.checks.revealOn = await page.evaluate(() => document.body.classList.contains("reveal-on"));

    // slow scroll top->bottom to trigger all reveals
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(700);
    r.checks.revealLeft = await page.evaluate(() => document.querySelectorAll(".reveal:not(.in)").length);
    r.checks.bottomOverflow = await overflowX(page);
    await page.screenshot({ path: path.join(OUT, `bottom-${vp.name}.png`) });

    // header behavior
    r.checks.headerPos = await page.evaluate(() => getComputedStyle(document.querySelector(".site-header")).position);
    if (!vp.mobile && vp.w >= 1024) {
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(400);
      r.checks.headerScrolledClass = await page.evaluate(() => document.querySelector(".site-header").className);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }

    // modal opens everywhere (scroll past the 700px mobile hero first)
    await page.evaluate((y) => window.scrollTo(0, y), vp.mobile ? 1100 : 600);
    await page.waitForTimeout(600);
    const openerSel = vp.w <= 560 ? ".floating-cta" : ".header-cta";
    await page.waitForSelector(openerSel, { state: "visible", timeout: 8000 });
    const opener = await page.$(openerSel);
    if (opener) {
      await opener.click();
      await page.waitForSelector(".booking-card", { timeout: 6000 });
      await page.waitForTimeout(400);
      const cb = await (await page.$(".booking-card")).boundingBox();
      const ab = await (await page.$(".booking-actions .btn-primary")).boundingBox();
      r.checks.modal = {
        fits: cb.height <= vp.h + 1,
        ctaVisible: ab.y + ab.height <= vp.h + 1,
      };
      await page.screenshot({ path: path.join(OUT, `modal-${vp.name}.png`) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      r.checks.escCloses = (await page.$(".booking-card")) === null;
    } else {
      r.checks.modal = "NO_OPENER";
    }

    // images actually rendered (not broken)
    r.checks.imgs = await page.evaluate(() =>
      [...document.querySelectorAll("img")].map((img) => ({
        ok: img.complete && img.naturalWidth > 0,
        src: img.currentSrc.slice(-40),
      })),
    );
  } catch (e) {
    r.checks.fatal = String(e).slice(0, 300);
  }
  results.push(r);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
