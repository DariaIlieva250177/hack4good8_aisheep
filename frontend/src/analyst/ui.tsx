import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent, ReactNode } from 'react';
import { DATA } from './data';
import { closeDialog, closePop, commit, openDialog, openPop, overlay, reason, useAnalyst } from './store';
import type { DialogName } from './store';

/*
 * Small pieces shared by every analyst page: icons, tags, citation buttons,
 * and the overlays (popover, "why?" form, tooltip, toast, dialogs).
 */

/* ---------- icons ---------- */
export const Icon = {
  pencil: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.8 2.6l2.6 2.6L5.6 13H3v-2.6z" />
    </svg>
  ),
  nib: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5l3.6 6.2L9.2 14H6.8L4.4 7.7zM8 6.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fillRule="evenodd" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5v11l9.5-5.5z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z" />
    </svg>
  ),
};

/* ---------- tags ---------- */
/** "Suggested" (pencil): AI or system suggestion, not yet accepted */
export const TagP = () => (
  <span className="tag tag-p">
    {Icon.pencil}Suggested
  </span>
);
/** "Accepted" (ink) */
export const TagI = () => (
  <span className="tag tag-i">
    {Icon.nib}Accepted
  </span>
);
export const LevelChip = ({ level }: { level: string }) => (
  <span className={`lvl lvl-${level.toLowerCase()}`}>
    <i />
    {level}
  </span>
);
/** Match weight as 1-3 dots */
export const Wdots = ({ w }: { w: number }) => (
  <span className="wt" aria-hidden="true">
    {[1, 2, 3].map((i) => (
      <i key={i} className={i <= w ? 'on' : ''} />
    ))}
  </span>
);
export const CloseBtn = ({ onClick = closeDialog }: { onClick?: () => void }) => (
  <button type="button" className="close" aria-label="Close" onClick={onClick}>
    {Icon.close}
  </button>
);

/* ---------- citations ---------- */

/** Numbering for the sources cited in one block of text (shared across its paragraphs). */
export interface CiteNums {
  n: number;
  map: Record<string, number>;
}
export const newNums = (): CiteNums => ({ n: 0, map: {} });

/** The source popover for citation `key` */
export function citePop(anchor: HTMLElement, key: string) {
  const c = DATA.cites[key];
  openPop(
    anchor,
    <>
      <blockquote>{c.quote}</blockquote>
      <p className="src">
        {c.label}, {c.risk}
      </p>
      {c.links.length > 0 && (
        <div className="links">
          {c.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </>,
    'Source',
  );
}

/** A numbered citation button: opens the quote and its sources. */
export function CiteBtn({ id, n }: { id: string; n: number }) {
  return (
    <button type="button" className="cite" aria-label={`Source ${n}`} onClick={(e) => citePop(e.currentTarget, id)}>
      {n}
    </button>
  );
}

/** Text with "{key}" markers turned into numbered citation buttons. */
export function Cited({ text, nums }: { text: string; nums: CiteNums }) {
  const parts = String(text ?? '').split(/\{(\w+)\}/g);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        if (!nums.map[p]) nums.map[p] = ++nums.n;
        return <CiteBtn key={i} id={p} n={nums.map[p]} />;
      })}
    </>
  );
}

/* ---------- popover ---------- */

/** The floating popover (a source, a pin, or the "why?" form). */
export function Pop() {
  useAnalyst();
  const ref = useRef<HTMLDivElement>(null);
  const p = overlay.pop;
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!p || !ref.current) return setPos(null);
    const a = p.anchor.getBoundingClientRect();
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const left = Math.min(Math.max(12, a.left + a.width / 2 - w / 2), innerWidth - w - 12);
    let top = a.bottom + 8;
    if (top + h > innerHeight - 12) top = Math.max(12, a.top - h - 8);
    setPos({ left, top });
  }, [p]);

  // Close on a click outside it (but not on the button that opened it), or on Escape
  useEffect(() => {
    if (!p) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || p.anchor.contains(t)) return;
      closePop();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePop(true);
      }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [p]);

  if (!p) return null;
  return (
    <div
      id="pop"
      ref={ref}
      role="dialog"
      aria-label={p.label}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
    >
      {p.content ?? (reason.req && <ReasonForm />)}
    </div>
  );
}

/** "Why …?" with a text box and ready-made reasons; the decision needs a reason. */
function ReasonForm() {
  const req = reason.req!;
  const [text, setText] = useState('');
  const [err, setErr] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => box.current?.focus(), []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v) {
      setErr(true);
      box.current?.focus();
      return;
    }
    const done = req.done;
    closePop();
    done(v);
  };

  return (
    <form className="rf" onSubmit={submit}>
      <label htmlFor="rfT">{req.title}</label>
      <textarea
        id="rfT"
        ref={box}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
        }}
      />
      <div className="quick">
        {(req.quick ?? QUICK_CONFIRM).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setText(q);
              setErr(false);
              box.current?.focus();
            }}
          >
            {q}
          </button>
        ))}
      </div>
      {err && <p className="err">Add a reason to continue.</p>}
      <div className="rf-a">
        <button className="btn btn-ink">{req.ok ?? 'Confirm'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => closePop(true)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
const QUICK_CONFIRM = ['Checked against the quotes', 'Matches my reading of the sources'];

/* ---------- tooltip: any element with data-tip ---------- */
export function Tip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; el: HTMLElement } | null>(null);

  useEffect(() => {
    const over = (e: Event) => {
      const el = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (e.type === 'focusin' && el && !el.matches(':focus-visible')) return;
      setTip(el ? { text: el.dataset.tip!, el } : null);
    };
    const out = () => setTip(null);
    document.addEventListener('pointerover', over);
    document.addEventListener('focusin', over);
    document.addEventListener('focusout', out);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('focusin', over);
      document.removeEventListener('focusout', out);
    };
  }, []);

  useLayoutEffect(() => {
    const t = ref.current;
    if (!tip || !t) return;
    const a = tip.el.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    t.style.left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), innerWidth - w - 8) + 'px';
    t.style.top = (a.top - h - 7 > 6 ? a.top - h - 7 : a.bottom + 7) + 'px';
  }, [tip]);

  if (!tip) return null;
  return (
    <div id="tip" ref={ref}>
      {tip.text}
    </div>
  );
}

/* ---------- toast ---------- */
export function Toast() {
  useAnalyst();
  const t = overlay.toast;
  if (!t) return null;
  return (
    <div id="toast" role="status" aria-live="polite">
      <span>Logged: {t.msg}</span>
      <button type="button" onClick={() => openDialog('drawer', { scrollTo: 'decisions' })}>
        Open Decisions
      </button>
    </div>
  );
}

/* ---------- dialogs ---------- */

/**
 * A modal <dialog> that is open while overlay.dialog names it. Clicking the
 * backdrop or pressing Escape closes it.
 */
export function Dialog({
  name,
  className,
  label,
  children,
}: {
  name: DialogName;
  className: 'drawer' | 'center';
  label: string;
  children: ReactNode;
}) {
  useAnalyst();
  const ref = useRef<HTMLDialogElement>(null);
  const open = overlay.dialog?.name === name;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      id={name}
      aria-label={label}
      onClose={() => {
        if (overlay.dialog?.name === name) {
          overlay.dialog = null;
          commit();
        }
      }}
      onClick={(e: MouseEvent<HTMLDialogElement>) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      {open && children}
    </dialog>
  );
}
