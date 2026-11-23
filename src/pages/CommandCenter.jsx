import FocusTimer from '../components/timer/FocusTimer';
import MissionPanel from '../components/missions/MissionPanel';
import ParaRaidPreview from '../components/communication/ParaRaidPreview';
import DailyStats from '../components/statistics/DailyStats';
function WelcomePanel() {
  return (
    <section className="panel operator-strip" aria-label="Welcome" style={{ marginBottom: 16 }}>
      <div className="operator-strip__greeting">
        <h2>Welcome back.</h2>
        <p>Pick a task, review your objectives, and begin an operation when you're ready.</p>
      </div>
    </section>
  );
}

function SessionInfo({ timer, onNavigate }) {
  const { state, settings } = timer;
  const nextBreak =
    state.sessionType !== 'focus'
      ? 'Back to focus after this break.'
      : state.completedInCycle + 1 >= settings.sessionsPerCycle
        ? `A ${settings.longBreakMinutes} minute long break follows this session.`
        : `A ${settings.shortBreakMinutes} minute break follows this session.`;
  const stateText =
    state.status === 'running'
      ? `Running. ${state.sessionType === 'focus' ? 'Focus session' : 'Break'} in progress.`
      : state.status === 'paused'
        ? 'Paused. The clock is holding your place.'
        : state.status === 'completed'
          ? 'Finished. Ready for the next session.'
          : 'Idle. No session is running.';
  return (
    <section className="panel" aria-labelledby="intel-title">
      <div className="panel__head">
        <div className="panel__title">
          <h2 id="intel-title">Session Info</h2>
          <span className="panel__id">INFO</span>
        </div>
      </div>

      <svg className="radar" width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="Radar display. Nothing active right now">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--light-steel-blue)" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="var(--light-steel-blue)" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="var(--light-steel-blue)" />
        <line x1="60" y1="6" x2="60" y2="114" stroke="var(--pale-blue)" />
        <line x1="6" y1="60" x2="114" y2="60" stroke="var(--pale-blue)" />
        <g className="radar__sweep">
          <path d="M60 60 L60 6 A54 54 0 0 1 98 22 Z" fill="rgba(86,201,242,0.18)" />
        </g>
        <circle cx="60" cy="60" r="3" fill="var(--deep-blue)" />
        <circle cx="82" cy="44" r="2.5" fill="var(--status-green-bright)" />
      </svg>

      <ul className="module-tasks terminal-surface terminal-readout" style={{ marginBottom: 0 }}>
        <li><span className="mono">STATE</span> {stateText}</li>
        <li><span className="mono">NEXT</span> {nextBreak}</li>
        <li><span className="mono">CYCLE</span> {state.completedInCycle} of {settings.sessionsPerCycle} focus sessions done in cycle {state.cycleNumber}.</li>
      </ul>

      <div className="panel__foot">
        <span className="foot-note">The screen lighting follows the timer. Brighter while running, softer on breaks.</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onNavigate('paraid')}>
          Open Para-RAID →
        </button>
      </div>
    </section>
  );
}

export default function CommandCenter({ timer, missionsApi, communications, operations, interfacePreferences, onNavigate }) {
  return (
    <>
      <WelcomePanel />
      <div className="dashboard-grid">
        <div className="dashboard-col">
          <FocusTimer timer={timer} missionsApi={missionsApi} animationsEnabled={interfacePreferences?.preferences.animations ?? true} />
        </div>
        <div className="dashboard-col">
          <ParaRaidPreview timer={timer} communications={communications} onNavigate={onNavigate} />
          <DailyStats timer={timer} missionsApi={missionsApi} operations={operations} onNavigate={onNavigate} />
        </div>
      </div>
      <div className="dashboard-bottom">
        <MissionPanel missionsApi={missionsApi} onNavigate={onNavigate} />
        <SessionInfo timer={timer} onNavigate={onNavigate} />
      </div>
      <p className="foot-note" style={{ marginTop: 16, textAlign: 'center' }}>
        SPEARHEAD is an unofficial fan project. It is not connected to the creators of 86.
      </p>
    </>
  );
}
