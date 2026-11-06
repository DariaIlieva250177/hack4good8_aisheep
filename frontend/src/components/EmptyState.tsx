import { MetalShape, type MetalVariant } from './MetalShape';
import './EmptyState.css';

export function EmptyState({ title, body, shape = 'ring' }: { title: string; body: string; shape?: MetalVariant }) {
  return (
    <div className="empty-state">
      <MetalShape variant={shape} size={112} />
      <h2 className="t-title">{title}</h2>
      <p className="t-muted">{body}</p>
    </div>
  );
}
