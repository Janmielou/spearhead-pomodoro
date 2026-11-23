import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { TIMER_STATUS_TONES } from '../common/statusTones';
import { SESSION_LABELS, formatClock, formatTime } from '../../hooks/timerLogic';

const STATUS_BADGE = {
  standby: { tone: TIMER_STATUS_TONES.standby, label: 'Standby' },
  running: { tone: TIMER_STATUS_TONES.running, label: 'Running' },
  paused: { tone: TIMER_STATUS_TONES.paused, label: 'Paused' },
  completed: { tone: TIMER_STATUS_TONES.completed, label: 'Completed' },
};

export default function FocusTimer({ timer, missionsApi, animationsEnabled = true }) {
  const missions = missionsApi?.missions ?? [];
  const { state, settings, start, pause, resume, reset, skip, beginNext } = timer;
  const { status, sessionType } = state;

  const R = 118;
  const C = 2 * Math.PI * R;
  const fraction = state.durationMs > 0 ? state.remainingMs / state.durationMs : 0;

  // Mission assignment. Only pending and active missions can be
  // picked, and the choice is locked while a session runs or pauses.
  const eligibleMissions = missions.filter((m) => m.status === 'pending' || m.status === 'active');
  const assignedId = timer.state.assignedMissionId;
  const assignedMission = eligibleMissions.find((m) => m.id === assignedId) ?? null;
  const snapshotFor = (mission) =>
    mission
      ? { missionId: mission.id, missionTitle: mission.title, missionCode: mission.code }
      : null;
  const selectorLocked = status === 'running' || status === 'paused';

  // Activation sequences. Triggered only by genuine state
  // transitions observed between renders, never by a render itself.
  // The first observation after mount only records the current
  // state, so refreshing a running timer replays nothing.
  const [sequence, setSequence] = useState(null);
  const previousRef = useRef(null);
  const sequenceTimerRef = useRef(null);

  useEffect(() => {
    const previous = previousRef.current;
    const current = { status, sessionType, sessionId: state.sessionId };
    previousRef.current = current;
    if (!previous) return;

    let kind = null;
    if (
      status === 'running' &&
      previous.status !== 'running' &&
      previous.status !== 'paused' &&
      sessionType === 'focus' &&
      state.sessionId !== previous.sessionId
    ) {
      kind = 'deploy';
    } else if (
      status === 'running' &&
      previous.status === 'paused' &&
      state.sessionId === previous.sessionId
    ) {
      kind = 'resume';
    } else if (status === 'completed' && previous.status === 'running') {
      kind = 'complete';
    }

    if (kind) {
      setSequence({ kind, sessionId: state.sessionId });
    } else if (status === 'paused' || status === 'standby') {
      setSequence(null);
    }
  }, [status, sessionType, state.sessionId]);

  useEffect(() => {
    if (!sequence) return undefined;
    const duration = !animationsEnabled ? 650 : sequence.kind === 'deploy' ? 1150 : sequence.kind === 'complete' ? 1050 : 700;
    sequenceTimerRef.current = window.setTimeout(() => setSequence(null), duration);
    return () => window.clearTimeout(sequenceTimerRef.current);
  }, [sequence, animationsEnabled]);

  useEffect(() => () => window.clearTimeout(sequenceTimerRef.current), []);

  const badge = STATUS_BADGE[status];
  const sessionLabel = SESSION_LABELS[sessionType];
  const timeLeft = formatTime(state.remainingMs);

  const currentFocusNumber =
    sessionType === 'focus'
      ? Math.min(settings.sessionsPerCycle, state.completedInCycle + 1)
      : Math.max(1, state.completedInCycle);

  const helperText =
    status === 'running'
      ? `Ends at ${formatClock(state.endTime)}.`
      : status === 'paused'
        ? 'Paused. Your remaining time is saved.'
        : status === 'completed'
          ? sessionType === 'focus'
            ? 'Session counted. Start your break when you are ready.'
            : 'Break over. Start the next focus session when you are ready.'
          : `${settings.focusMinutes} min focus, ${settings.shortBreakMinutes} min break, ${settings.longBreakMinutes} min long break.`;

  return (
    <section
      className={`panel timer-panel timer-panel--${status}${sessionType !== 'focus' ? ' is-break' : ''}${sequence ? ` is-sequence-${sequence.kind}` : ''}`}
      aria-labelledby="timer-title"
    >
      <div className="panel__head terminal-header" style={{ textAlign: 'left' }}>
        <div className="panel__title">
          <span className="ops-label" id="timer-title">Current Operation</span>
          <span className="panel__id">
            OP-{String(Math.max(1, state.sessionId)).padStart(4, '0')} · CYCLE {state.cycleNumber}
          </span>
        </div>
        <StatusBadge tone={badge.tone} live={status === 'running'}>{badge.label}</StatusBadge>
      </div>

      {sequence && (
        <div className={`timer-hud-status timer-hud-status--${sequence.kind}`} role="status">
          {sequence.kind === 'deploy' && (
            <>
              <strong>Authorization Confirmed</strong>
              <span>Deployment sequence initiated</span>
              <span>Operation active / Focus interval initiated</span>
            </>
          )}
          {sequence.kind === 'resume' && (
            <>
              <strong>Communications Restored</strong>
              <span>Operation resumed</span>
            </>
          )}
          {sequence.kind === 'complete' && (
            <>
              <strong>Operation Complete</strong>
              <span>Results recorded</span>
            </>
          )}
        </div>
      )}

      <div
        className="timer-ring-wrap"
        role="img"
        aria-label={`${sessionLabel} timer showing ${timeLeft} left. Status: ${badge.label}`}
      >
        <svg className="timer-ring" width="264" height="264" viewBox="0 0 264 264" aria-hidden="true">
          <circle className="timer-ring__ticks" cx="132" cy="132" r="128" />
          <g className="hud-ring hud-ring--outer" aria-hidden="true">
            <circle className="hud-ring__circle" cx="132" cy="132" r="123" />
            <circle className="hud-marker" cx="132" cy="9" r="2" />
            <circle className="hud-marker" cx="255" cy="132" r="2" />
            <circle className="hud-marker" cx="132" cy="255" r="2" />
            <circle className="hud-marker" cx="9" cy="132" r="2" />
          </g>
          <g className="hud-ring hud-ring--scan" aria-hidden="true">
            <circle className="hud-ring__scan" cx="132" cy="132" r="113" />
          </g>
          <g className="hud-ring hud-ring--inner" aria-hidden="true">
            <circle className="hud-ring__circle" cx="132" cy="132" r="104" />
            <circle className="hud-marker" cx="205" cy="59" r="1.6" />
            <circle className="hud-marker" cx="205" cy="205" r="1.6" />
            <circle className="hud-marker" cx="59" cy="205" r="1.6" />
            <circle className="hud-marker" cx="59" cy="59" r="1.6" />
          </g>
          <circle className="timer-ring__track" cx="132" cy="132" r={R} />
          <circle
            className="timer-ring__progress"
            cx="132" cy="132" r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fraction)}
          />
        </svg>
        <div className="timer-center">
          <span className="timer-session-type">{sessionLabel}</span>
          <span className={`timer-time${timeLeft.length > 5 ? ' timer-time--long' : ''}`}>{timeLeft}</span>
          <span className="timer-status">
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </span>
        </div>
        <span className="timer-scanline" aria-hidden="true" />
        <span className="timer-complete-pulse" aria-hidden="true" />
      </div>

      <div className="cycle-dots" aria-hidden="true">
        {Array.from({ length: settings.sessionsPerCycle }, (_, i) => {
          const done = i < state.completedInCycle;
          const current =
            sessionType === 'focus' && status !== 'completed' && i === state.completedInCycle;
          return (
            <span key={i} className={`cycle-dot${done ? ' is-done' : ''}${current ? ' is-current' : ''}`} />
          );
        })}
      </div>
      <p className="cycle-caption">
        {sessionType === 'focus'
          ? `Focus session ${currentFocusNumber} of ${settings.sessionsPerCycle}`
          : `${state.completedInCycle} of ${settings.sessionsPerCycle} focus sessions done`}
        {` · ${state.completedFocusSessions} finished in total`}
      </p>

      <div className="mission-assignment">
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label htmlFor="assigned-mission">Assigned Mission</label>
          <select
            id="assigned-mission"
            value={assignedMission?.id ?? ''}
            disabled={selectorLocked}
            onChange={(e) => timer.setAssignedMissionId(e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {eligibleMissions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title} ({mission.code})
              </option>
            ))}
          </select>
        </div>
        <p className="assignment-note">
          {selectorLocked
            ? 'Locked while this session is in progress.'
            : sessionType !== 'focus'
              ? 'Applies to focus sessions. Breaks are never assigned.'
              : assignedMission
                ? `This focus session will be recorded under ${assignedMission.code}.`
                : 'Optional. You can start without choosing a mission.'}
        </p>
      </div>

      <div className="timer-controls">
        {status === 'standby' && (
          <button
            type="button"
            className="btn btn--primary btn--deploy"
            onClick={() => start(snapshotFor(assignedMission))}
          >
            Start Operation
          </button>
        )}

        {status === 'running' && (
          <>
            <button type="button" className="btn btn--primary" onClick={pause}>
              Pause Operation
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Reset Operation
            </button>
            <button type="button" className="btn btn--ghost" onClick={skip}>
              Skip Session
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button type="button" className="btn btn--primary btn--resume" onClick={resume}>
              Resume Operation
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Reset Operation
            </button>
            <button type="button" className="btn btn--ghost" onClick={skip}>
              Skip Session
            </button>
          </>
        )}

        {status === 'completed' && state.nextType && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => beginNext(state.nextType === 'focus' ? snapshotFor(assignedMission) : null)}
          >
            Begin {SESSION_LABELS[state.nextType]}
          </button>
        )}
      </div>

      <p className="timer-note">{helperText}</p>
    </section>
  );
}
