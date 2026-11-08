import { useAnalyst } from '../../store';
import { isSaved, toggleSave } from './notes';

/** "Save to notes" / "Saved" */
export function SaveBtn({ k, label }: { k: string; label: string }) {
  useAnalyst();
  const on = isSaved(k);
  return (
    <button type="button" className={`btn${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleSave(k)}>
      {on ? 'Saved' : label}
    </button>
  );
}
