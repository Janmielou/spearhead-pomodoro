import { useState } from 'react';
import StatusBadge from '../components/common/StatusBadge';
import CommunicationSettings from '../components/communication/CommunicationSettings';
import TransmissionList from '../components/communication/TransmissionList';
import { CHANNELS, formatTimestamp } from '../hooks/communicationLogic';
import { CHANNEL_TONES } from '../components/common/statusTones';

export default function ParaRaid({ communications }) {
  const { messages, latest, preferences } = communications;
  const [channelFilter, setChannelFilter] = useState('all');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const visible =
    channelFilter === 'all' ? messages : messages.filter((m) => m.category === channelFilter);

  const linkUp = preferences.enabled;

  return (
    <>
      <section className="panel comms-terminal terminal-surface" aria-labelledby="paraid-net-title">
        <div className="panel__head">
          <div className="panel__title">
            <h2 id="paraid-net-title">Para-RAID Network</h2>
            <span className="panel__id">COMMUNICATION TERMINAL</span>
          </div>
          <StatusBadge tone={linkUp ? 'green' : 'amber'} live={linkUp}>
            {linkUp ? 'Link Stable' : 'Link Disabled'}
          </StatusBadge>
        </div>

        <dl className="comms-grid mono">
          <div><dt>Network</dt><dd>PARA-RAID</dd></div>
          <div><dt>Channel</dt><dd>CH-01</dd></div>
          <div><dt>Status</dt><dd>{linkUp ? 'LINK STABLE' : 'DISABLED'}</dd></div>
          <div><dt>Transmissions</dt><dd>{messages.length} RECORDED</dd></div>
        </dl>
        <p className="terminal-note">
          Link status is local to this app. It shows whether communications are turned on here,
          not a real network connection.
        </p>
      </section>

      <section className="panel" aria-labelledby="paraid-latest-title" style={{ marginTop: 16 }}>
        <div className="panel__head">
          <div className="panel__title">
            <h2 id="paraid-latest-title">Latest Transmission</h2>
          </div>
          {latest && <span className="panel__id mono">{formatTimestamp(latest.at)}</span>}
        </div>
        {latest ? (
          <div className="paraid-message" key={latest.id}>
            <span className="paraid-message__meta">
              <StatusBadge tone={CHANNEL_TONES[latest.category]}>{CHANNELS[latest.category]}</StatusBadge>
              <span className="transmission__label">{latest.label}</span>
            </span>
            <p className="paraid-message__text">{latest.text}</p>
          </div>
        ) : (
          <p className="empty-note">
            Nothing yet. Transmissions appear when sessions start or finish, and when missions
            change.
          </p>
        )}
      </section>

      <div className="dashboard-bottom" style={{ marginTop: 16 }}>
        <section className="panel" aria-labelledby="paraid-history-title">
          <div className="panel__head">
            <div className="panel__title">
              <h2 id="paraid-history-title">Transmission History</h2>
              <span className="panel__id">{visible.length} SHOWN</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-field" style={{ marginBottom: 0, minWidth: 170 }}>
                <label htmlFor="channel-filter">Channel</label>
                <select
                  id="channel-filter"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                >
                  <option value="all">All channels</option>
                  {Object.entries(CHANNELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn--danger btn--small"
                disabled={messages.length === 0}
                onClick={() => setConfirmingClear(true)}
              >
                Clear History
              </button>
            </div>
          </div>
          <TransmissionList messages={visible} />
        </section>

        <section className="panel" aria-labelledby="paraid-settings-title">
          <div className="panel__head">
            <div className="panel__title">
              <h2 id="paraid-settings-title">Communication Preferences</h2>
            </div>
          </div>
          <CommunicationSettings communications={communications} />
        </section>
      </div>

      {confirmingClear && (
        <div className="dialog-backdrop">
          <div
            className="dialog panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-title"
            aria-describedby="clear-desc"
          >
            <h2 id="clear-title">Clear transmission history?</h2>
            <p id="clear-desc">
              All {messages.length} recorded transmission{messages.length === 1 ? '' : 's'} will
              be deleted. Your communication preferences stay as they are, and missions and timer
              data are not touched. This cannot be undone.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  communications.clearHistory();
                  setConfirmingClear(false);
                }}
              >
                Clear History
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmingClear(false)}
                autoFocus
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
