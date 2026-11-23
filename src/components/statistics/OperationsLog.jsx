import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import {
  OUTCOME_LABELS,
  SESSION_TYPE_LABELS,
  groupRecordsByDay,
  recordDesignation,
} from '../../hooks/operationLogic';
import { formatTime } from '../../hooks/timerLogic';
import { OUTCOME_TONES } from '../common/statusTones';

function clock(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function RecordRow({ record }) {
  const [open, setOpen] = useState(false);
  const designation = recordDesignation(record);

  return (
    <li className="operation-record">
      <button
        type="button"
        className="operation-record__main" data-cursor-hover
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="mono operation-record__id">{designation}</span>
        <span className="operation-record__type">{SESSION_TYPE_LABELS[record.sessionType]}</span>
        <span className="operation-record__mission">
          {record.missionTitle
            ? `${record.missionTitle}${record.missionCode ? ` (${record.missionCode})` : ''}`
            : record.sessionType === 'focus'
              ? 'Unassigned'
              : ''}
        </span>
        <span className="mono operation-record__times">
          {clock(record.startedAt)} to {clock(record.endedAt)}
        </span>
        <span className="mono operation-record__duration">
          {formatTime(record.actualDurationMs)} active
        </span>
        <StatusBadge tone={OUTCOME_TONES[record.outcome]}>
          {OUTCOME_LABELS[record.outcome]}
        </StatusBadge>
      </button>

      {open && (
        <dl className="operation-record__details">
          <div><dt>Started</dt><dd className="mono">{new Date(record.startedAt).toLocaleString('en-GB')}</dd></div>
          <div><dt>Ended</dt><dd className="mono">{new Date(record.endedAt).toLocaleString('en-GB')}</dd></div>
          <div><dt>Planned</dt><dd className="mono">{formatTime(record.plannedDurationMs)}</dd></div>
          <div><dt>Actual active</dt><dd className="mono">{formatTime(record.actualDurationMs)}</dd></div>
          <div><dt>Mission</dt><dd>{record.missionTitle ? `${record.missionTitle} (${record.missionCode ?? 'no code'})` : 'None'}</dd></div>
          <div><dt>Record ID</dt><dd className="mono record-id">{record.id}</dd></div>
        </dl>
      )}
    </li>
  );
}

export default function OperationsLog({ records, sort = 'newest' }) {
  if (records.length === 0) {
    return <p className="empty-note">No operations match those filters. Try widening the date range.</p>;
  }

  const groups = groupRecordsByDay(records, new Date(), sort);

  return (
    <div>
      {groups.map((group) => (
        <section key={group.key} className="operation-group" aria-label={group.label}>
          <h3 className="operation-group__label">{group.label}</h3>
          <ul className="operation-list">
            {group.records.map((record) => (
              <RecordRow key={record.id} record={record} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
