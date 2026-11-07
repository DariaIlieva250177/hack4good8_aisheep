import { useEffect, useRef } from 'react';
import { CircleCheck } from 'lucide-react';
import { en } from '../i18n/en';
import './SubmittedDialog.css';

interface SubmittedDialogProps {
  open: boolean;
  /** "See other people's opinions" */
  onSeeOthers: () => void;
  /** "Back" (also Escape) */
  onBack: () => void;
}

/**
 * Thank-you pop-up after an answer is sent. A native modal <dialog>, so focus
 * stays inside it and Escape closes it.
 */
export function SubmittedDialog({ open, onSeeOthers, onBack }: SubmittedDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="submitted"
      aria-labelledby="submitted-title"
      onCancel={(e) => {
        e.preventDefault();
        onBack();
      }}
    >
      <CircleCheck className="submitted__icon" size={44} strokeWidth={2.2} aria-hidden="true" />
      <h2 id="submitted-title" className="submitted__title">
        {en.submitted.title}
      </h2>
      <p className="submitted__body">{en.submitted.body}</p>
      <div className="submitted__links">
        <button type="button" className="submitted__link" onClick={onSeeOthers} autoFocus>
          {en.submitted.seeOthers}
        </button>
        <button type="button" className="submitted__link" onClick={onBack}>
          {en.submitted.back}
        </button>
      </div>
    </dialog>
  );
}
