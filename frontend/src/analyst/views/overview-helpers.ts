import { DATA } from '../data';
import type { Expert } from '../types';

/*
 * Small helpers shared by the overview pages (Picture, Open risks,
 * Approvals, Panel, Country, the expert account).
 */

/** 1 -> "1st", 12 -> "12th" */
export const ORD = (n: number) =>
  n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th');

export const PROB_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
export const STEP_WORDS = ['Very unlikely', 'Unlikely', 'Even chance', 'Likely', 'Very likely'];
export const CARD_DONE: Record<string, string> = { add: 'Added as a risk', watch: 'Watching', decline: 'Declined' };
export const LEVEL_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export const APNOTE: Record<string, string> = {
  verified_anonymous: 'Once approved, they stay anonymous to other experts. ACAPS keeps their name and contact details.',
  verified_deleted:
    'Once you decide, their name, contact details, documents and background are deleted. Only their ID, approved countries and fields, and a hash of their recovery code stay.',
};

export const rankText = (e: Expert) => (e.rank ? `${ORD(e.rank.position)} of ${DATA.rankedOutOf}` : 'No rank yet');
