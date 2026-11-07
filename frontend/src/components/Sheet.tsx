import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { en } from '../i18n/en';
import './Sheet.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Makes the panel a form; the footer's submit button saves */
  onSubmit?: (e: FormEvent) => void;
  footer?: ReactNode;
}

/**
 * Settings panel: a modal that rises from the bottom on a phone and sits in
 * the middle on a wide screen. Native <dialog>, so focus stays inside and
 * Escape or a click outside closes it.
 */
export function Sheet({ open, title, onClose, children, onSubmit, footer }: SheetProps) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const Body = onSubmit ? 'form' : 'div';

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Body className="sheet__panel" onSubmit={onSubmit} noValidate={onSubmit ? true : undefined}>
        <header className="sheet__head">
          <h2 id={`${id}-title`} className="sheet__title">
            {title}
          </h2>
          <button type="button" className="sheet__close" aria-label={en.webLogin.close} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </Body>
    </dialog>
  );
}
