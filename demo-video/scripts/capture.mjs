/*
 * Shared recording helpers: a fresh browser, a screencast that saves every
 * frame with its wall-clock time, and an action log (taps, swipes, keys,
 * element boxes) in the same clock, so the edit can line everything up.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright-core';

export const BASE = process.env.BASE_URL ?? 'http://localhost:5174';

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.join(os.homedir(), '.cache', 'ms-playwright');
  const dir = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No Chromium found. Run: npx playwright-core install chromium');
  return path.join(root, dir, 'chrome-linux64', 'chrome');
}

export const VIEWPORTS = {
  // 2x: sharper than the phone appears in 1080p, and the screencast keeps up (~39 fps)
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 },
};

/**
 * A fresh, throwaway browser per viewport kind: no profile, so no password
 * manager, cookie banners or notifications. The scale factor is forced at
 * browser level so the screencast frames come out at full resolution.
 */
export async function launch(kind) {
  return chromium.launch({
    executablePath: chromePath(),
    args: [
      '--no-sandbox',
      '--disable-notifications',
      '--disable-infobars',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      `--force-device-scale-factor=${VIEWPORTS[kind].deviceScaleFactor}`,
    ],
  });
}

/** Start a take: a new context + page and a frame recorder writing into outDir. */
export async function startTake(browser, kind, outDir, { init } = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });
  const ctx = await browser.newContext({ ...VIEWPORTS[kind], locale: 'en-GB', reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('acapsLanguage', 'en');
    } catch {}
  });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const log = { kind, viewport: VIEWPORTS[kind], frames: [], actions: [], marks: {}, boxes: {}, errors };
  let cdp = null;
  let n = 0;
  const vp = VIEWPORTS[kind];

  const now = () => Date.now() / 1000;

  return {
    page,
    log,
    now,
    /** Begin saving frames (call once the page is ready). */
    async record() {
      cdp = await ctx.newCDPSession(page);
      cdp.on('Page.screencastFrame', async (f) => {
        const file = `f${String(n++).padStart(5, '0')}.jpg`;
        fs.writeFileSync(path.join(outDir, 'frames', file), Buffer.from(f.data, 'base64'));
        log.frames.push({ t: f.metadata.timestamp, file });
        try {
          await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
        } catch {}
      });
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 94,
        maxWidth: Math.round(vp.viewport.width * vp.deviceScaleFactor),
        maxHeight: Math.round(vp.viewport.height * vp.deviceScaleFactor),
        everyNthFrame: 1,
      });
      // Nudge a first frame
      await page.evaluate(() => document.body.offsetHeight);
    },
    mark(name) {
      log.marks[name] = now();
    },
    action(type, data = {}) {
      const a = { t: now(), type, ...data };
      log.actions.push(a);
      return a;
    },
    async box(name, selectorOrFn) {
      // A selector, a function run in the page, or [function, argument]
      const b =
        typeof selectorOrFn === 'string'
          ? await page.locator(selectorOrFn).first().boundingBox()
          : Array.isArray(selectorOrFn)
            ? await page.evaluate(selectorOrFn[0], selectorOrFn[1])
            : await page.evaluate(selectorOrFn);
      log.boxes[name] = { ...b, t: now() };
      return b;
    },
    async stop() {
      if (cdp) {
        await cdp.send('Page.stopScreencast').catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      }
      fs.writeFileSync(path.join(outDir, 'take.json'), JSON.stringify(log, null, 1));
      await ctx.close();
      return log;
    },
  };
}

/** Wait until wall-clock second `t` (seconds since epoch). */
export async function until(t) {
  const ms = t * 1000 - Date.now();
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
