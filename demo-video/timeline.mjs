/*
 * The edit, scene by scene, timed to demo-video/voiceover.m4a.
 * All times are seconds in the final video. Change a number here and re-render:
 *
 *   npm run render
 *
 * Clips show a recorded take (recordings/<take>/take.json) inside a phone or
 * browser frame. A take plays in real time from its `videoStart` (see
 * record.mjs); `shift` plays it that many seconds later (used after the audio
 * pause); `map: { at, mark, offset }` instead shows the take from a logged
 * mark (+offset) at video time `at`, which is how the jump cut works.
 *
 * Overlays use element boxes and actions logged while recording, so circles,
 * zooms and tap markers sit exactly on the app's own elements.
 */

/**
 * A short silence inserted into the voiceover after "…if you choose so.", so the
 * community chat can stay on screen longer. Everything after `at` moves later
 * by `length`; times below are written as `n + P` for that reason.
 */
export const PAUSE = { at: 37.5, length: 1.5 };
const P = PAUSE.length;

export const AUDIO_LENGTH = 75.9333; // voiceover.m4a
export const DURATION = AUDIO_LENGTH + P; // 77.433 s = 2323 frames at 30 fps
export const FPS = 30;
export const TEAL = '#0196BA'; // the app's logo / accent blue

/** Voiceover lines (captions and the .srt), timed from a word-level transcript of voiceover.m4a. */
export const VO = [
  { start: 0.86, end: 8.08, text: 'People closest to a crisis often see it coming first. ACAPS Community lets them say so.' },
  { start: 8.88, end: 14.1, text: 'Experts apply on the website, and ACAPS approves each one to keep panels trusted.' },
  { start: 15.18, end: 21.7, text: 'Members get risks matching their country or field. Swipe to save or skip, tap for triggers.' },
  { start: 22.66, end: 29.48, text: 'Answering takes only a minute: agree or disagree, how likely it is, and what you see on the ground.' },
  { start: 30.78, end: 33.1, text: 'You choose how private your identity is.' },
  { start: 33.82, end: 37.12, text: 'Nothing is ever shown to the public if you choose so.' },
  // ---- pause ----
  { start: 38.14 + P, end: 41.52 + P, text: 'You only see others’ answers after giving yours.' },
  { start: 42.46 + P, end: 47.18 + P, text: 'In the final result, experts from that country and field count most.' },
  { start: 48.14 + P, end: 51.42 + P, text: 'Resolved forecasts build a track record.' },
  { start: 52.98 + P, end: 57.44 + P, text: 'The most accurate experts rise to the top and receive certificates.' },
  { start: 59.9 + P, end: 67.5 + P, text: 'ACAPS gets one platform to approve experts, publish risks and see every panel’s view in one place.' },
  { start: 68.94 + P, end: 74.74 + P, text: 'ACAPS Community. Ground truth you can trust. Risks you can forecast.' },
];

/*
 * Clips. `fade` is the cross-fade into the clip (seconds, centred on `start`).
 * Scene changes sit in the pauses between sentences.
 */
