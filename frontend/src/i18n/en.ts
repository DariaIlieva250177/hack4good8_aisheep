import type { Family, ImageCategory, NotificationKind, RiskLevel, Verdict } from '../data/types';

const n = (v: number) => v.toLocaleString('en-GB');

export const en = {
  appName: 'AI Sheep',

  levels: {
    High: 'High risk',
    Medium: 'Medium risk',
    Low: 'Low risk',
  } satisfies Record<RiskLevel, string>,

  families: {
    conflict: 'Conflict',
    political: 'Political',
    economic: 'Economic',
    hydromet: 'Hydrometeorological',
    geophysical: 'Geophysical',
    environmental: 'Environmental',
    technological: 'Technological',
    health: 'Health',
    fallback: 'Other',
  } satisfies Record<Family, string>,

  imageAlt: {
    default: 'Illustration: an empty block of sandy terrain with a faint path across it',
    border: 'Illustration: a closed boom barrier across an empty sandy road',
    conflict: 'Illustration: a low wall of sandbags beside a dirt track',
    displacement: 'Illustration: three plain tents close together on dry ground',
    political: 'Illustration: an empty ballot box on a small table',
    economic: 'Illustration: a market balance scale with one empty pan',
    food: 'Illustration: a half-empty grain sack, slightly slumped',
    health: 'Illustration: a closed medical cool box',
    flood: 'Illustration: a small house with water up to its windows',
    drought: 'Illustration: cracked dry soil with one dead stalk',
    storm: 'Illustration: a palm tree bent hard by wind on a coastal block',
    earthquake: 'Illustration: a block split by a deep fissure',
    pests: 'Illustration: a single locust on a millet head',
    infrastructure: 'Illustration: a cracked concrete dam wall with a thin stream',
    aid: 'Illustration: an empty warehouse pallet with loose straps',
  } satisfies Record<ImageCategory, string>,

  verdicts: {
    yes: 'Yes',
    partly: 'Partly',
    no: 'No',
  } satisfies Record<Verdict, string>,

  veryHigh: 'Very high probability',

  common: {
    back: 'Back',
    openProfile: 'Open your profile',
    notInPrototype: 'Not available in this prototype yet.',
    risk: (id: string) => `Risk ${id}`,
  },

  tabs: {
    label: 'Main',
    risks: 'Risks',
    todo: 'To-do',
    alerts: 'Alerts',
    community: 'Community',
    ranking: 'Ranking',
    unread: (count: number) => `${count} unread`,
  },

  login: {
    title: 'Log in',
    intro: 'A few minutes at a time, with your trusted panel.',
    username: 'Username',
    password: 'Password',
    submit: 'Log in',
    forgot: 'Forgot password?',
    signUp: 'Sign up',
    or: 'or',
  },

  card: {
    question: 'Do you recognise this picture?',
    addNote: 'Add a note',
    send: 'Send answer',
    answered: (done: number, total: number) => `${done} of ${total} answered`,
    peersSeeYouAs: (name: string) => `Peers see you as ${name}`,
    peersSeeYouAnonymous: 'Peers see you as an anonymous expert',
    change: 'Change',
    later: 'Later',
    skip: 'Skip',
    dragLater: 'Answer later',
    dragSkip: "Skip, I can't answer this",
    chooseFirst: 'Choose Yes, Partly or No first.',
  },

  risks: {
    title: 'Risks',
    instruction: 'Tap Yes, Partly or No. Swipe right to answer later, left to skip.',
    stackLabel: 'Risks to review',
    sent: 'Sent. You’ll see the group’s view when the round closes.',
    movedToTodo: 'Moved to To-do.',
    skipped: 'Skipped.',
    undo: 'Undo',
    emptyTitle: 'You’re up to date',
    emptyBody: 'No risks are waiting for you. New ACAPS analyses for your panel will appear here.',
  },

  profile: {
    title: 'Profile',
    panel: (p: string) => `${p} panel`,
    account: 'Account',
    manage: 'Manage profile',
    security: 'Password and security',
    notifications: 'Notifications',
    language: 'Language',
    languageValue: 'English',
    preferences: 'Preferences',
    about: 'About us',
    theme: 'Theme',
    themeValue: 'Light',
    lowData: 'Low-data mode',
    lowDataHelp: 'Auto switches to a lighter app on slow or metered connections.',
    lowDataOptions: { auto: 'Auto', on: 'On', off: 'Off' },
    lowDataNow: (lite: boolean) => (lite ? 'Running light right now' : 'Running full right now'),
    privacy: 'Privacy',
    identity: {
      name: 'Show my name to other experts',
      pseudonym: 'Use a pseudonym',
      anonymous: 'Stay anonymous',
    },
    identityHelp: {
      name: (name: string) => `Peers see “${name}”.`,
      pseudonym: (p: string) => `Peers see “${p}”.`,
      anonymous: 'Peers see “Anonymous expert”.',
    },
    privacyHelp: 'Whatever you choose, nothing you write is ever shown to the public.',
  },

  todo: {
    title: 'To-do',
    urgent: 'Urgent',
    moderate: 'Moderate',
    low: 'Low',
    emptyTitle: 'Nothing saved for later',
    emptyBody: 'Swipe a risk card right, or tap Later, to keep it here.',
  },

  answer: {
    title: 'Your answer',
    detailed: 'Your detailed answer',
    placeholder: 'What do you see on the ground? What would change your view?',
    sources: 'Add sources or articles',
    addSource: 'Add a source',
    removeSource: (i: number) => `Remove source ${i}`,
    sourceLabel: (i: number) => `Source ${i}`,
    sourcePlaceholder: 'https://',
    invalidUrl: 'Enter a full web address starting with https://',
    submit: 'Submit',
    needsSomething: 'Choose Yes, Partly or No, or write an answer.',
    note: (name: string) => `Shared with your panel as ${name}. Never shown to the public.`,
    sent: 'Sent. You’ll see the group’s view when the round closes.',
  },

  community: {
    title: 'Community',
    yours: 'Your communities',
    others: 'Other communities',
    members: (m: number) => `${m} members`,
    newCount: (c: number) => `${c} new`,
  },

  topic: {
    yourAnswer: 'Your answer',
    optionalNote: 'Add a note (optional)',
    send: 'Send answer',
    others: 'How others answered',
    lockedTitle: 'Other answers are hidden',
    locked: (c: number) =>
      `Answer first to see how ${c} others answered. This keeps everyone’s view independent.`,
    newSinceLast: 'New since last round',
    summary: (y: number, p: number, no: number) => `${y} yes, ${p} partly, ${no} no`,
    anonymous: 'Anonymous expert',
    you: 'You',
  },

  ranking: {
    title: 'Ranking',
    yourRanking: 'Your ranking',
    rankOf: (r: number, of: number, panel: string) => `#${r} of ${of} on the ${panel} panel`,
    rankNote: 'Ranked by the accuracy of your resolved forecasts.',
    roundCloses: (round: number) => `Round ${round} closes in`,
    countdownUnits: { d: 'days', h: 'hours', m: 'min', s: 'sec' },
    countdownSr: (d: number, h: number, m: number) => `${d} days, ${h} hours and ${m} minutes`,
    certificates: 'Your certificates',
    contributions: 'Contributions',
    mapLabel: (c: number) => `Globe showing your contributions in ${c} countries`,
    summary: (c: number, r: number, k: number) =>
      `${c} countries, ${r} regions, ${n(k)} contributions`,
    people: 'People living in the areas of risks you helped assess',
    peopleNote: 'Based on ACAPS exposure estimates',
    stats: 'Stats',
    statContributions: 'Contributions',
    statResolved: 'Resolved forecasts',
    statBrier: 'Accuracy (Brier)',
    statBaseline: (b: number) => `ACAPS baseline ${b.toFixed(2)}`,
    statBrierNote: 'Lower is better',
    statRounds: 'Rounds joined',
    countryCount: (k: number) => `${k} ${k === 1 ? 'contribution' : 'contributions'}`,
    synthetic: 'All values are synthetic examples.',
  },

  notifications: {
    title: 'Notifications',
    unread: 'Unread',
    empty: 'No notifications yet.',
    kind: {
      analysis: 'New analysis',
      round: 'Round open',
      summary: 'Group summary',
      resolved: 'Forecast resolved',
      reply: 'Peer reply',
    } satisfies Record<NotificationKind, string>,
  },

  numbers: n,
};

export type Strings = typeof en;
