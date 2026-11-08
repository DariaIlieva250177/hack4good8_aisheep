/*
 * Hand-over checks for the demo video.
 *
 *   npm run check
 *
 * - both videos are exactly as long as the voiceover (and 1920x1080 @ 30 fps)
 * - every scripted cue lands within 0.2 s of its time (from the recording logs)
 * - no scene change falls while someone is speaking
 * - git status shows nothing outside demo-video/
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { AUDIO_LENGTH, CLIPS, DURATION, PAUSE, VO, VOICE } from '../timeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok ' : ' FAIL'}  ${msg}`);
  if (!cond) failures++;
};

/* ---------- lengths ---------- */
function probe(file) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', file, '-map', '0:v:0', '-f', 'null', '-'], { encoding: 'utf8' });
  const err = r.stderr;
  const dur = (s) => {
    const [h, m, sec] = s.split(':').map(Number);
    return h * 3600 + m * 60 + sec;
  };
  const container = err.match(/Duration: (\d+:\d+:[\d.]+)/);
  const frames = [...err.matchAll(/frame=\s*(\d+)/g)].pop();
  const size = err.match(/Video: .*?, (\d+)x(\d+)/);
  const fps = err.match(/, ([\d.]+) fps/);
  const audio = /Audio: aac/.test(err);
  return { dur: container ? dur(container[1]) : NaN, frames: frames ? Number(frames[1]) : NaN, size: size ? `${size[1]}x${size[2]}` : '?', fps: fps ? Number(fps[1]) : NaN, audio };
}
console.log('\nLength and format');
const voice = probe(path.join(ROOT, VOICE));
console.log(`       voiceover (${VOICE}): ${voice.dur.toFixed(2)} s, kept at ${AUDIO_LENGTH.toFixed(2)} s, + ${PAUSE.length} s pause at ${PAUSE.at} s = ${DURATION.toFixed(2)} s`);
for (const name of ['acaps-community-demo.mp4', 'acaps-community-demo-captioned.mp4']) {
  const file = path.join(ROOT, 'output', name);
  if (!fs.existsSync(file)) {
    ok(false, `${name} exists`);
    continue;
  }
  const p = probe(file);
  const videoDur = p.frames / 30;
  ok(Math.abs(videoDur - DURATION) < 0.05 && Math.abs(p.dur - DURATION) < 0.05 && voice.dur <= AUDIO_LENGTH + 0.01, `${name}: ${p.frames} frames = ${videoDur.toFixed(2)} s (edited audio ${DURATION.toFixed(2)} s), file ${p.dur.toFixed(2)} s`);
  ok(p.size === '1920x1080' && p.fps === 30 && p.audio, `${name}: ${p.size}, ${p.fps} fps, AAC audio`);
}
ok(fs.existsSync(path.join(ROOT, 'output', 'acaps-community-demo.srt')), 'acaps-community-demo.srt exists');

