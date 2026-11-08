import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, LayoutTemplate, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useAnalyst } from '../../store';
import type { DashSize } from '../../store';
import { STARTER, board, place, removeFromBoard, resize, setBoard } from './layout';
import { WIDGETS, defOf } from './widgets';
import { newNoteId } from './notes';
import type { WidgetDef } from './widgets';
import './dashboard.css';

/*
 * Custom dashboard: every available component is listed on the right. Drag one
 * onto the board (or press +), drag a card by its handle to move it, change its
 * width, or drag it back to the list to remove it. The layout is saved in this browser.
 */

const SIZE_LABEL: Record<DashSize, string> = { sm: 'S', md: 'M', lg: 'L', xl: 'Full' };
const SIZE_NAME: Record<DashSize, string> = { sm: 'small', md: 'medium', lg: 'large', xl: 'full width' };
const GROUPS: WidgetDef['group'][] = ['Notes', 'Overview', 'Risks', 'Experts', 'Activity'];
const MIME = 'application/x-acaps-widget';

/** What is being dragged: a component from the list, or a card already on the board */
type Drag = { id: string; from: 'list' | 'board' } | null;

export function Dashboard() {
  useAnalyst();
  const items = board();
  const onBoard = new Set(items.map((x) => x.id));
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag>(null);
  /** the same, available at once in the event handlers (state updates a frame later) */
  const dragRef = useRef<Drag>(null);
  /** where the dragged component would land (index on the board), or null */
  const [at, setAt] = useState<number | null>(null);
  const [overList, setOverList] = useState(false);
  const [announce, setAnnounce] = useState('');

  const say = (msg: string) => setAnnounce(msg);

  const start = (e: DragEvent, id: string, from: 'list' | 'board') => {
    e.dataTransfer.setData(MIME, id);
    e.dataTransfer.setData('text/plain', defOf(id)!.title);
    e.dataTransfer.effectAllowed = from === 'list' ? 'copy' : 'move';
    if (from === 'board') {
      // drag the whole card, not just its handle
      const card = (e.currentTarget as HTMLElement).closest('.db-card') as HTMLElement | null;
      if (card) {
        const r = card.getBoundingClientRect();
        e.dataTransfer.setDragImage(card, e.clientX - r.left, e.clientY - r.top);
      }
    }
    dragRef.current = { id, from };
    // let the browser take its drag snapshot before the board changes
    requestAnimationFrame(() => setDrag({ id, from }));
  };

  const end = () => {
    dragRef.current = null;
    setDrag(null);
    setAt(null);
    setOverList(false);
  };

  /** Index in the board where the pointer is: before the first card it is "ahead of" in reading order */
  const indexAt = (x: number, y: number) => {
    const cards = [...(boardRef.current?.querySelectorAll<HTMLElement>('.db-card') ?? [])];
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const before = y < r.top || (y <= r.bottom && x < r.left + r.width / 2);
      if (before) return items.findIndex((it) => it.id === c.dataset.id);
    }
    return items.length;
  };

  const over = (e: DragEvent) => {
    if (!dragRef.current && !e.dataTransfer.types.includes(MIME)) return;
    e.preventDefault();
    // must match what the drag allows (cards on the board move, components from the list copy)
    e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'move' ? 'move' : 'copy';
    const i = indexAt(e.clientX, e.clientY);
    if (i !== at) setAt(i);
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(MIME) || dragRef.current?.id;
    const def = raw ? defOf(raw) : undefined;
    if (raw && def) {
      // a component that can be added many times gets a fresh card each time
      const id = def.multi && raw === def.id ? newNoteId() : raw;
      const i = at ?? items.length;
      const was = onBoard.has(id);
      place(id, i);
      say(`${def.title} ${was ? 'moved' : 'added to the board'}.`);
    }
    end();
  };

  const leaveBoard = (e: DragEvent) => {
    if (!boardRef.current?.contains(e.relatedTarget as Node)) setAt(null);
  };

  const add = (wid: string) => {
    const def = defOf(wid)!;
    const id = def.multi ? newNoteId() : wid;
    place(id, items.length);
    say(`${def.title} added to the end of the board.`);
    requestAnimationFrame(() =>
      boardRef.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  };

  const move = (id: string, by: number) => {
    const i = items.findIndex((x) => x.id === id);
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setBoard(next);
  };

  // the board's cards with the drop slot spliced in (the dragged card stays where it is, dimmed)
  const draggedSize = drag ? (items.find((x) => x.id === drag.id)?.size ?? defOf(drag.id)?.size ?? 'md') : 'md';
  const shown = items;
  const fromIndex = drag?.from === 'board' ? items.findIndex((x) => x.id === drag.id) : -1;
  // dropping a card right where it already is changes nothing: no slot then
  const placeholderIndex = at === null || (fromIndex >= 0 && (at === fromIndex || at === fromIndex + 1)) ? -1 : at;

  const cards = shown.map((it) => {
    const w = defOf(it.id)!;
    const i = items.indexOf(it);
    return (
      <section
        key={it.id}
        className={`db-card db-${it.size}${drag?.id === it.id ? ' is-dragging' : ''}`}
        data-id={it.id}
        aria-label={w.title}
      >
        <header className="db-card__head">
          <span
            className="db-handle"
            draggable
            onDragStart={(e) => start(e, it.id, 'board')}
            onDragEnd={end}
            title="Drag to move"
            aria-hidden="true"
          >
            <GripVertical />
          </span>
          <span className="db-card__icon" aria-hidden="true">
            {w.icon}
          </span>
          <h2>{w.title}</h2>
          <div className="db-card__tools">
            {w.sizes.length > 1 && (
              <div className="db-sizes" role="group" aria-label={`Width of ${w.title}`}>
                {w.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={it.size === s}
                    aria-label={`Make ${SIZE_NAME[s]}`}
                    title={`Make ${SIZE_NAME[s]}`}
                    onClick={() => resize(it.id, s)}
                  >
                    {SIZE_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="db-icon-btn" aria-label={`Move ${w.title} earlier`} title="Move earlier" disabled={i === 0} onClick={() => move(it.id, -1)}>
              <ArrowLeft />
            </button>
            <button
              type="button"
              className="db-icon-btn"
              aria-label={`Move ${w.title} later`}
              title="Move later"
              disabled={i === items.length - 1}
              onClick={() => move(it.id, 1)}
            >
              <ArrowRight />
            </button>
            <button
              type="button"
              className="db-icon-btn db-remove"
              aria-label={`Remove ${w.title}`}
              title="Remove from the board"
              onClick={() => {
                removeFromBoard(it.id);
                say(`${w.title} removed.`);
              }}
            >
              <X />
            </button>
          </div>
        </header>
        <div className="db-card__body">{w.render(it.id)}</div>
      </section>
    );
  });
  if (placeholderIndex >= 0) {
    cards.splice(
      placeholderIndex,
      0,
      <div key="__drop" className={`db-drop db-${draggedSize}`} aria-hidden="true">
        Drop here
      </div>,
    );
  }

  return (
    <div className="pn scroll">
      <div className="db">
        <div className="db-main">
          <header className="db-head">
            <div>
              <h1>Custom dashboard</h1>
              <p className="sub">
                Drag components from the right onto the board. Move a card by its handle, change its width, or drag it back
                to the list to remove it. Your layout is saved in this browser.
              </p>
            </div>
            <div className="db-actions">
              <button
                type="button"
                className="db-btn"
                onClick={() => {
                  setBoard(STARTER.map((x) => ({ ...x })));
                  say('Starter layout restored.');
                }}
              >
                <LayoutTemplate aria-hidden="true" /> Starter layout
              </button>
              <button
                type="button"
                className="db-btn"
                disabled={!items.length}
                onClick={() => {
                  setBoard([]);
                  say('Board cleared.');
                }}
              >
                <Trash2 aria-hidden="true" /> Clear board
              </button>
            </div>
          </header>

          <div
            ref={boardRef}
            className={`db-board${drag ? ' is-target' : ''}${items.length ? '' : ' is-empty'}`}
            onDragOver={over}
            onDragEnter={over}
            onDragLeave={leaveBoard}
            onDrop={drop}
            aria-label="Dashboard board"
          >
            {cards}
            {!items.length && at === null && (
              <div className="db-empty">
                <Plus aria-hidden="true" />
                <b>Your board is empty</b>
                <span>Drag a component here from the list on the right, or press its + button.</span>
              </div>
            )}
          </div>
        </div>

        {/* The list of every component */}
        <aside
          className={`db-palette${overList && drag?.from === 'board' ? ' is-remove' : ''}`}
          aria-label="Available components"
          onDragOver={(e) => {
            if (dragRef.current?.from !== 'board') return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOverList(true);
          }}
          onDragLeave={(e) => {
            if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOverList(false);
          }}
          onDrop={(e) => {
            const d = dragRef.current;
            if (d?.from !== 'board') return;
            e.preventDefault();
            removeFromBoard(d.id);
            say(`${defOf(d.id)!.title} removed.`);
            end();
          }}
        >
          <div className="db-palette__head">
            <h2>Components</h2>
            <p>
              {items.length} {items.length === 1 ? 'card' : 'cards'} on the board
            </p>
          </div>
          {overList && drag?.from === 'board' && (
            <div className="db-palette__remove">
              <RotateCcw aria-hidden="true" /> Drop to remove from the board
            </div>
          )}
          <div className="db-palette__list">
            {GROUPS.map((g) => (
              <section key={g} className="db-group" aria-label={g}>
                <h3>{g}</h3>
                <ul>
                  {WIDGETS.filter((w) => w.group === g).map((w) => {
                    const used = !w.multi && onBoard.has(w.id);
                    const copies = w.multi ? items.filter((x) => defOf(x.id) === w).length : 0;
                    return (
                      <li key={w.id}>
                        <div
                          className={`db-tile${used ? ' is-used' : ''}`}
                          draggable={!used}
                          onDragStart={(e) => start(e, w.id, 'list')}
                          onDragEnd={end}
                        >
                          <span className="db-tile__icon" aria-hidden="true">
                            {w.icon}
                          </span>
                          <span className="db-tile__text">
                            <b>{w.title}</b>
                            <small>{used ? 'On the board' : copies ? `${copies} on the board · add another` : w.desc}</small>
                          </span>
                          <button
                            type="button"
                            className="db-tile__add"
                            disabled={used}
                            aria-label={used ? `${w.title} is on the board` : `Add ${w.title} to the board`}
                            title={used ? 'On the board' : 'Add to the board'}
                            onClick={() => add(w.id)}
                          >
                            {used ? <span aria-hidden="true">✓</span> : <Plus aria-hidden="true" />}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </aside>
        <p className="sr" role="status" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
