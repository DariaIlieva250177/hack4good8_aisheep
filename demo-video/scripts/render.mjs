/*
 * Renders the demo video from timeline.mjs + recordings/ into output/.
 *
 *   npm run render                 both videos + .srt
 *   npm run render -- --stills     one still from the middle of each scene (output/stills/)
 *   npm run render -- --from 14 --to 23 --preview   a quick partial render (output/preview.mp4)
 *
 * Each 1920x1080 frame is drawn by edit/compose.html in a headless browser and
 * piped into ffmpeg; the voiceover is the audio track from 0:00.0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { launch } from '../scripts/capture.mjs';
import { CLIPS, DURATION, FPS, PAUSE, TEAL, VO } from '../timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'output');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const num = (f, d) => (args.includes(f) ? Number(args[args.indexOf(f) + 1]) : d);

const TOTAL = Math.round(DURATION * FPS); // 2323 frames
const C = { x: 960, y: 540 };

/* ---------- recordings ---------- */
const takes = {};
for (const c of CLIPS) {
  if (c.take && !takes[c.take]) {
    const file = path.join(ROOT, 'recordings', c.take, 'take.json');
    if (!fs.existsSync(file)) throw new Error(`Missing recording "${c.take}". Run: npm run record`);
    takes[c.take] = JSON.parse(fs.readFileSync(file, 'utf8'));
    takes[c.take].dir = path.join(ROOT, 'recordings', c.take, 'frames');
  }
}

/* ---------- maths ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;

/** Wall-clock time in the take for video time t. */
function wallFor(clip, t) {
  const tk = takes[clip.take];
  if (clip.map) return tk.marks[clip.map.mark] + clip.map.offset + (t - clip.map.at);
  return tk.T0 + (t - (clip.shift ?? 0) - tk.videoStart);
}
/** Video time for a wall-clock time in the take (inverse of wallFor). */
function videoFor(clip, w) {
  const tk = takes[clip.take];
  if (clip.map) return clip.map.at + (w - tk.marks[clip.map.mark] - clip.map.offset);
  return tk.videoStart + (clip.shift ?? 0) + (w - tk.T0);
}
function frameFile(take, w) {
  const fr = take.frames;
  let lo = 0;
  let hi = fr.length - 1;
  if (w <= fr[0].t) return path.join(take.dir, fr[0].file);
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (fr[mid].t <= w) lo = mid;
    else hi = mid - 1;
  }
  return path.join(take.dir, fr[lo].file);
}

/* ---------- frame geometry (video px, before the camera) ---------- */
function baseGeometry(clip) {
  if (clip.frame === 'phone') {
    const s = 920 / 844; // CSS px -> video px
    const w = 390 * s;
    const cx = clip.phoneX ?? 960;
    const screen = { x: cx - w / 2, y: 80, w, h: 920 };
    return { kind: 'phone', s, screen, origin: { x: screen.x, y: screen.y } };
  }
  if (clip.frame === 'browser') {
    const k = 1520 / 1440;
    const box = { x: 200, y: 45, w: 1520, h: 990 };
    return { kind: 'browser', s: k, box, barH: 40, origin: { x: 200, y: 85 } };
  }
  return { kind: 'none', s: 1, origin: { x: 0, y: 0 } };
}

/** CSS box (from the take log) -> video rect before the camera. */
function boxToVideo(g, b) {
  return { x: g.origin.x + b.x * g.s, y: g.origin.y + b.y * g.s, w: b.width * g.s, h: b.height * g.s };
}

