import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Eye, Heart, Lock, MessageCircle, Send, Timer } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RiskHeader } from '../components/RiskHeader';
import { VerdictButtons } from '../components/VerdictButtons';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { GlassButton } from '../components/glass/GlassButton';
import { addComment, getTopic, markCommunityRead, submitAnswer, toggleLike } from '../data/api';
import { useQuery } from '../data/useQuery';
import { useNow } from '../data/useNow';
import { TimeLeft } from '../components/TimeLeft';
import type { Answer, Topic, Verdict } from '../data/types';
import { en } from '../i18n/en';
import './CommunityTopic.css';

/**
 * A community chat for one risk.
 * explore: read-only. Shows every answer with its likes and comments, but no
 * answer form, no liking and no commenting, and visiting doesn't move the
 * topic to Your communities or clear its unread count.
 */
export function CommunityTopic({ explore = false }: { explore?: boolean }) {
  const { riskId = '' } = useParams();
  const toast = useToast();
  const { data: topic, loading } = useQuery(() => getTopic(riskId, { explore }), [riskId, explore]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // Ticks so the timer counts down and the page switches to the ended view on time.
  const now = useNow(1000);

  const answered = Boolean(topic?.mine);

  // Unread replies count as seen once they are visible.
  useEffect(() => {
    if (answered && !explore) markCommunityRead(riskId);
  }, [answered, explore, riskId]);

  if (loading) return <div className="screen" />;
  if (!topic) return <Navigate to="/community" replace />;
  if (topic.community.endsAt <= now) return <ExpiredTopic topic={topic} />;

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

  const counts = topic.others.reduce((acc, a) => ({ ...acc, [a.verdict]: acc[a.verdict] + 1 }), {
    yes: 0,
    partly: 0,
    no: 0,
  } as Record<Verdict, number>);

  return (
    <div className="screen topic">
      <ScreenHeader title={topic.community.name} back />
      <RiskHeader risk={topic.risk} questionId="topic-question" />

      <p className="topic__closes">
        <Timer size={16} aria-hidden="true" />
        {en.topic.closesIn}
        <TimeLeft endsAt={topic.community.endsAt} now={now} />
      </p>

      {explore && (
        <p className="topic__explore-note" role="note">
          <Eye size={20} aria-hidden="true" />
          <span>{en.topic.exploreNote}</span>
        </p>
      )}

      {!explore && (
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
              <GlassButton type="submit" variant="primary" pill disabled={sending}>
                {en.topic.send}
              </GlassButton>
            </form>
          )}
        </section>
      )}

      <section className="topic__section" aria-labelledby="others-answers">
        <h2 id="others-answers" className="topic__heading t-title">
          {en.topic.others}
        </h2>
        {answered || explore ? (
          <>
            <p className="t-small t-muted topic__summary">{en.topic.summary(counts.yes, counts.partly, counts.no)}</p>
            <ul className="topic__answers">
              {topic.others.map((a) => (
                <li key={a.id}>
                  <AnswerItem answer={a} readOnly={explore} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="topic__locked soft-card">
            <Lock size={24} color="var(--accent)" aria-hidden="true" />
            <p className="t-title">{en.topic.lockedTitle}</p>
            <p className="t-muted">{en.topic.locked(topic.othersCount)}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function AnswerItem({ answer, you = false, readOnly = false }: { answer: Answer; you?: boolean; readOnly?: boolean }) {
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
      {!you && <Reactions answer={answer} readOnly={readOnly} />}
    </article>
  );
}

/** Likes and comments under an answer. Read-only shows counts and comments only. */
function Reactions({ answer, readOnly }: { answer: Answer; readOnly: boolean }) {
  const [draft, setDraft] = useState('');
  const comments = answer.comments ?? [];
  const likes = answer.likes ?? 0;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await addComment(answer.id, draft);
    setDraft('');
  };

  return (
    <div className="reactions">
      <div className="reactions__bar">
        {readOnly ? (
          <span className="reactions__count">
            <Heart size={18} aria-hidden="true" />
            <span aria-hidden="true">{likes}</span>
            <span className="sr-only">{en.topic.likes(likes)}</span>
          </span>
        ) : (
          <button
            type="button"
            className={`reactions__like${answer.likedByMe ? ' is-on' : ''}`}
            aria-pressed={Boolean(answer.likedByMe)}
            aria-label={en.topic.likeLabel(likes)}
            onClick={() => toggleLike(answer.id)}
          >
            <Heart size={18} fill={answer.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
            <span aria-hidden="true">{likes}</span>
          </button>
        )}
        <span className="reactions__count">
          <MessageCircle size={18} aria-hidden="true" />
          <span aria-hidden="true">{comments.length}</span>
          <span className="sr-only">{en.topic.comments(comments.length)}</span>
        </span>
      </div>

      {comments.length > 0 && (
        <ul className="reactions__comments">
          {comments.map((c) => (
            <li key={c.id} className="reactions__comment">
              <Avatar name={c.displayName} identity={c.identity} seed={c.authorId} size={28} />
              <p>
                <b>{c.displayName}</b> {c.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form className="reactions__form" onSubmit={send}>
          <label className="sr-only" htmlFor={`comment-${answer.id}`}>
            {en.topic.commentLabel(answer.displayName)}
          </label>
          <input
            id={`comment-${answer.id}`}
            value={draft}
            placeholder={en.topic.commentPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="reactions__send" aria-label={en.topic.sendComment} disabled={!draft.trim()}>
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

/* ---------- Ended chat ---------- */

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/**
 * Read-only view of a chat that has ended: a summary of what was sent and
 * discussed, then the final results (the panel's view), then the full
 * discussion with every like and comment.
 */
function ExpiredTopic({ topic }: { topic: Topic }) {
  const t = en.topic;
  const all = [...(topic.mine ? [topic.mine] : []), ...topic.others];
  const comments = all.reduce((n, a) => n + (a.comments?.length ?? 0), 0);
  const likes = all.reduce((n, a) => n + (a.likes ?? 0), 0);
  const counts = all.reduce((acc, a) => ({ ...acc, [a.verdict]: acc[a.verdict] + 1 }), {
    yes: 0,
    partly: 0,
    no: 0,
  } as Record<Verdict, number>);
  const forecasts = all.map((a) => a.forecast).filter((f): f is NonNullable<typeof f> => f != null);
  const avg = forecasts.length ? forecasts.reduce((x, y) => x + y, 0) / forecasts.length : null;
  const byStep = [1, 2, 3, 4, 5].map((s) => forecasts.filter((f) => f === s).length);
  const topDiscussed = [...all]
    .sort((a, b) => (b.likes ?? 0) + 2 * (b.comments?.length ?? 0) - ((a.likes ?? 0) + 2 * (a.comments?.length ?? 0)))
    .slice(0, 2);

  const total = all.length;
  const consensus =
    pct(counts.yes, total) >= 60
      ? t.consensusAgree
      : pct(counts.no, total) >= 60
        ? t.consensusDisagree
        : t.consensusSplit;
  const ended = new Date(topic.community.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <div className="screen topic topic--ended">
      <ScreenHeader title={topic.community.name} back />
      <RiskHeader risk={topic.risk} />

      <p className="topic__explore-note" role="note">
        <Lock size={20} aria-hidden="true" />
        <span>{t.endedNote(ended)}</span>
      </p>

      {/* 1. Summary */}
      <section className="topic__section" aria-labelledby="ended-summary">
        <h2 id="ended-summary" className="topic__heading t-title">
          {t.summaryTitle}
        </h2>
        <div className="ended-card">
          <ul className="ended-stats">
            <li>
              <b>{total}</b> {t.statAnswers}
            </li>
            <li>
              <b>{comments}</b> {t.statComments}
            </li>
            <li>
              <b>{likes}</b> {t.statLikes}
            </li>
          </ul>
          {topic.community.summary && <p className="ended-card__text">{topic.community.summary}</p>}
          {topDiscussed.length > 0 && (
            <>
              <h3 className="ended-card__sub">{t.mostDiscussed}</h3>
              <ul className="ended-quotes">
                {topDiscussed.map((a) => (
                  <li key={a.id}>
                    <p>“{a.text}”</p>
                    <span>
                      {a.displayName} · {t.likes(a.likes ?? 0)} · {t.comments(a.comments?.length ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* 2. Final results */}
      <section className="topic__section" aria-labelledby="ended-results">
        <h2 id="ended-results" className="topic__heading t-title">
          {t.finalResults}
        </h2>
        <div className="ended-card">
          <p className="ended-card__headline">{consensus}</p>

          <h3 className="ended-card__sub">{t.agreeWithAcaps}</h3>
          <ul className="result-bars">
            {(
              [
                ['yes', t.resultAgree],
                ['partly', t.resultPartly],
                ['no', t.resultDisagree],
              ] as const
            ).map(([v, label]) => (
              <li key={v} className={`result-bars__row result-bars__row--${v}`}>
                <span className="result-bars__label">{label}</span>
                <span className="result-bars__track" aria-hidden="true">
                  <span className="result-bars__fill" style={{ inlineSize: `${pct(counts[v], total)}%` }} />
                </span>
                <span className="result-bars__value">
                  {pct(counts[v], total)}%<span className="sr-only"> ({t.ofExperts(counts[v], total)})</span>
                </span>
              </li>
            ))}
          </ul>

          {avg !== null && (
            <>
              <h3 className="ended-card__sub">{en.answer.likelihood}</h3>
              <p className="ended-card__forecast">
                {t.panelForecast} <b>{en.answer.scale[Math.round(avg) - 1]}</b>
              </p>
              <ol className="forecast-dist" aria-label={en.answer.likelihood}>
                {byStep.map((n, i) => (
                  <li key={i} className={Math.round(avg) - 1 === i ? 'is-on' : ''}>
                    <span
                      className="forecast-dist__bar"
                      style={{ blockSize: `${8 + pct(n, forecasts.length) * 0.6}px` }}
                    />
                    <span className="forecast-dist__n">{n}</span>
                    <span className="forecast-dist__label">{en.answer.scale[i]}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </section>

      {/* 3. Full discussion, read-only */}
      <section className="topic__section" aria-labelledby="ended-discussion">
        <h2 id="ended-discussion" className="topic__heading t-title">
          {t.fullDiscussion}
        </h2>
        <ul className="topic__answers">
          {topic.mine && (
            <li>
              <AnswerItem answer={topic.mine} you readOnly />
            </li>
          )}
          {topic.others.map((a) => (
            <li key={a.id}>
              <AnswerItem answer={a} readOnly />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
