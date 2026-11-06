import { useNavigate } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { CardStack } from '../components/CardStack';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { answerLater, getMe, getRisks, skipRisk, submitAnswer, undoSkip } from '../data/api';
import { useQuery } from '../data/useQuery';
import { en } from '../i18n/en';
import './Risks.css';

export function Risks() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: risks } = useQuery(getRisks);
  const { data: me } = useQuery(getMe);

  return (
    <div className="screen risks">
      <ScreenHeader title={en.risks.title} showTitle={false} />
      <p className="risks__instruction t-small t-muted">{en.risks.instruction}</p>

      {risks && me && risks.length > 0 && (
        <CardStack
          risks={risks}
          me={me}
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
            await submitAnswer({ riskId: risk.id, verdict, text: '', sources: [] });
            toast({ message: en.risks.sent });
          }}
          onAddNote={(risk, verdict) => navigate(`/answer/${risk.id}`, { state: { verdict } })}
        />
      )}

      {risks && risks.length === 0 && <EmptyState title={en.risks.emptyTitle} body={en.risks.emptyBody} />}
    </div>
  );
}