/** Camera at time t: { s, f } where points map as (P - f) * s + C. */
function cameraAt(clip, g, t) {
  const keys = clip.camera ?? [{ t: clip.start, scale: 1 }];
  const focusOf = (k) => {
    if (!k.box) return { ...C };
    const r = boxToVideo(g, takes[clip.take].boxes[k.box]);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  };
  if (t <= keys[0].t) return { s: keys[0].scale, f: focusOf(keys[0]) };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= b.t) {
      const k = b.ease ? inOut(clamp((t - a.t) / (b.t - a.t))) : clamp((t - a.t) / (b.t - a.t));
      const fa = focusOf(a);
      const fb = focusOf(b);
      // focus moves as the zoom grows, so a zoom of 1 is always the plain view
      return { s: lerp(a.scale, b.scale, k), f: { x: lerp(fa.x, fb.x, k), y: lerp(fa.y, fb.y, k) } };
    }
  }
  const last = keys.at(-1);
  return { s: last.scale, f: focusOf(last) };
}
const cam = (c, p) => ({ x: (p.x - c.f.x) * c.s + C.x, y: (p.y - c.f.y) * c.s + C.y });
const camRect = (c, r) => {
  const p = cam(c, r);
  return { x: p.x, y: p.y, w: r.w * c.s, h: r.h * c.s };
};

/** 0..1 visibility of an overlay shown from `from` to `to`, easing in/out. */
function vis(t, from, to, fin = 0.35, fout = 0.3) {
  if (t < from || t > to) return 0;
  return Math.min(clamp((t - from) / fin), clamp((to - t) / fout));
}

/* ---------- overlays (HTML strings, screen coordinates) ---------- */
function overlaysFor(clip, g, c, t) {
  const out = [];
  const tk = clip.take ? takes[clip.take] : null;
  for (const o of clip.overlays ?? []) {
    if (o.type === 'ring' || o.type === 'mark') {
      const v = vis(t, o.from, o.to);
      if (!v) continue;
      const r = camRect(c, boxToVideo(g, tk.boxes[o.box]));
      const pad = o.pad ?? 10;
      // A steady outline that simply fades in and out (no scaling, so it never wobbles)
      const w = r.w + 2 * pad;
      const h = r.h + 2 * pad;
      const x = r.x + r.w / 2 - w / 2;
      const y = r.y + r.h / 2 - h / 2;
      const cls = o.type === 'mark' ? 'mark' : `ring${o.shape === 'ellipse' ? ' ellipse' : ''}`;
      out.push(`<div class="${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;opacity:${v}"></div>`);
    } else if (o.type === 'pill') {
      const v = vis(t, o.from, o.to, 0.4, 0.3);
      if (!v) continue;
      // 'phoneTop': centred just above the phone, so it never covers the app's own text
      const r = o.place === 'phoneTop' ? camRect(c, g.screen) : camRect(c, boxToVideo(g, tk.boxes[o.anchor]));
      const lift = o.place === 'phoneTop' ? 13 * c.s + 8 : 14;
      const y = r.y - lift + (1 - inOut(clamp((t - o.from) / 0.4))) * 10;
      out.push(`<div class="pill" style="left:${r.x + r.w / 2}px;top:${y}px;opacity:${v}">${o.text}</div>`);
    } else if (o.type === 'panel') {
      const v = vis(t, o.from, o.to, 0.5, 0.3);
      if (!v) continue;
      const scr = camRect(c, g.screen);
      const x = scr.x + scr.w + 90 + (1 - inOut(clamp((t - o.from) / 0.5))) * 40;
      const rows = o.rows
        .map((r, i) => {
          const rv = clamp((t - o.from - 0.35 - i * 0.35) / 0.4);
          return `<div class="row" style="opacity:${rv}"><span class="k">${r.k}</span><span class="v${r.strong ? ' strong' : ''}">${r.v}</span></div>`;
        })
        .join('');
      // Big condensed, slanted headline that overlaps the top of the card
      const tk2 = inOut(clamp((t - o.from) / 0.55));
      const title = `<div class="headline" style="transform:translateX(${(1 - tk2) * -36}px) skewX(-9deg);opacity:${tk2}">${o.title}</div>`;
      out.push(`<div class="panel-group" style="left:${x}px;top:${C.y - 250}px;opacity:${v}">${title}<div class="panel">${rows}</div></div>`);
    } else if (o.type === 'actions') {
      for (const a of tk.actions) {
        if (a.type !== 'tap' && a.type !== 'swipe') continue;
        const va = videoFor(clip, a.t);
        if (va < o.from - 0.01 || va > o.to) continue;
        if (a.type === 'tap') {
          const d = t - va;
          if (d < -0.08 || d > 0.7) continue;
          const p = cam(c, { x: g.origin.x + a.x * g.s, y: g.origin.y + a.y * g.s });
          const k = clamp((d + 0.08) / 0.18);
          const fade = 1 - clamp((d - 0.35) / 0.35);
          const wave = clamp(d / 0.6);
          out.push(`<div class="tap" style="left:${p.x}px;top:${p.y}px;width:${46 * (0.7 + 0.3 * k)}px;height:${46 * (0.7 + 0.3 * k)}px;opacity:${fade}">
            <div class="dot"></div><div class="wave" style="transform:scale(${1 + wave * 1.3});opacity:${1 - wave}"></div></div>`);
        } else {
          const ve = videoFor(clip, a.end ?? a.t + 0.4);
          if (t < va - 0.08 || t > ve + 0.3) continue;
          const k = inOut(clamp((t - va) / (ve - va)));
          const p = cam(c, { x: g.origin.x + (a.x + a.dx * k) * g.s, y: g.origin.y + a.y * g.s });
          const fade = Math.min(clamp((t - va + 0.08) / 0.1), 1 - clamp((t - ve) / 0.3));
          out.push(`<div class="tap" style="left:${p.x}px;top:${p.y}px;width:46px;height:46px;opacity:${fade}"><div class="dot"></div></div>`);
        }
      }
    }
  }
  return out;
}

