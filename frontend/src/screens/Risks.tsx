import { ScreenHeader } from '../components/ScreenHeader';
import { CardStack } from '../components/CardStack';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { answerLater, getRisks, skipRisk, submitAnswer, undoAnswer, undoSkip } from '../data/api';
import { useQuery } from '../data/useQuery';
import { en } from '../i18n/en';
import './Risks.css';

export function Risks() {
  const toast = useToast();
  const { data: risks } = useQuery(getRisks);

  return (
    <div className="screen risks">
      <ScreenHeader title={en.risks.title} showTitle={false} />
      <p className="risks__instruction t-small t-muted">{en.risks.instruction}</p>

      {risks && risks.length > 0 && (
        <CardStack
          risks={risks}
          onLater={async (risk) => {
            await answerLater(risk.id);
            toast({ message: en.risks.movedToTodo });
          }}
          onSkip={async (risk) => {
            const index = await skipRisk(risk.id);
            toast({
              message: en.risks.skipped,
              action: { label: en.risks.undo, onClick: () => undoSkip(risk.id, index) },
              duration: 5000,
            });
          }}
          onSend={async (risk, verdict) => {
            const index = risks.findIndex((r) => r.id === risk.id);
            await submitAnswer({ riskId: risk.id, verdict, text: '', sources: [] });
            // A single tap sends, so a mis-tap needs a way back.
            toast({
              message: en.risks.sent,
              action: { label: en.risks.undo, onClick: () => undoAnswer(risk.id, index) },
              duration: 5000,
            });
          }}
        />
      )}

      {risks && risks.length === 0 && <EmptyState title={en.risks.emptyTitle} body={en.risks.emptyBody} />}
    </div>
  );
}
