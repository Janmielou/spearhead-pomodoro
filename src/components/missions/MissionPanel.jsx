import StatusBadge from '../common/StatusBadge';
import MissionProgress from './MissionProgress';
import { MISSION_STATUS_TONES, PRIORITY_TONES } from '../common/statusTones';
import { PRIORITY_LABELS, STATUS_LABELS, missionProgress } from '../../hooks/missionLogic';

/**
 * Command Center preview, read only. Reads the same saved missions
 * as Mission Control, so changes show up here straight away.
 * All editing happens in Mission Control.
 * Shows active and pending missions only, most recently updated first.
 */
export default function MissionPanel({ missionsApi, onNavigate }) {
  const { missions, counts } = missionsApi;

  const shown = [...missions]
    .filter((m) => m.status === 'active' || m.status === 'pending')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <section className="panel" aria-labelledby="missions-title">
      <div className="panel__head">
        <div className="panel__title">
          <h2 id="missions-title">Mission Objectives</h2>
          <span className="panel__id">{counts.active} ACTIVE</span>
        </div>
        <StatusBadge tone={missions.length > 0 ? 'green' : 'amber'}>
          {missions.length > 0 ? 'Live Data' : 'No Missions'}
        </StatusBadge>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state empty-state--small">
          <span className="ops-label">No active missions</span>
          <p>Your board is clear. Create a mission to start organizing your objectives.</p>
        </div>
      ) : (
        shown.map((mission) => (
          <div className="mission-block" key={mission.id}>
            <div className="mission-block__head">
              <span className="mission-block__id">{mission.code}</span>
              <span className="mission-block__title">{mission.title}</span>
              <StatusBadge tone={PRIORITY_TONES[mission.priority]}>
                {PRIORITY_LABELS[mission.priority]}
              </StatusBadge>
              <StatusBadge tone={MISSION_STATUS_TONES[mission.status]}>
                {STATUS_LABELS[mission.status]}
              </StatusBadge>
              <span className="mission-progress__text mono" style={{ marginLeft: 'auto' }}>
                {(() => { const p = missionProgress(mission); return p.total === 0 ? 'NO OBJECTIVES' : `${p.completed}/${p.total} · ${p.percent}%`; })()}
              </span>
            </div>
            <MissionProgress mission={mission} showText={false} />
            {mission.objectives.length === 0 ? (
              <p className="empty-note">No objectives yet. Add them in Mission Control.</p>
            ) : (
              <ul className="objective-list">
                {mission.objectives.slice(0, 4).map((obj) => (
                  <li key={obj.id} className={`objective${obj.completed ? ' is-done' : ''}`}>
                    <span className="objective__marker" aria-hidden="true">
                      {obj.completed ? '✓' : '·'}
                    </span>
                    <span className="objective__text">{obj.title}</span>
                    <span className="objective__state mono">
                      {obj.completed ? 'DONE' : 'TO DO'}
                    </span>
                    {obj.estimatedSessions && (
                      <span className="objective__est">
                        {obj.estimatedSessions} session{obj.estimatedSessions === 1 ? '' : 's'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {mission.objectives.length > 4 && (
              <p className="mission-block__status mono">
                Showing 4 of {mission.objectives.length} objectives
              </p>
            )}
          </div>
        ))
      )}

      <div className="panel__foot">
        <span className="foot-note">
          {missions.length > 0
            ? 'Read only overview. Make changes in Mission Control.'
            : 'Missions you create are saved in your browser.'}
        </span>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onNavigate('missions')}>
          Open Mission Control →
        </button>
      </div>
    </section>
  );
}
