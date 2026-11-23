import StatusBadge from '../common/StatusBadge';
import MissionProgress from './MissionProgress';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDeadline,
  isOverdue,
} from '../../hooks/missionLogic';

import { MISSION_STATUS_TONES, PRIORITY_TONES } from '../common/statusTones';

export default function MissionCard({ mission, selected, onSelect }) {
  const overdue = isOverdue(mission);

  return (
    <article className={`mission-card${selected ? ' is-selected' : ''}`}>
      <button
        type="button"
        className="mission-card__main" data-cursor-hover
        onClick={() => onSelect(mission.id)}
        aria-pressed={selected}
      >
        <span className="mission-card__top">
          <span className="mono mission-card__code">{mission.code}</span>
          <StatusBadge tone={PRIORITY_TONES[mission.priority]}>
            {PRIORITY_LABELS[mission.priority]}
          </StatusBadge>
          <StatusBadge tone={MISSION_STATUS_TONES[mission.status]}>
            {STATUS_LABELS[mission.status]}
          </StatusBadge>
        </span>
        <span className="mission-card__title">{mission.title}</span>
        <MissionProgress mission={mission} />
        <span className="mission-card__meta mono">
          {mission.deadline
            ? `Due ${formatDeadline(mission.deadline)}${overdue ? ' · Overdue' : ''}`
            : 'No deadline'}
          {mission.estimatedSessions ? ` · Est. ${mission.estimatedSessions} sessions` : ''}
        </span>
      </button>
    </article>
  );
}
