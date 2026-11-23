import { useEffect, useState } from 'react';
import StatusBadge from '../common/StatusBadge';

const PAGE_TITLES = {
  command: 'Command Center',
  missions: 'Mission Control',
  paraid: 'Para-RAID',
  history: 'Operations History',
  settings: 'System Configuration',
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Topbar({ activePage, onMenu }) {
  const now = useClock();
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu"
        aria-label="Open navigation menu"
        onClick={onMenu}
      >
        ☰
      </button>

      <div className="topbar__title">
        <h1>{PAGE_TITLES[activePage] ?? 'Command Center'}</h1>
      </div>

      <div className="topbar__spacer" />

      <StatusBadge tone="green" live>Operational</StatusBadge>

      <div className="topbar__clock" aria-label={`Current time ${time}`}>
        <div className="mono">{time}</div>
        <div className="topbar__date">{date}</div>
      </div>
    </header>
  );
}
