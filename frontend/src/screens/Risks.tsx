import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { CardStack } from '../components/CardStack';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { answerLater, getRisks, skipRisk, undoSkip } from '../data/api';
import { useQuery } from '../data/useQuery';
import { en } from '../i18n/en';
import './Risks.css';

export function Risks() {
  const toast = useToast();
  const { data: risks } = useQuery(getRisks);
  // Cards dealt with this visit, so the counter reads "2 of 3" rather than always "1 of N".
  const [done, setDone] = useState(0);
  const total = risks ? done + risks.length : 0;

  return (
    <div className="screen risks">
      <ScreenHeader title={en.risks.title} showTitle={false} />
      <div className="risks__head">
        <h2 className="risks__heading">{en.risks.forReview}</h2>
      </div>
      <p className="risks__instruction t-small t-muted">{en.risks.instruction}</p>

      {risks && risks.length > 0 && (
        <CardStack
          risks={risks}
          counter={en.risks.position(done + 1, total)}
          onLater={async (risk) => {
            setDone((d) => d + 1);
            await answerLater(risk.id);
            toast({ message: en.risks.movedToTodo });
          }}
          onSkip={async (risk) => {
            setDone((d) => d + 1);
            const index = await skipRisk(risk.id);
            toast({
              message: en.risks.skipped,
              action: {
                label: en.risks.undo,
                onClick: () => {
                  setDone((d) => Math.max(0, d - 1));
                  undoSkip(risk.id, index);
                },
              },
              duration: 5000,
            });
          }}
        />
      )}

      {risks && risks.length === 0 && <EmptyState title={en.risks.emptyTitle} body={en.risks.emptyBody} shape={null} />}
    </div>
  );
}
