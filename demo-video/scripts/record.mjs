/*
 * Records every take of the ACAPS Community demo from the running dev server.
 * Nothing in the app is changed: the takes only browse and interact.
 *
 *   npm run record            (all takes)
 *   npm run record -- answer  (one take)
 *
 * Each take maps its start to a moment in the video (`videoStart`), and every
 * action is scheduled with `at(videoSecond)`, so it happens on its audio cue.
 * Frames, actions and element boxes are written to recordings/<take>/take.json.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { PNG } from 'pngjs';
import { BASE, launch, startTake, until, sleep } from './capture.mjs';

const ONLY = process.argv[2];

/* ---------- dev server: reuse it, or start it with the project's own command ---------- */
async function ensureServer() {
  const up = async () => {
    try {
      return (await fetch(BASE + '/app/login')).ok;
    } catch {
      return false;
    }
  };
  if (await up()) return null;
  const port = new URL(BASE).port || '5174';
  console.log(`Starting the dev server (npm run dev -- --port ${port})…`);
  const proc = spawn('npm', ['run', 'dev', '--', '--port', port, '--strictPort'], {
    cwd: new URL('../../frontend/', import.meta.url),
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(1000);
  return proc;
}

/* ---------- helpers that run inside the page ---------- */

/** Eased scroll of `scroller` (CSS selector, or 'window') to scrollTop `y` over `ms`. */
function smoothScroll(page, scroller, y, ms) {
  return page.evaluate(
    ([scroller, y, ms]) =>
      new Promise((resolve) => {
        const el = scroller === 'window' ? null : document.querySelector(scroller);
        const get = () => (el ? el.scrollTop : window.scrollY);
        const set = (v) => (el ? el.scrollTo({ top: v, behavior: 'instant' }) : window.scrollTo({ top: v, behavior: 'instant' }));
        const from = get();
        const t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          set(from + (y - from) * ease(k));
          if (k < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    [scroller, y, ms],
  );
}

/** scrollTop that puts `sel`'s top `offset` px below the top of the scroller. */
function scrollTarget(page, scroller, sel, offset) {
  return page.evaluate(
    ([scroller, sel, offset]) => {
      const el = scroller === 'window' ? null : document.querySelector(scroller);
      const cur = el ? el.scrollTop : window.scrollY;
      const top = el ? el.getBoundingClientRect().top : 0;
      return cur + document.querySelector(sel).getBoundingClientRect().top - top - offset;
    },
    [scroller, sel, offset],
  );
}

/** Union of the boxes of several selectors (viewport CSS px). */
const unionBox = (sels) => [
  (sels) => {
    const rs = sels.map((s) => document.querySelector(s).getBoundingClientRect());
    const x = Math.min(...rs.map((r) => r.left));
    const y = Math.min(...rs.map((r) => r.top));
    return { x, y, width: Math.max(...rs.map((r) => r.right)) - x, height: Math.max(...rs.map((r) => r.bottom)) - y };
  },
  sels,
];

/* ---------- shared interactions (all logged) ---------- */

async function tap(take, x, y, label) {
  take.action('tap', { x, y, label });
  await take.page.mouse.move(x, y);
  await take.page.mouse.down();
  await sleep(70);
  await take.page.mouse.up();
}

async function tapEl(take, selector, label) {
  const b = await take.page.locator(selector).first().boundingBox();
  await tap(take, b.x + b.width / 2, b.y + b.height / 2, label);
  return b;
}

/** Smooth horizontal swipe from the card centre, about 0.33 s. */
async function swipe(take, dir, label) {
  const b = await take.page.locator('.card-stack__front').first().boundingBox();
  const x0 = b.x + b.width / 2;
  const y0 = b.y + b.height * 0.45;
  const dist = 230 * dir;
  const a = take.action('swipe', { x: x0, y: y0, dx: dist, label });
  await take.page.mouse.move(x0, y0);
  await take.page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await take.page.mouse.move(x0 + dist * (1 - Math.pow(1 - k, 2)), y0 + 6 * k);
    await sleep(26);
  }
  await take.page.mouse.up();
  a.end = take.now();
}

/**
 * Types like a person: one key at a time, every keystroke logged. Keys are
 * paced on the clock (`msPerChar` apart), so slow key events never make the
 * typing overrun its cue; `endBy` (wall seconds) squeezes the pace to finish
 * in time.
 */
async function typeText(take, text, msPerChar, label, endBy) {
  const a = take.action('type', { label, text, keys: [] });
  const start = take.now();
  const step = endBy ? Math.min(msPerChar / 1000, (endBy - start) / text.length) : msPerChar / 1000;
  for (let i = 0; i < text.length; i++) {
    await until(start + i * step);
    a.keys.push(take.now());
    await take.page.keyboard.type(text[i]);
  }
  a.end = take.now();
}

/* ---------- the takes ---------- */

/**
 * Run a take: open `url`, prepare, start recording, then call `script` with
 * `at(videoSecond)` to schedule actions against the voiceover.
 */
async function runTake(name, { kind, url, videoStart, prepare, script, init }) {
  if (ONLY && ONLY !== name) return;
  const browser = await launch(kind);
  const take = await startTake(browser, kind, `recordings/${name}`, { init });
  await take.page.goto(BASE + url, { waitUntil: 'networkidle' });
  await sleep(2600); // loading splash fades, images and the globe load
  if (prepare) await prepare(take);
  await take.record();
  await sleep(400);
  const T0 = take.now() + 0.3;
  take.log.videoStart = videoStart;
  take.log.T0 = T0;
  const at = (videoSecond) => until(T0 + (videoSecond - videoStart));
  take.at = at;
  await at(videoStart);
  take.mark('start');
  await script(take, at);
  await sleep(500);
  const log = await take.stop();
  await browser.close();
  console.log(`${name}: ${log.frames.length} frames, ${log.actions.length} actions${log.errors.length ? ', page errors: ' + log.errors.join('; ') : ''}`);
}

const PHONE_SCROLLER = '#device-screen';

const server = await ensureServer();

/* Scenes 1-2: website hero, then the application form (0:00.0-0:14.7) */
await runTake('website', {
  kind: 'desktop',
  url: '/',
  videoStart: 0,
  prepare: async (take) => {
    await take.box('logo', '.web-nav__logo');
  },
  script: async (take, at) => {
    // From "ACAPS Community": a slow scroll down the page to the application form
    await at(5.5);
    const y = await scrollTarget(take.page, 'window', '#register', 96);
    take.action('scroll', { label: 'to register', y });
    await smoothScroll(take.page, 'window', y, 3150);
    take.mark('scrolled');
    const field = (sel) => take.page.locator(sel).first();
    await at(8.8);
    await field('.reg input[autocomplete="given-name"]').click();
    await typeText(take, 'Amina', 30, 'first name');
    await at(9.05);
    await field('.reg input[autocomplete="family-name"]').click();
    await typeText(take, 'Haroun', 26, 'last name');
    await at(9.35);
    await field('.reg input[type="email"]').click();
    await typeText(take, 'amina.haroun@example.org', 22, 'email');
    await at(10.25);
    take.action('select', { label: 'domain: Conflict' });
    await field('.reg select').selectOption('conflict');
    await at(10.5);
    await field('.reg input[autocomplete="country-name"]').click();
    await typeText(take, 'Chad', 40, 'country');
    await take.page.mouse.move(5, 5); // keep the pointer out of the frame's way
    await take.page.evaluate(() => document.activeElement?.blur()); // no focus ring under the highlight
    await take.box('domainCountry', unionBox(['.reg__group:nth-of-type(1)', '.reg__group:nth-of-type(2)']));
    await take.box('domains', '.reg__group >> nth=0');
    await take.box('countries', '.reg__group >> nth=1');
    await at(14.9);
  },
});

/* Scene 3: For review in the app (0:14.7-0:22.4) */
await runTake('review', {
  kind: 'phone',
  url: '/app/risks',
  videoStart: 14.7,
  prepare: async (take) => {
    // Just the two tags ("Conflict", "Eastern Chad"), not the whole row
    await take.box('chips', unionBox(['.card-stack__front .risk-card__chip:nth-child(1)', '.card-stack__front .risk-card__chip:nth-child(2)']));
    await take.box('deck', '.card-stack__deck');
  },
  script: async (take, at) => {
    await at(19.0);
    await swipe(take, 1, 'save R1043 to To-do');
    await at(20.0);
    await swipe(take, -1, 'skip R1066');
    await at(20.9);
    const front = await take.page.evaluate(() => {
      const mid = window.innerWidth / 2;
      const cards = [...document.querySelectorAll('.card-stack__front')].map((el) => el.getBoundingClientRect());
      const r = cards.sort((a, b) => Math.abs(a.left + a.width / 2 - mid) - Math.abs(b.left + b.width / 2 - mid))[0];
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.45 };
    });
    await tap(take, front.x, front.y, 'flip R1055 to its triggers');
    await take.page.mouse.move(5, 5);
    await at(22.6);
  },
});

/* Scenes 4, 5 (first half) and 6 (submit, thank-you, live discussion) on R1043 */
await runTake('answer', {
  kind: 'phone',
  url: '/app/answer/R1043',
  videoStart: 22.4,
  script: async (take, at) => {
    const page = take.page;
    // Bring the answer form into view (question, buttons, slider, text box)
    await at(23.5);
    const y1 = await scrollTarget(page, PHONE_SCROLLER, '.answer__form', 72);
    take.action('scroll', { label: 'to the form', y: y1 });
    await smoothScroll(page, PHONE_SCROLLER, y1, 1000);
    await take.box('agree', '.verdicts__btn >> nth=0');
    await take.box('slider', '.seg__track');
    await at(25.4);
    await tapEl(take, '.verdicts__btn >> nth=0', 'Agree');
    await at(26.9);
    await tapEl(take, '.seg__option >> nth=3', 'Likely');
    await at(27.4);
    await page.locator('.answer__textarea textarea').click();
    take.action('focus', { label: 'text box' });
    await typeText(
      take,
      'Clashes near the border pushed new arrivals into Adré this week.',
      45,
      'detailed answer',
      take.log.T0 + (29.4 - take.log.videoStart),
    );
    take.mark('typed');
    await take.box('textarea', '.answer__textarea');
    await page.mouse.move(5, 5);
    // Between sentences: bring Submit and the line under it into view
    await at(29.7);
    const y2 = await scrollTarget(page, PHONE_SCROLLER, '.answer__note', 560);
    take.action('scroll', { label: 'to submit', y: y2 });
    await smoothScroll(page, PHONE_SCROLLER, y2, 420);
    await take.box('note', '.answer__note');
    await take.box('kestrel', () => {
      const p = document.querySelector('.answer__note');
      const node = [...p.childNodes].find((n) => n.nodeType === 3 && n.textContent.includes('Kestrel'));
      const r = document.createRange();
      const i = node.textContent.indexOf('Kestrel');
      r.setStart(node, i);
      r.setEnd(node, i + 'Kestrel'.length);
      const b = r.getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    await take.box('submit', '.answer__submit');

    // Scene 6: Submit (a 4 s undo countdown runs; the edit jump-cuts over it)
    await at(37.7);
    const sb = await page.locator('.answer__submit').boundingBox();
    take.action('tap', { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2, label: 'Submit' });
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await sleep(70);
    await page.mouse.up();
    take.mark('submit');
    await page.mouse.move(5, 5); // off the button: hovering would pause the countdown
    await page.locator('.message-dialog[open]').waitFor({ timeout: 8000 });
    take.mark('dialog');
    const D = take.log.marks.dialog;
    // The edit shows the pop-up from video 38.4 (= D - 0.05); tap lands on 40.3
    await until(D - 0.05 + (40.3 - 38.4));
    await take.box('seeOthers', '.message-dialog__link >> nth=0');
    await tapEl(take, '.message-dialog__link >> nth=0', "See other people's opinions");
    take.mark('community');
    await sleep(2800);
  },
});

/* Scene 5 (second half): the Community tab, then scrolling through a chat (0:33.5-0:37.7) */
await runTake('community', {
  kind: 'phone',
  url: '/app/community',
  videoStart: 33.5,
  prepare: async (take) => {
    await take.box('appearAs', '.community__as'); // "You appear as Kestrel in these chats"
    await take.box('chatRow', 'a.chat-row >> nth=1');
  },
  script: async (take, at) => {
    const page = take.page;
    await at(34.95);
    await tapEl(take, 'a.chat-row >> nth=1', 'open Blue Nile displacement');
    await page.mouse.move(5, 5);
    await page.locator('.answer-item').first().waitFor({ timeout: 4000 });
    take.mark('chat');
    // Scroll down to how others answered (Heron's post, Kestrel's comment), then hold there
    await at(35.55);
    const y = await scrollTarget(page, PHONE_SCROLLER, '#others-answers', 205);
    take.action('scroll', { label: 'through the chat', y });
    await smoothScroll(page, PHONE_SCROLLER, y, 1750);
    await at(39.4); // the edit holds this view through the 1.5 s audio pause
  },
});

/* Scene 6 (second half): a closed round's final results (0:42.7-0:48.0) */
await runTake('results', {
  kind: 'phone',
  url: '/app/community/R1037',
  videoStart: 42.7,
  prepare: async (take) => {
    const y = await scrollTarget(take.page, PHONE_SCROLLER, '#ended-results', 64);
    await smoothScroll(take.page, PHONE_SCROLLER, y, 10);
    await sleep(300);
    await take.box('results', unionBox(['#ended-results']));
    await take.box('resultsCard', '#ended-results + .ended-card');
  },
  script: async (take, at) => {
    await at(48.2);
  },
});

/* Scene 7: Ranking (0:48.0-0:58.7) */
await runTake('ranking', {
  kind: 'phone',
  url: '/app/ranking',
  videoStart: 48.0,
  prepare: async (take) => {
    await sleep(1500); // globe data
    await take.box('rank', unionBox(['.lx-eyebrow', '.lx-rank', '.lx-panel']));
    await take.box('rankNote', '.lx-hero .lx-note');
  },
  script: async (take, at) => {
    const page = take.page;
    // "rise to the top": the contributions globe
    await at(53.95);
    const y1 = await scrollTarget(page, PHONE_SCROLLER, '.contrib-map', 150);
    take.action('scroll', { label: 'to the globe', y: y1 });
    await smoothScroll(page, PHONE_SCROLLER, y1, 520);
    // Find Chad's pin on the canvas: the solid logo-blue dots; Chad and Sudan are the
    // two largest, and Chad is the western one
    const canvas = page.locator('.contrib-map canvas');
    const cb = await canvas.boundingBox();
    const png = PNG.sync.read(await canvas.screenshot({ scale: 'css' }));
    const seen = new Uint8Array(png.width * png.height);
    const isPin = (i) => {
      const r = png.data[i * 4], g = png.data[i * 4 + 1], b = png.data[i * 4 + 2];
      return Math.abs(r - 1) + Math.abs(g - 150) + Math.abs(b - 186) < 40;
    };
    const blobs = [];
    for (let i = 0; i < png.width * png.height; i++) {
      if (seen[i] || !isPin(i)) continue;
      const stack = [i];
      seen[i] = 1;
      let n = 0, sx = 0, sy = 0;
      while (stack.length) {
        const j = stack.pop();
        n++;
        sx += j % png.width;
        sy += Math.floor(j / png.width);
        for (const k of [j - 1, j + 1, j - png.width, j + png.width]) {
          if (k >= 0 && k < seen.length && !seen[k] && isPin(k)) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
      blobs.push({ n, x: sx / n, y: sy / n });
    }
    blobs.sort((a, b) => b.n - a.n);
    const two = blobs.slice(0, 2).sort((a, b) => a.x - b.x);
    const chad = two[0];
    take.log.pinSearch = { blobs: blobs.slice(0, 6), chad };
    await at(54.8);
    await tap(take, cb.x + chad.x, cb.y + chad.y, 'Chad on the globe');
    await page.mouse.move(5, 5);
    await sleep(250);
    if (await page.locator('.globe-balloon').count()) await take.box('balloon', '.globe-balloon');
    // Close the Chad pop-up, then back up to the certificates for "...and receive certificates"
    await at(55.55);
    if (await page.locator('.globe-balloon__close').count()) {
      await tapEl(take, '.globe-balloon__close', 'close the Chad pop-up');
      await page.mouse.move(5, 5);
    }
    await at(55.8);
    const y2 = await scrollTarget(page, PHONE_SCROLLER, '#lx-certs', 250);
    take.action('scroll', { label: 'to the certificates', y: y2 });
    await smoothScroll(page, PHONE_SCROLLER, y2, 600);
    await take.box('certs', unionBox(['.lx-head:has(#lx-certs)', '.lx-cert']));
    await take.box('cert', '.lx-cert >> nth=0');
    // Swipe the carousel on to the next certificate
    await at(57.45);
    const cert = await take.page.locator('.lx-cert >> nth=0').boundingBox();
    const sw = take.action('swipe', { x: cert.x + cert.width * 0.7, y: cert.y + cert.height / 2, dx: -170, label: 'next certificate' });
    await page.evaluate(() => {
      const row = document.querySelector('.lx-certs');
      const cards = row.querySelectorAll('.lx-cert');
      row.scrollBy({ left: cards[1].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
    });
    await sleep(450);
    sw.end = take.now();
    await at(58.9);
  },
});

/*
 * Scene 8: the ACAPS analyst view (desktop). Times are in the voiceover's own clock; the edit
 * plays this take 1.5 s later (after the pause). Cues from the word timings of the voiceover:
 * "approve experts" 61.8, "publish risks" 63.34, "see every panel's view in one place" 65.16.
 */
await runTake('platform', {
  kind: 'desktop',
  url: '/analyst/approve',
  videoStart: 58.7,
  script: async (take, at) => {
    const page = take.page;
    // "…to approve experts": approve every item for the first applicant and send the decision
    await at(61.75);
    await tapEl(take, 'button:has-text("Approve all")', 'Approve all');
    await at(62.45);
    await tapEl(take, 'button:has-text("Send decision")', 'Send decision');
    await page.mouse.move(5, 5);
    // "publish risks": Upload a risk, started from an expert's suggested risk
    await at(63.15);
    await tapEl(take, '.av-nav__actions a.top-btn.primary', 'Upload a risk');
    await page.locator('#upFrom').waitFor();
    await at(63.75);
    take.action('select', { label: 'start from the suggested risk SG001' });
    await page.locator('#upFrom').selectOption('SG001');
    await page.mouse.move(5, 5);
    await sleep(150);
    await take.box('preview', '.prev');
    // "see every panel's view in one place": the custom dashboard
    await at(64.95);
    await tapEl(take, '.pill-nav a:has-text("Custom dashboard")', 'Custom dashboard');
    await page.mouse.move(5, 5);
    await page.locator('.db-card').first().waitFor();
    await at(66.4);
    const y = 330;
    take.action('scroll', { label: 'down the dashboard', y });
    await smoothScroll(page, '.pn', y, 1600);
    await at(69.0);
  },
});

if (server) process.kill(-server.pid);
console.log('Recorded.');