/* ---------- closing / title elements (no frame) ---------- */
const LOGO_ANIM = fs
  .readFileSync(path.join(ROOT, 'assets', 'logo-animated.svg'), 'utf8')
  .replace(/<metadata>[\s\S]*?<\/metadata>/, '');
function titleOverlays(clip, t) {
  const out = [];
  for (const o of clip.overlays ?? []) {
    if (o.type === 'title') {
      const k = inOut(clamp((t - o.from) / 0.6));
      if (!k) continue;
      const top = o.line === 1 ? 600 : 690;
      const color = o.line === 1 ? TEAL : '#14202b';
      out.push(`<div class="title" style="top:${top + (1 - k) * 16}px;font-size:64px;color:${color};opacity:${k}">${o.text}</div>`);
    }
  }
  return out;
}

/* ---------- one frame ---------- */
function stateAt(t, captions) {
  const layers = [];
  const extra = [];
  let logo = null;
  CLIPS.forEach((clip, i) => {
    const next = CLIPS[i + 1];
    const fin = clip.fade ?? 0;
    const fout = next?.fade ?? 0;
    const from = clip.start - fin / 2;
    const to = clip.end + fout / 2;
    if (t < from || t >= to) return;
    const opacity = fin ? clamp((t - from) / fin) : 1;
    const g = baseGeometry(clip);
    if (g.kind === 'none') {
      const la = clip.overlays?.find((o) => o.type === 'logoAnim');
      // The animated logo plays its own CSS animation, seeked to this frame's time
      if (la && t >= la.from) logo = { t: t - la.from, opacity };
      if (clip.overlays) extra.push(`<div class="layer" style="opacity:${opacity}">${titleOverlays(clip, t).join('')}</div>`);
      // an empty slot (scene 8): the background alone
      return;
    }
    const tk = takes[clip.take];
    const src = pathToFileURL(frameFile(tk, wallFor(clip, t))).href;
    const c = cameraAt(clip, g, t);
    const L = { frame: g.kind, opacity, src, overlays: overlaysFor(clip, g, c, t) };
    if (g.kind === 'phone') {
      L.screen = camRect(c, g.screen);
      L.bezel = 13 * c.s;
      L.radius = 50 * c.s;
    } else {
      L.box = camRect(c, g.box);
      L.k = c.s;
      L.barH = g.barH * c.s;
      L.content = null;
    }
    layers.push(L);
  });
  const vo = captions ? VO.find((v) => t >= v.start && t < v.end) : null;
  return { layers, extra, logo, caption: vo ? vo.text : '' };
}

