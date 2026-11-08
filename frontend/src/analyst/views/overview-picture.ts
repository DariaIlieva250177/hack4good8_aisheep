import { DATA, R, localChallenge, plural } from '../data';
import { S } from '../store';

/** Open risks matching the Picture's filters (level, deteriorated, country) */
export function picList(country: string | null = S.pic.country) {
  const f = S.pic;
  return Object.values(R).filter(
    (r) =>
      (!f.level || r.level === f.level) &&
      (!f.worse || r.trend === 'Deteriorated') &&
      (!country || r.countries.includes(country)),
  );
}

/** Why a country is flagged: local experts challenging ACAPS, suggestions waiting */
export function signalOf(name: string) {
  const why: string[] = [];
  const ch = Object.values(R).filter((r) => r.countries.includes(name) && localChallenge(r.id));
  if (ch.length) why.push(`a ${name} expert challenges ACAPS on ${ch.map((r) => r.id).join(', ')}`);
  const cards = DATA.cards.filter((c) => c.country === name && !S.cards[c.id]);
  if (cards.length) why.push(`${plural(cards.length, 'suggestion')} waiting`);
  return why;
}
