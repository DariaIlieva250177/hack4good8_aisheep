import { Users } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RiskRow } from '../components/RiskRow';
import { getCommunities } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { Community as CommunityT, Risk } from '../data/types';
import { en } from '../i18n/en';
import './Community.css';

export function Community() {
  const { data } = useQuery(getCommunities);
  const mine = data?.filter((d) => d.community.mine) ?? [];
  const others = data?.filter((d) => !d.community.mine) ?? [];

  return (
    <div className="screen community">
      <ScreenHeader title={en.community.title} />
      {data && (
        <>
          <CommunitySection id="community-mine" title={en.community.yours} items={mine} />
          <CommunitySection id="community-others" title={en.community.others} items={others} />
        </>
      )}
    </div>
  );
}

function CommunitySection({ id, title, items }: { id: string; title: string; items: { community: CommunityT; risk: Risk }[] }) {
  if (!items.length) return null;
  return (
    <section className="community__section" aria-labelledby={id}>
      <h2 id={id} className="community__title">
        {title}
      </h2>
      <ul className="risk-list">
        {items.map(({ community, risk }) => (
          <RiskRow
            key={community.riskId}
            risk={risk}
            to={`/community/${community.riskId}`}
            meta={
              <span className="community__members">
                <Users size={14} aria-hidden="true" />
                {community.name} · {en.community.members(community.members)}
              </span>
            }
            marker={
              community.unread > 0 ? <span className="unread-marker">{en.community.newCount(community.unread)}</span> : null
            }
          />
        ))}
      </ul>
    </section>
  );
}
