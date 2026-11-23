import StatusBadge from '../common/StatusBadge';
import { CHANNELS, formatTimestamp } from '../../hooks/communicationLogic';
import { CHANNEL_TONES } from '../common/statusTones';
import { formatTime } from '../../hooks/timerLogic';

/**
 * Command Center preview. Shows the newest saved transmission from
 * the same history the Para-RAID page uses. Nothing is worked out
 * here, it just reads the shared state.
 */
export default function ParaRaidPreview({ timer, communications, onNavigate }) {
  const bars = [6, 11, 8, 15, 10, 17, 7, 13, 9, 16, 6, 12, 8, 14, 10, 5, 12, 9];
  const { latest, preferences } = communications;
  const running = timer.state.status === 'running';

  return (
    <section className="panel" aria-labelledby="paraid-title">
      <div className="panel__head">
        <div className="panel__title">
          <h2 id="paraid-title">Para-RAID</h2>
          <span className="panel__id">LINK CH-01</span>
        </div>
        <StatusBadge tone={preferences.enabled ? 'green' : 'amber'} live={preferences.enabled}>
          {preferences.enabled ? 'Link Stable' : 'Link Disabled'}
        </StatusBadge>
      </div>

      {!preferences.enabled ? (
        <p className="empty-note">
          Para-RAID is turned off. No messages are being recorded. You can turn it back on from
          the Para-RAID page.
        </p>
      ) : latest ? (
        <div className="paraid-message" key={latest.id}>
          <span className="paraid-message__meta">
            <StatusBadge tone={CHANNEL_TONES[latest.category]}>{CHANNELS[latest.category]}</StatusBadge>
            <span className="transmission__label">{latest.label}</span>
          </span>
          <p className="paraid-message__text">{latest.text}</p>
          <p className="paraid-message__time">
            {formatTimestamp(latest.at)}
            {running ? ` · ${formatTime(timer.state.remainingMs)} left in this session` : ''}
          </p>
        </div>
      ) : (
        <div className="paraid-message">
          <span className="ops-label">Command Link</span>
          <p className="paraid-message__text">System ready. No session is running.</p>
          <p className="paraid-message__time">Standby</p>
        </div>
      )}

      <div className="paraid-wave" aria-hidden="true">
        {bars.map((h, i) => (
          <i key={i} style={{ height: h }} />
        ))}
      </div>

      <div className="panel__foot">
        <span className="foot-note">The newest transmission, from the shared log.</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onNavigate('paraid')}>
          Open Para-RAID →
        </button>
      </div>
    </section>
  );
}