export const CLIPS = [
  /* 1-2 Website: hero, a slow scroll down the page from "ACAPS Community", then the form */
  {
    id: 'website',
    scene: '1-2',
    start: 0,
    end: 14.7,
    frame: 'browser',
    take: 'website',
    camera: [
      // gentle push-in on the hero, eased back out as the slow scroll begins
      { t: 0, scale: 1 },
      { t: 5.5, scale: 1.05, ease: 'inOut' },
      { t: 6.4, scale: 1, ease: 'inOut' },
    ],
    overlays: [{ type: 'ring', box: 'domainCountry', from: 11.2, to: 14.55, pad: 14 }],
  },

  /* 3 For review */
  {
    id: 'review',
    scene: '3',
    start: 14.7,
    end: 22.4,
    fade: 0.3,
    frame: 'phone',
    take: 'review',
    overlays: [
      { type: 'pill', text: 'For you: Chad · Conflict', place: 'phoneTop', from: 15.2, to: 22.25 },
      { type: 'ring', box: 'chips', from: 17.2, to: 18.85, pad: 7, shape: 'ellipse' },
      { type: 'actions', from: 14.7, to: 22.4 }, // swipes and the tap, from the recording log
    ],
  },

  /* 4 Answering, and 5 (first half): the line under Submit */
  {
    id: 'answer',
    scene: '4-5',
    start: 22.4,
    end: 33.5,
    fade: 0.3,
    frame: 'phone',
    take: 'answer',
    camera: [
      { t: 22.4, scale: 1 },
      { t: 28.3, scale: 1 },
      { t: 28.9, scale: 1.75, box: 'textarea', ease: 'inOut' }, // "what you see on the ground"
      { t: 29.8, scale: 1.75, box: 'textarea' },
      { t: 30.25, scale: 1, ease: 'inOut' },
      { t: 30.35, scale: 1 },
      { t: 31.0, scale: 2.1, box: 'note', ease: 'inOut' }, // "Shared with your panel as Kestrel…"
      { t: 33.5, scale: 2.1, box: 'note' },
    ],
    overlays: [
      { type: 'actions', from: 22.4, to: 29.6 },
      { type: 'mark', box: 'kestrel', from: 31.1, to: 33.45, pad: 4 },
    ],
  },

  /* 5 (second half): the Community tab, then a panel's chat, held through the pause */
  {
    id: 'community',
    scene: '5',
    start: 33.5,
    end: 37.7 + P,
    fade: 0.2,
    frame: 'phone',
    take: 'community',
    overlays: [
      { type: 'ring', box: 'appearAs', from: 33.8, to: 34.85, pad: 8 }, // "You appear as Kestrel in these chats"
      { type: 'actions', from: 34.5, to: 37.7 + P },
    ],
  },

  /* 6: Submit (the 4 s undo countdown is cut out), thank-you, live discussion */
  {
    id: 'submit',
    scene: '6',
    start: 37.7 + P,
    end: 38.4 + P,
    fade: 0.25,
    frame: 'phone',
    take: 'answer', // continues the answer take in real time (Submit pressed at take time 37.7)
    shift: P,
    overlays: [{ type: 'actions', from: 37.6 + P, to: 38.4 + P }],
  },
  {
    id: 'thanks',
    scene: '6',
    start: 38.4 + P,
    end: 42.7 + P,
    fade: 0.12, // the jump cut over the countdown
    frame: 'phone',
    take: 'answer',
    // Jump cut: the pop-up opens just after this clip starts
    map: { at: 38.4 + P, mark: 'dialog', offset: -0.05 },
    overlays: [{ type: 'actions', from: 38.4 + P, to: 42.7 + P }],
  },

  /* 6: a closed round's final results + weighting */
  {
    id: 'results',
    scene: '6',
    start: 42.7 + P,
    end: 48.0 + P,
    fade: 0.2,
    frame: 'phone',
    take: 'results',
    shift: P,
    phoneX: 760, // leave room for the weighting panel on the right
    overlays: [
      { type: 'pill', text: 'Closed round · South Sudan conflict', place: 'phoneTop', from: 42.8 + P, to: 47.9 + P },
      {
        type: 'panel',
        from: 44.1 + P,
        to: 47.95 + P,
        title: 'Weighted by expertise',
        rows: [
          { k: 'Same country + same domain', v: 'highest weight', strong: true },
          { k: 'Same country only, or same domain only', v: 'lower weight' },
        ],
      },
    ],
  },

  /* 7 Ranking */
  {
    id: 'ranking',
    scene: '7',
    start: 48.0 + P,
    end: 58.7 + P,
    fade: 0.3,
    frame: 'phone',
    take: 'ranking',
    shift: P,
    camera: [
      { t: 48.0 + P, scale: 1 },
      { t: 50.6 + P, scale: 1 },
      { t: 51.2 + P, scale: 1.7, box: 'rank', ease: 'inOut' }, // "#3 of 9 on the Chad panel"
      { t: 52.8 + P, scale: 1.7, box: 'rank' },
      { t: 53.35 + P, scale: 1, ease: 'inOut' },
      { t: 56.4 + P, scale: 1 },
      { t: 56.95 + P, scale: 1.4, box: 'certs', ease: 'inOut' }, // "receive certificates"
      { t: 58.7 + P, scale: 1.4, box: 'certs' },
    ],
    overlays: [
      { type: 'ring', box: 'rank', from: 50.9 + P, to: 52.95 + P, pad: 10 },
      { type: 'ring', box: 'rankNote', from: 53.1 + P, to: 53.95 + P, pad: 8 },
      { type: 'actions', from: 54.5 + P, to: 58.7 + P }, // Chad tap, closing its pop-up, certificate swipe
      { type: 'ring', box: 'certs', from: 56.75 + P, to: 58.6 + P, pad: 8 },
    ],
  },

  /*
   * 8 ACAPS moderator platform: an empty slot for now (plain background, the
   * voiceover keeps playing). To drop in footage later, record a take (e.g.
   * 'platform' in record.mjs with videoStart 58.7) and set:
   *   frame: 'browser', take: 'platform', shift: P
   * then re-render. Nothing else moves.
   */
  { id: 'scene8-platform', scene: '8', start: 58.7 + P, end: 68.1 + P, fade: 0.3, frame: 'none' },

  /* 9 Closing */
  {
    id: 'closing',
    scene: '9',
    start: 68.1 + P,
    end: DURATION,
    fade: 0.3,
    frame: 'none',
    overlays: [
      { type: 'logoAnim', from: 68.5 + P }, // assets/logo-animated.svg: pin drops, wordmark rises with "ACAPS Community"
      { type: 'title', text: 'Ground truth you can trust', line: 1, from: 70.8 + P, to: DURATION + 1 },
      { type: 'title', text: 'Risks you can forecast', line: 2, from: 73.2 + P, to: DURATION + 1 },
    ],
  },
];
