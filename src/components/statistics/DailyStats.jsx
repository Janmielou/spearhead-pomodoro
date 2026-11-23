import { computeStats, formatFocusTime } from '../../hooks/operationLogic';
import { formatTime } from '../../hooks/timerLogic';

/**
 * Command Center summary. Every number comes from the same saved
 * operation records the Operations History page uses, plus the
 * mission counts. Nothing here is estimated or filled in.
 */
export default function DailyStats({ missionsApi, operations, onNavigate }) {
  const { counts } = missionsApi;
  const stats = computeStats(operations.records);

  const cards = [
    { label: "Today's Focus Time", value: formatFocusTime(stats.todayFocusMs), sub: `${stats.todaySessions} session${stats.todaySessions === 1 ? '' : 's'} finished today` },
    { label: 'Total Focus Time', value: formatFocusTime(stats.totalFocusMs), sub: `${stats.completedFocusSessions} focus session${stats.completedFocusSessions === 1 ? '' : 's'} finished` },
    { label: 'Current Streak', value: String(stats.streak).padStart(2, '0'), sub: `day${stats.streak === 1 ? '' : 's'} with a finished focus session` },
    { label: 'Active Missions', value: String(counts.active).padStart(2, '0'), sub: `${counts.completed} mission${counts.completed === 1 ? '' : 's'} completed` },
  ];

  return (
    <section className="panel" aria-labelledby="stats-title">
      <div className="panel__head">
        <div className="panel__title">
          <h2 id="stats-title">Summary</h2>
          <span className="panel__id">YOUR RECORDS</span>
        </div>
        <span className="panel__id mono">
          AVG {stats.completedFocusSessions > 0 ? formatTime(stats.averageFocusMs) : '0m'}
        </span>
      </div>

      <div className="stats-grid">
        {cards.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="ops-label">{s.label}</span>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="panel__foot">
        <span className="foot-note">Counted from your saved operation records.</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onNavigate('history')}>
          Operations History →
        </button>
      </div>
    </section>
  );
}
