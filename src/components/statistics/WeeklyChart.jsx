import { formatFocusTime } from '../../hooks/operationLogic';

export default function WeeklyChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.sessions));
  const total = days.reduce((sum, d) => sum + d.sessions, 0);

  return (
    <div>
      <div
        className="weekly-chart"
        role="img"
        aria-label={`Weekly chart. ${total} completed focus sessions this week. The busiest day has ${max === 1 && total === 0 ? 0 : Math.max(...days.map((d) => d.sessions))} sessions.`}
      >
        {days.map((day) => (
          <div className="weekly-chart__col" key={day.dateKey}>
            <span className="weekly-chart__count mono">{day.sessions}</span>
            <div
              className={`weekly-chart__bar${day.isToday ? ' is-today' : ''}`}
              style={{ height: `${Math.max(day.sessions > 0 ? 8 : 2, (day.sessions / max) * 100)}%` }}
              title={`${day.label}: ${day.sessions} sessions, ${formatFocusTime(day.focusMs)}`}
            />
            <span className={`weekly-chart__label${day.isToday ? ' is-today' : ''}`}>{day.label}</span>
            <span className="weekly-chart__minutes mono">{formatFocusTime(day.focusMs)}</span>
          </div>
        ))}
      </div>
      <p className="foot-note">
        Completed focus sessions per day, Monday to Sunday, with focus time under each day.
      </p>
    </div>
  );
}
