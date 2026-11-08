import { S, commit } from '../../store';
import type { DashItem, DashSize } from '../../store';
import { defOf } from './widgets';
import { dropNote, isNote } from './notes';

/* The custom dashboard's layout: which components, in which order, how wide. Saved in this browser. */

const KEY = 'analystDashboard';

/** What a new analyst sees first (they can clear it and start from nothing) */
export const STARTER: DashItem[] = [
  { id: 'attention', size: 'sm' },
  { id: 'map', size: 'lg' },
  { id: 'closing', size: 'md' },
  { id: 'agreement', size: 'md' },
  { id: 'panel', size: 'md' },
  { id: 'forecasters', size: 'md' },
];

const valid = (x: unknown): x is DashItem =>
  !!x && typeof x === 'object' && typeof (x as DashItem).id === 'string' && !!defOf((x as DashItem).id);

function load(): DashItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const seen = new Set<string>();
        return list.filter(valid).filter((x) => {
          if (seen.has(x.id)) return false;
          seen.add(x.id);
          return true;
        }).map((x) => {
          const d = defOf(x.id)!;
          return { id: x.id, size: d.sizes.includes(x.size) ? x.size : d.size };
        });
      }
    }
  } catch {
    /* storage blocked or bad data: start from the starter layout */
  }
  return STARTER.map((x) => ({ ...x }));
}

/** The current layout (loaded on first use) */
export function board(): DashItem[] {
  if (!S.dash) S.dash = load();
  return S.dash;
}

/** Replace the layout, save it and redraw */
export function setBoard(next: DashItem[]) {
  S.dash = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* not saved, still shown */
  }
  commit();
}

/** Put component `id` at position `at` (adding it, or moving it if it is already on the board) */
export function place(id: string, at: number) {
  const cur = board();
  const from = cur.findIndex((x) => x.id === id);
  const item: DashItem = from >= 0 ? cur[from] : { id, size: defOf(id)!.size };
  const rest = cur.filter((x) => x.id !== id);
  // moving later in the list: the gap it leaves shifts the target by one
  const index = from >= 0 && from < at ? at - 1 : at;
  rest.splice(Math.max(0, Math.min(rest.length, index)), 0, item);
  setBoard(rest);
}

export function removeFromBoard(id: string) {
  if (isNote(id)) dropNote(id);
  setBoard(board().filter((x) => x.id !== id));
}
export const resize = (id: string, size: DashSize) => setBoard(board().map((x) => (x.id === id ? { ...x, size } : x)));
