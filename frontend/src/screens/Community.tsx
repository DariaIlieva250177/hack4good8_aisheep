import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { TimeLeft } from '../components/TimeLeft';
import { displayNameFor, getCommunities, getMe } from '../data/api';
import { imageFor, imageUrl } from '../data/families';
import { useQuery } from '../data/useQuery';
import { useNow } from '../data/useNow';
import { useMode } from '../mode/ModeContext';
import type { Community as CommunityT, Risk } from '../data/types';
import { en } from '../i18n/en';
import './Community.css';

type Item = { community: CommunityT; risk: Risk };
type Status = 'active' | 'expired';

const endedOn = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function Community() {
  const { data } = useQuery(getCommunities);
  const { data: me } = useQuery(getMe);
  // Ticks every second: timers count down and chats move to Expired on their own.
  const now = useNow(1000);

  const mine = data?.filter((d) => d.section === 'mine') ?? [];
  const others = data?.filter((d) => d.section === 'other') ?? [];

  return (
    <div className="screen community">
      <ScreenHeader title={en.community.title} variant="large" />
      {me && <p className="community__as">{en.community.youAppearAs(displayNameFor(me))}</p>}

      {data && (
        <>
          <CommunitySection
            id="community-mine"
            title={en.community.yours}
            items={mine}
            now={now}
            emptyActive={en.community.noneActive}
            renderRow={(item, status) => <ChatRow key={item.community.riskId} item={item} status={status} now={now} />}
          />
          <CommunitySection
            id="community-others"
            title={en.community.others}
            sub={en.community.openToExplore}
            items={others}
            now={now}
            emptyActive={en.community.nothingToExplore}
            renderRow={(item, status) => (
              <ExploreRow key={item.community.riskId} item={item} status={status} now={now} />
            )}
          />
        </>
      )}
    </div>
  );
}

/** One section with its own Active / Expired toggle (as in the reference). */
function CommunitySection({
  id,
  title,
  sub,
  items,
  now,
  emptyActive,
  renderRow,
}: {
  id: string;
  title: string;
  sub?: string;
  items: Item[];
  now: number;
  emptyActive: string;
  renderRow: (item: Item, status: Status) => React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>('active');
  const active = items.filter((i) => i.community.endsAt > now).sort((a, b) => a.community.endsAt - b.community.endsAt);
  const expired = items.filter((i) => i.community.endsAt <= now).sort((a, b) => b.community.endsAt - a.community.endsAt);
  const shown = status === 'active' ? active : expired;

  return (
    <section className="community__section" aria-labelledby={id}>
      <h2 id={id} className="community__heading">
        {title}
        {sub && <span className="community__sub">{sub}</span>}
      </h2>

      <div className="status-tabs" role="tablist" aria-label={en.community.statusLabel(title)}>
        {(['active', 'expired'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            className={`status-tabs__tab${status === s ? ' is-on' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s === 'active' ? en.community.active : en.community.expired}
            <span className="status-tabs__count">{s === 'active' ? active.length : expired.length}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <ul className="chat-list" role="tabpanel">
          {shown.map((item) => renderRow(item, status))}
        </ul>
      ) : (
        <p className="community__empty" role="tabpanel">
          {status === 'active' ? emptyActive : en.community.noneExpired}
        </p>
      )}
    </section>
  );
}

/** Round picture of the risk, ringed in its level colour. */
function ChatAvatar({ risk }: { risk: Risk }) {
  const { mode } = useMode();
  return (
    <span className={`chat-avatar chat-avatar--${risk.level.toLowerCase()}`} aria-hidden="true">
      {mode === 'lite' ? (
        <Users size={22} />
      ) : (
        <img src={imageUrl(imageFor(risk.family, risk.image))} alt="" loading="lazy" decoding="async" draggable={false} />
      )}
    </span>
  );
}

function LevelTag({ risk }: { risk: Risk }) {
  return <span className={`chat-tag chat-tag--${risk.level.toLowerCase()}`}>{en.levels[risk.level]}</span>;
}

function StatusChip({ community, status, now }: { community: CommunityT; status: Status; now: number }) {
  return status === 'active' ? (
    <TimeLeft endsAt={community.endsAt} now={now} />
  ) : (
    <span className="chat-ended">{en.community.ended(endedOn(community.endsAt))}</span>
  );
}

function ChatRow({ item: { community, risk }, status, now }: { item: Item; status: Status; now: number }) {
  const msg = community.lastMessage;
  return (
    <li>
      <Link to={`/community/${community.riskId}`} className="chat-row">
        <ChatAvatar risk={risk} />
        <span className="chat-row__text">
          <span className="chat-row__top">
            <span className="chat-row__name">{community.name}</span>
            {status === 'active' && community.unread > 0 && (
              <span className="chat-row__unread">
                <span aria-hidden="true">{community.unread}</span>
                <span className="sr-only">{en.community.unreadLabel(community.unread)}</span>
              </span>
            )}
          </span>
          {msg && (
            <span className="chat-row__preview">
              <b>{msg.author}:</b> {msg.text}
            </span>
          )}
          <span className="chat-row__meta">
            <LevelTag risk={risk} />
            <span className="chat-row__meta-text">
              {en.community.members(community.members)}
            </span>
            <StatusChip community={community} status={status} now={now} />
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Skipped or never-shown topic: Explore opens it read-only; once ended, Results. */
function ExploreRow({ item: { community, risk }, status, now }: { item: Item; status: Status; now: number }) {
  const expired = status === 'expired';
  return (
    <li className="chat-row chat-row--explore">
      <ChatAvatar risk={risk} />
      <span className="chat-row__text">
        <span className="chat-row__name">{community.name}</span>
        <span className="chat-row__meta">
          <LevelTag risk={risk} />
          <span className="chat-row__meta-text">
            {en.community.members(community.members)}
          </span>
        </span>
        <span className="chat-row__meta">
          <StatusChip community={community} status={status} now={now} />
        </span>
      </span>
      <Link
        to={expired ? `/community/${community.riskId}` : `/community/${community.riskId}/explore`}
        className="chat-row__explore"
        aria-label={`${expired ? en.community.results : en.community.explore}: ${community.name}`}
      >
        {expired ? en.community.results : en.community.explore}
      </Link>
    </li>
  );
}
