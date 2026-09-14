import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.CHECK_URL || "http://localhost:4199";
const OUT = path.join(os.tmpdir(), "opencode", "reaktor-mobile");
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { w: 360, h: 740, name: "360" },
  { w: 390, h: 844, name: "390" },
  { w: 428, h: 926, name: "428" },
];

const results = [];
const browser = await chromium.launch();

async function overflowX(page) {
  return page.evaluate(() => ({
    inner: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > window.innerWidth + 1);
      })
      .slice(0, 8)
      .map((el) => `${el.tagName}.${(el.className?.baseVal ?? el.className ?? "").toString().split(" ").slice(0, 2).join(".")} w=${Math.round(el.getBoundingClientRect().width)}`),
  }));
}

async function tapTargets(page, selectors) {
  const out = [];
  for (const sel of selectors) {
    const els = await page.$$(sel);
    for (const el of els.slice(0, 6)) {
      const b = await el.boundingBox();
      if (!b) continue;
      out.push({ sel, w: Math.round(b.width), h: Math.round(b.height), ok: b.width >= 44 && b.height >= 44 });
    }
  }
  return out;
}

for (const vp of viewports) {
  const r = { viewport: vp.name, errors: [], failed: [], checks: {} };
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && r.errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => r.errors.push("pageerror: " + String(e).slice(0, 160)));
  page.on("requestfailed", (q) => r.failed.push(q.url().slice(0, 120)));
  page.on("response", (s) => s.status() >= 400 && r.failed.push(`${s.status()} ${s.url().slice(0, 120)}`));
  try {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".app-stage.is-ready", { timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, `hero-${vp.name}.png`) });

    r.checks.heroH1 = await page.evaluate(() => {
      const h = document.querySelector(".hero h1");
      if (!h) return "MISSING";
      return h.innerText.replace(/\n/g, " / ");
    });
    r.checks.headerPos = await page.evaluate(() => getComputedStyle(document.querySelector(".site-header")).position);
    r.checks.floatingHiddenAtTop = (await page.$(".floating-book")) === null;
    r.checks.topOverflow = await overflowX(page);

    // scroll -> floating bar must appear
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
    const fb = await page.$(".floating-book");
    r.checks.floatingAfterScroll = fb !== null;
    if (fb) {
      const b = await fb.boundingBox();
      r.checks.floatingBox = b && { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.y) };
      await page.screenshot({ path: path.join(OUT, `scrolled-${vp.name}.png`) });
    }
    r.checks.scrollOverflow = await overflowX(page);
    r.checks.taps = await tapTargets(page, [".price-row button", ".hero-utilities a", ".menu-btn", ".channel", ".faq-list summary"]);

    // open booking via floating CTA
    await fb.click();
    await page.waitForSelector(".booking-card", { timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, `book1-${vp.name}.png`) });
    const card = await page.$(".booking-card");
    const cb = await card.boundingBox();
    r.checks.modalFits = cb && { h: Math.round(cb.height), vh: vp.h, fits: cb.height <= vp.h + 1 };
    const act = await page.$(".booking-actions .btn-primary");
    const ab = await act.boundingBox();
    r.checks.ctaVisibleNoScroll = ab && ab.y + ab.height <= vp.h + 1;
    r.checks.stepOverflow = await overflowX(page);

    // validation: empty continue
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.waitForTimeout(300);
    r.checks.emptyStepError = (await page.$(".field-error")) !== null;

    // fill step 1
    await page.selectOption("#booking-brand", "TOYOTA");
    await page.fill("#booking-model", "Camry");
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.waitForSelector("#booking-service", { timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, `book2-${vp.name}.png`) });
    await page.selectOption("#booking-service", "Диагностика");
    await page.waitForTimeout(200);
    r.checks.priceHint = await page.evaluate(() => document.querySelector(".price-hint")?.innerText ?? "MISSING");
    r.checks.phoneInputType = await page.evaluate(() => {
      const el = document.querySelector("#booking-service");
      return el ? "service-ok" : "MISSING";
    });
    await page.getByRole("button", { name: "Продолжить" }).click();
    await page.waitForSelector("#booking-name", { timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, `book3-${vp.name}.png`) });
    r.checks.telType = await page.evaluate(() => document.querySelector("#booking-phone")?.getAttribute("type"));
    r.checks.inputMode = await page.evaluate(() => document.querySelector("#booking-phone")?.getAttribute("inputmode"));

    // invalid phone submit
    await page.fill("#booking-name", "Тест");
    await page.fill("#booking-phone", "+7 700");
    await page.check("#booking-consent");
    await page.getByRole("button", { name: "Отправить заявку" }).click();
    await page.waitForTimeout(300);
    r.checks.badPhoneError = (await page.$("#booking-phone-error")) !== null;

    // valid submit
    await page.fill("#booking-phone", "+7 701 234 56 78");
    await page.getByRole("button", { name: "Отправить заявку" }).click();
    await page.waitForSelector(".booking-success", { timeout: 10000 });
    await page.screenshot({ path: path.join(OUT, `success-${vp.name}.png`) });
    r.checks.successText = await page.evaluate(() => document.querySelector(".booking-success")?.innerText.slice(0, 220) ?? "MISSING");
  } catch (e) {
    r.checks.fatal = String(e).slice(0, 300);
    try { await page.screenshot({ path: path.join(OUT, `fatal-${vp.name}.png`) }); } catch {}
  }
  results.push(r);
  await ctx.close();
}

// desktop sticky header pass
{
  const r = { viewport: "desktop-1280", errors: [], failed: [], checks: {} };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push("pageerror: " + String(e).slice(0, 160)));
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".app-stage.is-ready", { timeout: 15000 });
  r.checks.headerPosTop = await page.evaluate(() => getComputedStyle(document.querySelector(".site-header")).position);
  r.checks.scrolledClassTop = await page.evaluate(() => document.querySelector(".site-header").className);
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(400);
  r.checks.scrolledClassAfter = await page.evaluate(() => document.querySelector(".site-header").className);
  r.checks.headerVisibleAfter = await page.evaluate(() => {
    const b = document.querySelector(".site-header").getBoundingClientRect();
    return b.top <= 0 && b.bottom > 0;
  });
  r.checks.headerCtaVisible = await page.evaluate(() => {
    const b = document.querySelector(".header-cta")?.getBoundingClientRect();
    return b ? b.bottom > 0 && b.top < window.innerHeight : "MISSING";
  });
  await page.screenshot({ path: path.join(OUT, "desktop-scrolled.png") });
  results.push(r);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
