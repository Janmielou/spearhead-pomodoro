import { useEffect, useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import MissionProgress from './MissionProgress';
import MissionForm from './MissionForm';
import ObjectiveList from './ObjectiveList';
import { MISSION_STATUS_TONES, PRIORITY_TONES } from '../common/statusTones';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDeadline,
  isOverdue,
  missionCompletionCheck,
  missionProgress,
} from '../../hooks/missionLogic';

export default function MissionDetails({
  mission,
  onEditMission,
  onChangeStatus,
  onRequestDelete,
  onAddObjective,
  onToggleObjective,
  onUpdateObjective,
  onDeleteObjective,
}) {
  const [editing, setEditing] = useState(false);
  const [completionError, setCompletionError] = useState('');

  // Close the editor whenever a different mission is opened.
  useEffect(() => {
    setEditing(false);
    setCompletionError('');
  }, [mission?.id]);

  if (!mission) {
    return (
      <section className="panel" aria-label="Mission details">
        <p className="empty-note">Select a mission from the list to see its details.</p>
      </section>
    );
  }

  const progress = missionProgress(mission);
  const check = missionCompletionCheck(mission);
  const allDone = check.canComplete;
  const archived = mission.status === 'archived';
  const completedMission = mission.status === 'completed';
  const overdue = isOverdue(mission);

  const tryComplete = () => {
    if (!check.canComplete) {
      setCompletionError(check.message);
      return;
    }
    setCompletionError('');
    onChangeStatus(mission.id, 'completed');
  };

  const handleEditSubmit = (changes) => {
    if (
      changes.status === 'completed' &&
      mission.status !== 'completed' &&
      !check.canComplete
    ) {
      setCompletionError(check.message);
      return;
    }
    onEditMission(mission.id, changes);
    setEditing(false);
  };

  return (
    <section className="panel" aria-labelledby="mission-details-title">
      <div className="panel__head">
        <div className="panel__title">
          <h2 id="mission-details-title">{mission.title}</h2>
          <span className="panel__id">{mission.code}</span>
        </div>
        <StatusBadge tone={MISSION_STATUS_TONES[mission.status]}>
          {STATUS_LABELS[mission.status]}
        </StatusBadge>
      </div>

      {completionError && (
        <p className="form-error" role="alert" style={{ marginBottom: 12 }}>
          {completionError}
        </p>
      )}

      {editing ? (
        <MissionForm
          initial={mission}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {mission.description ? (
            <p className="mission-details__desc">{mission.description}</p>
          ) : (
            <p className="mission-details__desc muted">No description added.</p>
          )}

          <dl className="mission-meta">
            <div>
              <dt>Priority</dt>
              <dd>
                <StatusBadge tone={PRIORITY_TONES[mission.priority]}>
                  {PRIORITY_LABELS[mission.priority]}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd className="mono">
                {mission.deadline ? formatDeadline(mission.deadline) : 'None set'}
                {overdue && <span className="overdue"> Overdue</span>}
              </dd>
            </div>
            <div>
              <dt>Estimated sessions</dt>
              <dd className="mono">{mission.estimatedSessions ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd className="mono">
                {new Date(mission.updatedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>

          <div className="mission-details__progress">
            <span className="ops-label">Objective progress</span>
            <MissionProgress mission={mission} />
          </div>

          {allDone && mission.status !== 'completed' && !archived && (
            <p className="suggest-complete" role="status">
              All objectives are done. You can mark this mission complete whenever you are ready.
              <button
                type="button"
                className="btn btn--primary btn--small"
                onClick={tryComplete}
              >
                Mark Complete
              </button>
            </p>
          )}

          <div className="mission-actions">
            {!archived && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(true)}>
                Edit Mission
              </button>
            )}
            {mission.status !== 'completed' && !archived && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={tryComplete}
              >
                Mark Complete
              </button>
            )}
            {mission.status === 'completed' && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => onChangeStatus(mission.id, 'active')}
              >
                Reopen Mission
              </button>
            )}
            {!archived ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => onChangeStatus(mission.id, 'archived')}
              >
                Archive
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => onChangeStatus(mission.id, 'pending')}
              >
                Restore
              </button>
            )}
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() => onRequestDelete(mission)}
            >
              Delete
            </button>
          </div>

          <h3 className="mission-details__objectives">Objectives</h3>
          <ObjectiveList
            mission={mission}
            readOnly={archived || completedMission}
            onAdd={onAddObjective}
            onToggle={onToggleObjective}
            onUpdate={onUpdateObjective}
            onDelete={onDeleteObjective}
          />
          {archived && (
            <p className="foot-note">This mission is archived. Restore it before changing objectives.</p>
          )}
          {completedMission && (
            <p className="foot-note">This mission is completed. Reopen it before changing objectives.</p>
          )}
        </>
      )}
    </section>
  );
}
