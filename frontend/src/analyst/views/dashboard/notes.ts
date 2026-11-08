import { commit } from '../../store';

/* Text of the note cards on the custom dashboard, by card id. Saved in this browser. */

const KEY = 'analystDashNotes';

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

const texts: Record<string, string> = load();

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(texts));
  } catch {
    /* not saved, still shown */
  }
};

export const noteText = (id: string) => texts[id] ?? '';
export function setNoteText(id: string, text: string) {
  texts[id] = text;
  save();
  commit();
}
export function dropNote(id: string) {
  delete texts[id];
  save();
}

/** A new, unique id for a note card */
export const newNoteId = () => `note-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const isNote = (id: string) => id.startsWith('note-');