/* ---------- output ---------- */
function srt() {
  const ts = (s) => {
    const ms = Math.round(s * 1000);
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
  };
  return VO.map((v, i) => `${i + 1}\n${ts(v.start)} --> ${ts(v.end)}\n${v.text}\n`).join('\n');
}

/** The voiceover with PAUSE inserted (silence), written once to frames/voiceover-paused.wav. */
const AUDIO = path.join(ROOT, 'frames', 'voiceover-paused.wav');
async function buildAudio() {
  fs.mkdirSync(path.dirname(AUDIO), { recursive: true });
  const { at, length } = PAUSE;
  const graph =
    `[0:a]atrim=0:${at},asetpts=N/SR/TB[a];[0:a]atrim=start=${at},asetpts=N/SR/TB[b];` +
    `anullsrc=r=48000:cl=mono,atrim=0:${length}[s];[a][s][b]concat=n=3:v=0:a=1[out]`;
  const p = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-i', path.join(ROOT, 'voiceover.m4a'), '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-ac', '1', AUDIO], { stdio: 'inherit' });
  await new Promise((res, rej) => p.on('close', (c) => (c ? rej(new Error('audio edit failed')) : res())));
}

function encoder(file, withAudio, from, to) {
  const a = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (withAudio) a.push('-ss', String(from), '-i', AUDIO);
  a.push('-map', '0:v');
  if (withAudio) a.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad');
  a.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS));
  a.push('-t', (to - from).toFixed(4), '-movflags', '+faststart', file);
  const p = spawn(ffmpegPath, a, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  const done = new Promise((res, rej) => p.on('close', (code) => (code ? rej(new Error(err.slice(-2000))) : res())));
  return { stdin: p.stdin, done };
}
const write = (stream, buf) => new Promise((res) => (stream.write(buf) ? res() : stream.once('drain', res)));

fs.mkdirSync(OUT, { recursive: true });
await buildAudio();
const browser = await launch('desktop'); // device scale doesn't matter: frames are 1920x1080 CSS px at 1x
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(path.join(ROOT, 'edit', 'compose.html')).href);
await page.evaluate((svg) => window.setLogo(svg), LOGO_ANIM);
await page.evaluate(() => document.fonts.ready);

const shot = async (t, captions) => {
  await page.evaluate((s) => window.draw(s), stateAt(t, captions));
  return page.screenshot({ type: 'jpeg', quality: 95 });
};

if (flag('--stills')) {
  // One still from the middle of each scene
  const dir = path.join(OUT, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const scenes = [
    ['1-hero', 4.0], ['2-application', 12.5], ['3-for-review', 18.0], ['4-answering', 29.0], ['5-community', 38.3],
    ['6-group-view', 47.0], ['7-track-record', 58.7], ['8-platform-slot', 64.9], ['9-closing', 77.0],
  ];
  for (const [name, t] of scenes) fs.writeFileSync(path.join(dir, `${name}.jpg`), await shot(t, false));
  for (const t of args.filter((a) => /^\d+(\.\d+)?$/.test(a)).map(Number)) fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.jpg`), await shot(t, true));
  console.log('Stills in', dir);
} else {
  const from = num('--from', 0);
  const to = num('--to', DURATION);
  const preview = flag('--preview');
  const first = Math.round(from * FPS);
  const last = Math.min(TOTAL, Math.round(to * FPS));
  const plain = encoder(path.join(OUT, preview ? 'preview.mp4' : 'acaps-community-demo.mp4'), true, from, to);
  const capped = preview ? null : encoder(path.join(OUT, 'acaps-community-demo-captioned.mp4'), true, from, to);
  const t0 = Date.now();
  for (let i = first; i < last; i++) {
    const t = i / FPS;
    await write(plain.stdin, await shot(t, preview));
    if (capped) await write(capped.stdin, await shot(t, true));
    if (i % 150 === 0) console.log(`frame ${i}/${last} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  plain.stdin.end();
  capped?.stdin.end();
  await plain.done;
  await capped?.done;
  if (!preview) fs.writeFileSync(path.join(OUT, 'acaps-community-demo.srt'), srt());
  console.log('Rendered in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}
await browser.close();
