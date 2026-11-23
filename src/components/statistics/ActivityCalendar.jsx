import { useState } from 'react';
import { formatFocusTime } from '../../hooks/operationLogic';

function levelFor(sessions) {
  if (sessions <= 0) return 0;
  if (sessions === 1) return 1;
  if (sessions === 2) return 2;
  if (sessions === 3) return 3;
  return 4;
}

export default function ActivityCalendar({ days }) {
  const today = days[days.length - 1];
  const [selectedKey, setSelectedKey] = useState(today?.dateKey);
  const selected = days.find((d) => d.dateKey === selectedKey) ?? today;

  return (
    <div>
      <div className="activity-calendar" role="group" aria-label="Last 35 days of focus activity">
        {days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            data-cursor-hover
            className={`activity-day level-${levelFor(day.sessions)}${day.isToday ? ' is-today' : ''}${selected?.dateKey === day.dateKey ? ' is-selected' : ''}`}
            onClick={() => setSelectedKey(day.dateKey)}
            aria-pressed={selected?.dateKey === day.dateKey}
            aria-label={`${day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${day.sessions} completed focus sessions`}
            title={day.date.toLocaleDateString('en-GB')}
          >
            <span aria-hidden="true">{day.date.getDate()}</span>
          </button>
        ))}
      </div>

      {selected && (
        <p className="calendar-detail" role="status">
          <strong>
            {selected.date.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {selected.isToday ? ' (today)' : ''}
          </strong>
          {' · '}
          {selected.sessions} completed focus session{selected.sessions === 1 ? '' : 's'}
          {' · '}
          {formatFocusTime(selected.focusMs)} of focus
        </p>
      )}

      <p className="foot-note">Last 35 days. Darker squares mean more completed focus sessions. Pick a day for details.</p>
    </div>
  );
}
