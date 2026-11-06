import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RiskHeader } from '../components/RiskHeader';
import { VerdictButtons } from '../components/VerdictButtons';
import { Avatar } from '../components/Avatar';
import { IdentityFooter } from '../components/RiskCard';
import { useToast } from '../components/Toast';
import { getMe, getTopic, markCommunityRead, submitAnswer } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { Answer, Verdict } from '../data/types';
import { en } from '../i18n/en';
import './CommunityTopic.css';

export function CommunityTopic() {
  const { riskId = '' } = useParams();
  const toast = useToast();
  const { data: topic, loading } = useQuery(() => getTopic(riskId), [riskId]);
  const { data: me } = useQuery(getMe);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const answered = Boolean(topic?.mine);

  // Unread replies count as seen once they are visible.
  useEffect(() => {
    if (answered) markCommunityRead(riskId);
  }, [answered, riskId]);

  if (loading) return <div className="screen" />;
  if (!topic) return <Navigate to="/community" replace />;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!verdict) {
      toast({ message: en.card.chooseFirst });
      return;
    }
    setSending(true);
    await submitAnswer({ riskId, verdict, text: note, sources: [] });
    setSending(false);
  };

  const counts = topic.others.reduce(
    (acc, a) => ({ ...acc, [a.verdict]: acc[a.verdict] + 1 }),
    { yes: 0, partly: 0, no: 0 } as Record<Verdict, number>,
  );

  return (
    <div className="screen topic">
      <ScreenHeader title={topic.community.name} back />
      <RiskHeader risk={topic.risk} questionId="topic-question" />

      <section className="topic__section" aria-labelledby="your-answer">
        <h2 id="your-answer" className="topic__heading t-title">
          {en.topic.yourAnswer}
        </h2>
        {topic.mine ? (
          <AnswerItem answer={topic.mine} you />
        ) : (
          <form className="topic__form soft-card" onSubmit={send}>
            <VerdictButtons value={verdict} onChange={setVerdict} labelledBy="topic-question" />
            <label className="field-label" htmlFor="topic-note">
              {en.topic.optionalNote}
            </label>
            <div className="inset topic__note">
              <textarea id="topic-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-pill" disabled={sending}>
              {en.topic.send}
            </button>
            {me && <IdentityFooter me={me} />}
          </form>
        )}
      </section>

      <section className="topic__section" aria-labelledby="others-answers">
        <h2 id="others-answers" className="topic__heading t-title">
          {en.topic.others}
        </h2>
        {answered ? (
          <>
            <p className="t-small t-muted topic__summary">{en.topic.summary(counts.yes, counts.partly, counts.no)}</p>
            <ul className="topic__answers">
              {topic.others.map((a) => (
                <li key={a.id}>
                  <AnswerItem answer={a} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="topic__locked soft-card">
            <Lock size={24} color="var(--acaps-dark)" aria-hidden="true" />
            <p className="t-title">{en.topic.lockedTitle}</p>
            <p className="t-muted">{en.topic.locked(topic.othersCount)}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function AnswerItem({ answer, you = false }: { answer: Answer; you?: boolean }) {
  return (
    <article className={`answer-item soft-card${answer.isNew ? ' answer-item--new' : ''}`}>
      <header className="answer-item__head">
        <Avatar name={answer.displayName} identity={answer.identity} seed={answer.authorId} size={40} you={you} />
        <div className="answer-item__who">
          <p className="answer-item__name">
            {answer.displayName}
            {you && <span className="t-small t-muted"> ({en.topic.you})</span>}
          </p>
          {answer.isNew && <span className="answer-item__new t-small">{en.topic.newSinceLast}</span>}
        </div>
        <span className={`verdict-tag verdict-tag--${answer.verdict}`}>{en.verdicts[answer.verdict]}</span>
      </header>
      {answer.text && <blockquote className="answer-item__quote expert t-quote">{answer.text}</blockquote>}
      {answer.sources.length > 0 && (
        <ul className="answer-item__sources t-small">
          {answer.sources.map((s) => (
            <li key={s}>
              <a href={s} target="_blank" rel="noreferrer noopener">
                {new URL(s).hostname}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
