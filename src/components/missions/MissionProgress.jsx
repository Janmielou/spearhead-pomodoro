import { missionProgress } from '../../hooks/missionLogic';

export default function MissionProgress({ mission, showText = true }) {
  const { total, completed, percent } = missionProgress(mission);
  return (
    <>
      <div
        className="mission-progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${mission.title} progress`}
      >
        <div className="mission-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      {showText && (
        <span className="mission-progress__text mono">
          {total === 0 ? 'NO OBJECTIVES' : `${completed}/${total} · ${percent}%`}
        </span>
      )}
    </>
  );
}
