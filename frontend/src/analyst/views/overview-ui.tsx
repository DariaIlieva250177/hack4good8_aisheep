import { Link } from 'react-router-dom';
import { DATA } from '../data';
import { countryHref } from '../nav';
import { openDialog } from '../store';
import type { Risk } from '../types';

/** An expert's code: opens their account */
export const CodeBtn = ({ id }: { id: string }) => (
  <button type="button" className="code-l" onClick={() => openDialog('acct', { id })}>
    {id}
  </button>
);

/** A risk's countries, linked to their country pages where there is one */
export function CountryLinks({ r }: { r: Risk }) {
  return (
    <>
      {r.countries.map((c, i) => (
        <span key={c} style={{ display: 'contents' }}>
          {i > 0 && ', '}
          {DATA.countries[c] ? <Link to={countryHref(c)}>{c}</Link> : c}
        </span>
      ))}
    </>
  );
}
