import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Globe, Info, KeyRound, Palette, UserRound, Wifi, type LucideIcon } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { displayNameFor, getMe, setIdentity } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { IdentityMode } from '../data/types';
import { useMode, type LowDataSetting } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './Profile.css';

const IDENTITIES: IdentityMode[] = ['name', 'pseudonym', 'anonymous'];
const LOW_DATA: LowDataSetting[] = ['auto', 'on', 'off'];

export function Profile() {
  const { data: me } = useQuery(getMe);
  const { mode, setting, setSetting } = useMode();
  const toast = useToast();
  const { hash } = useLocation();
  const privacyRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (hash === '#privacy' && me && privacyRef.current) {
      privacyRef.current.scrollIntoView({ block: 'start' });
      privacyRef.current.focus({ preventScroll: true });
    }
  }, [hash, me]);

  if (!me) return <div className="screen" />;

  const notYet = () => toast({ message: en.common.notInPrototype });
  const shownAs = displayNameFor(me);

  return (
    <div className="screen profile">
      <ScreenHeader title={en.profile.title} back avatar={false} />

      <section className="profile__identity soft-card" aria-label={shownAs}>
        <Avatar name={shownAs} identity={me.identity} seed={me.id} size={64} you />
        <div>
          <p className="t-title">{shownAs}</p>
          <p className="t-small t-muted">{en.profile.panel(me.panel)}</p>
        </div>
      </section>

      <SettingsGroup title={en.profile.account}>
        <SettingsRow Icon={UserRound} label={en.profile.manage} onClick={notYet} />
        <SettingsRow Icon={KeyRound} label={en.profile.security} onClick={notYet} />
        <SettingsRow Icon={Bell} label={en.profile.notifications} onClick={notYet} />
        <SettingsRow Icon={Globe} label={en.profile.language} value={en.profile.languageValue} onClick={notYet} />
      </SettingsGroup>

      <SettingsGroup title={en.profile.preferences}>
        <SettingsRow Icon={Info} label={en.profile.about} onClick={notYet} />
        <SettingsRow Icon={Palette} label={en.profile.theme} value={en.profile.themeValue} onClick={notYet} />
        <li className="settings-row settings-row--stacked">
          <fieldset className="segmented-field">
            <legend className="settings-row__label">
              <Wifi size={20} aria-hidden="true" />
              {en.profile.lowData}
            </legend>
            <div className="segmented">
              {LOW_DATA.map((value) => (
                <label key={value} className="segmented__option">
                  <input
                    type="radio"
                    name="lowData"
                    value={value}
                    checked={setting === value}
                    onChange={() => setSetting(value)}
                  />
                  <span className="segmented__face">
                    {setting === value && <span className="you-dot" aria-hidden="true" />}
                    {en.profile.lowDataOptions[value]}
                  </span>
                </label>
              ))}
            </div>
            <p className="t-small t-muted">
              {en.profile.lowDataHelp} {en.profile.lowDataNow(mode === 'lite')}.
            </p>
          </fieldset>
        </li>
      </SettingsGroup>

      <section aria-labelledby="privacy-title" id="privacy" className="settings-group">
        <h2 id="privacy-title" ref={privacyRef} tabIndex={-1} className="settings-group__title">
          {en.profile.privacy}
        </h2>
        <fieldset className="privacy soft-card">
          <legend className="sr-only">{en.profile.privacy}</legend>
          {IDENTITIES.map((value) => {
            const checked = me.identity === value;
            return (
              <label key={value} className={`privacy__option${checked ? ' is-checked' : ''}`}>
                <span className="privacy__text">
                  <span className="privacy__label">
                    {checked && <span className="you-dot" aria-hidden="true" />}
                    {en.profile.identity[value]}
                  </span>
                  {checked && (
                    <span className="t-small t-muted">
                      {value === 'name'
                        ? en.profile.identityHelp.name(me.name)
                        : value === 'pseudonym'
                          ? en.profile.identityHelp.pseudonym(me.pseudonym)
                          : en.profile.identityHelp.anonymous}
                    </span>
                  )}
                </span>
                <input
                  type="radio"
                  name="identity"
                  className="switch"
                  value={value}
                  checked={checked}
                  onChange={() => setIdentity(value)}
                />
              </label>
            );
          })}
          <p className="privacy__help t-small">{en.profile.privacyHelp}</p>
        </fieldset>
      </section>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      <h2 className="settings-group__title">{title}</h2>
      <ul className="settings-list soft-card">{children}</ul>
    </section>
  );
}

function SettingsRow({ Icon, label, value, onClick }: { Icon: LucideIcon; label: string; value?: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="settings-row" onClick={onClick}>
        <span className="settings-row__label">
          <Icon size={20} aria-hidden="true" />
          {label}
        </span>
        {value && <span className="t-small t-muted">{value}</span>}
        <ChevronRight className="settings-row__chevron" size={20} aria-hidden="true" />
      </button>
    </li>
  );
}
