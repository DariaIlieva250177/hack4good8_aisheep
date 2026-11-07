import { MetalShape, type MetalVariant } from './MetalShape';
import './EmptyState.css';

/** `shape={null}` leaves out the metallic shape. */
export function EmptyState({ title, body, shape = 'ring' }: { title: string; body: string; shape?: MetalVariant | null }) {
  return (
    <div className="empty-state">
      {shape && <MetalShape variant={shape} size={112} />}
      <h2 className="t-title">{title}</h2>
      <p className="t-muted">{body}</p>
    </div>
  );
}
