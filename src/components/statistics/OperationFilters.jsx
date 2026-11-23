import { OUTCOMES, OUTCOME_LABELS, SESSION_TYPE_LABELS } from '../../hooks/operationLogic';

export default function OperationFilters({ value, onChange, missions }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="ops-filters">
      <div className="form-field">
        <label htmlFor="ops-range">Date range</label>
        <select id="ops-range" value={value.range} onChange={(e) => set({ range: e.target.value })}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {value.range === 'custom' && (
        <>
          <div className="form-field">
            <label htmlFor="ops-from">From</label>
            <input
              id="ops-from"
              type="date"
              value={value.from}
              onChange={(e) => set({ from: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label htmlFor="ops-to">To</label>
            <input
              id="ops-to"
              type="date"
              value={value.to}
              onChange={(e) => set({ to: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="form-field">
        <label htmlFor="ops-mission">Mission</label>
        <select id="ops-mission" value={value.mission} onChange={(e) => set({ mission: e.target.value })}>
          <option value="all">All missions</option>
          <option value="unassigned">Unassigned</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title} {mission.code ? `(${mission.code})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="ops-type">Session type</label>
        <select id="ops-type" value={value.sessionType} onChange={(e) => set({ sessionType: e.target.value })}>
          <option value="all">All sessions</option>
          {Object.entries(SESSION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="ops-outcome">Outcome</label>
        <select id="ops-outcome" value={value.outcome} onChange={(e) => set({ outcome: e.target.value })}>
          <option value="all">All outcomes</option>
          {OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {OUTCOME_LABELS[outcome]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="ops-sort">Order</label>
        <select id="ops-sort" value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
