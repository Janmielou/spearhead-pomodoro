import StatusBadge from '../common/StatusBadge';
import { CHANNELS, formatTimestamp } from '../../hooks/communicationLogic';
import { CHANNEL_TONES } from '../common/statusTones';

export default function TransmissionList({ messages }) {
  if (messages.length === 0) {
    return (
      <p className="empty-note">
        No transmissions yet. Start a focus session or create a mission and the first ones will
        appear here.
      </p>
    );
  }

  // Newest first. The stored list itself stays in time order.
  const ordered = [...messages].reverse();

  return (
    <ol className="transmission-list">
      {ordered.map((message) => (
        <li key={message.id} className="transmission">
          <span className="transmission__bar" aria-hidden="true" />
          <div className="transmission__body">
            <div className="transmission__top">
              <StatusBadge tone={CHANNEL_TONES[message.category]}>
                {CHANNELS[message.category]}
              </StatusBadge>
              <span className="transmission__label">{message.label}</span>
              <span className="transmission__time mono">{formatTimestamp(message.at)}</span>
            </div>
            <p className="transmission__text">{message.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
