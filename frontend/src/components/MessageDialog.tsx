import { useEffect, useRef } from 'react';
import { CircleCheck } from 'lucide-react';
import './MessageDialog.css';

interface MessageDialogProps {
  open: boolean;
  title: string;
  body: string;
  /** Small text links under the message; the first one gets focus */
  actions: { label: string; onClick: () => void }[];
  /** Escape */
  onClose: () => void;
}

/**
 * Confirmation pop-up (answer sent, card idea sent). A native modal <dialog>,
 * so focus stays inside it and Escape closes it.
 */
export function MessageDialog({ open, title, body, actions, onClose }: MessageDialogProps) {
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
      className="message-dialog"
      aria-labelledby="message-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <CircleCheck className="message-dialog__icon" size={44} strokeWidth={2.2} aria-hidden="true" />
      <h2 id="message-dialog-title" className="message-dialog__title">
        {title}
      </h2>
      <p className="message-dialog__body">{body}</p>
      <div className="message-dialog__links">
        {actions.map((a, i) => (
          <button key={a.label} type="button" className="message-dialog__link" onClick={a.onClick} autoFocus={i === 0}>
            {a.label}
          </button>
        ))}
      </div>
    </dialog>
  );
}
