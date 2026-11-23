import { formatFocusTime } from '../../hooks/operationLogic';
import { formatTime } from '../../hooks/timerLogic';

function durationOrDash(ms, count) {
  return count > 0 ? formatTime(ms) : '0m';
}

export default function OperationStats({ stats }) {
  const cards = [
    { label: 'Completed Focus Sessions', value: stats.completedFocusSessions, sub: 'reached zero, all time' },
    { label: 'Total Focus Time', value: formatFocusTime(stats.totalFocusMs), sub: 'actual active time' },
    { label: 'Average Focus Session', value: durationOrDash(stats.averageFocusMs, stats.completedFocusSessions), sub: 'per completed session' },
    { label: 'Longest Focus Session', value: durationOrDash(stats.longestFocusMs, stats.completedFocusSessions), sub: 'single session' },
    { label: 'Current Focus Streak', value: stats.streak, sub: `day${stats.streak === 1 ? '' : 's'} in a row` },
  ];

  return (
    <>
      <div className="ops-stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span className="ops-label">{card.label}</span>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__sub">{card.sub}</div>
          </div>
        ))}
      </div>

      <dl className="mission-counts ops-range-strip">
        <div>
          <dt>Today</dt>
          <dd className="mono">{stats.todaySessions} sessions · {formatFocusTime(stats.todayFocusMs)}</dd>
        </div>
        <div>
          <dt>This Week (Mon to Sun)</dt>
          <dd className="mono">{stats.weekSessions} sessions · {formatFocusTime(stats.weekFocusMs)}</dd>
        </div>
        <div>
          <dt>Records</dt>
          <dd className="mono">{stats.totalRecords} operations logged</dd>
        </div>
      </dl>
    </>
  );
}
