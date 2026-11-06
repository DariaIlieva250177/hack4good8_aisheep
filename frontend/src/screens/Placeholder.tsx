import { ScreenHeader } from '../components/ScreenHeader';

/** Temporary stand-in while screens are built one at a time. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="screen">
      <ScreenHeader title={title} />
    </div>
  );
}