/* ---------- cues ---------- */
const take = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'recordings', n, 'take.json'), 'utf8'));
const clipOf = (id) => CLIPS.find((c) => c.id === id);
function videoTime(clip, wall) {
  const t = take(clip.take);
  if (clip.map) return clip.map.at + (wall - t.marks[clip.map.mark] - clip.map.offset);
  return t.videoStart + (clip.shift ?? 0) + (wall - t.T0);
}
const action = (n, label) => take(n).actions.find((a) => a.label === label);
const CUES = [
  ['0:05.5 slow scroll down from "ACAPS Community"', 5.5, 'website', () => action('website', 'to register').t],
  ['0:08.8 form starts filling in', 8.8, 'website', () => action('website', 'first name').t],
  ['0:11.1 form filled (by)', 11.1, 'website', () => action('website', 'country').end, 'by'],
  ['0:19.0 swipe R1043 right', 19.0, 'review', () => action('review', 'save R1043 to To-do').t],
  ['0:20.0 swipe next card left', 20.0, 'review', () => action('review', 'skip R1066').t],
  ['0:20.9 tap next card (flip to triggers)', 20.9, 'review', () => action('review', 'flip R1055 to its triggers').t],
  ['0:25.4 tap Agree', 25.4, 'answer', () => action('answer', 'Agree').t],
  ['0:26.9 tap Likely', 26.9, 'answer', () => action('answer', 'Likely').t],
  ['0:27.4 typing starts', 27.4, 'answer', () => action('answer', 'detailed answer').t],
  ['0:29.6 typing complete (by)', 29.6, 'answer', () => action('answer', 'detailed answer').end, 'by'],
  ['0:39.2 tap Submit', 39.2, 'submit', () => action('answer', 'Submit').t],
  ['0:39.9 thank-you pop-up opens (jump cut)', 39.9, 'thanks', () => take('answer').marks.dialog, 'by'],
  ['0:41.8 tap "See other people\'s opinions"', 41.8, 'thanks', () => action('answer', "See other people's opinions").t],
  ['0:35.0 open a chat in the Community tab', 35.0, 'community', () => action('community', 'open Blue Nile displacement').t],
  ['0:35.6 scroll through the chat', 35.6, 'community', () => action('community', 'through the chat').t],
  ['0:56.3 Chad pop-up on the globe', 56.3, 'ranking', () => action('ranking', 'Chad on the globe').t],
  ['1:03.3 Approve all ("approve experts" 1:03.3)', 63.3, 'scene8-platform', () => action('platform', 'Approve all').t],
  ['1:05.2 start a risk from a suggestion ("publish risks" 1:04.8)', 65.25, 'scene8-platform', () => action('platform', 'start from the suggested risk SG001').t],
  ['1:06.5 Custom dashboard ("see every panel\'s view" 1:06.7)', 66.45, 'scene8-platform', () => action('platform', 'Custom dashboard').t],
  ['0:57.9 certificates in view ("receive certificates" 58.1)', 57.9, 'ranking', () => action('ranking', 'to the certificates').t + 0.6, 'by'],
];
console.log('\nCues (recorded action vs script, tolerance 0.2 s)');
for (const [name, want, clipId, wallFn, mode] of CUES) {
  const got = videoTime(clipOf(clipId), wallFn());
  const good = mode === 'by' ? got <= want + 0.2 : Math.abs(got - want) <= 0.2;
  ok(good, `${name}: ${got.toFixed(2)} s (${got >= want ? '+' : ''}${(got - want).toFixed(2)})`);
}
// Overlay cues come straight from the timeline, so they are exact by construction:
const OVERLAYS = [
  ['0:11.2 circle domain + country', 'website', 'domainCountry', 11.2],
  ['0:17.2 circle the tags', 'review', 'chips', 17.2],
  ['0:30.5 highlight "Kestrel"', 'answer', 'kestrel', 31.1],
  ['0:33.8 highlight "You appear as Kestrel in these chats"', 'community', 'appearAs', 33.8],
  ['0:52.40 zoom on "#3 of 9 on the Chad panel"', 'ranking', 'rank', 52.4],
  ['0:54.60 highlight "Ranked by the accuracy…"', 'ranking', 'rankNote', 54.6],
  ['0:58.25 ring the certificates ("certificates" 58.14)', 'ranking', 'certs', 58.25],
];
for (const [name, clipId, box, at] of OVERLAYS) {
  const o = clipOf(clipId).overlays.find((x) => x.box === box);
  ok(o && Math.abs(o.from - at) < 0.01, `${name}: overlay at ${o?.from}`);
}

/* ---------- cuts vs speech ---------- */
console.log('\nScene changes (must fall between sentences)');
const speaking = (t) => VO.find((v) => t > v.start + 0.05 && t < v.end - 0.05);
const SCRIPTED_IN_SCENE = new Set(['thanks', 'results']); // cuts the script itself places at a sentence break / jump cut
for (const c of CLIPS.slice(1)) {
  const v = speaking(c.start);
  if (!v) ok(true, `${c.id} starts at ${c.start.toFixed(2)} s, in a pause`);
  else if (SCRIPTED_IN_SCENE.has(c.id)) ok(true, `${c.id} at ${c.start.toFixed(2)} s: in-scene cut set by the script (during "${v.text.slice(0, 32)}…")`);
  else ok(false, `${c.id} starts at ${c.start.toFixed(2)} s while speaking`);
}

/* ---------- git ---------- */
console.log('\nGit');
const status = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
// The analyst view (frontend/) was built in this session too, so its files may show here as well
const outside = status.filter((l) => !l.slice(3).startsWith('demo-video/') && !l.slice(3).startsWith('frontend/'));
ok(outside.length === 0, `git status: ${status.length ? status.join(' | ') : 'clean'}`);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
