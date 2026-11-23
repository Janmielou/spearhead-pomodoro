import {
  MISSION_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  SORT_OPTIONS,
  STATUS_LABELS,
} from '../../hooks/missionLogic';

export default function MissionFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="mission-toolbar" role="search">
      <div className="form-field">
        <label htmlFor="mission-search">Search</label>
        <input
          id="mission-search"
          type="search"
          value={value.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search by title or description"
        />
      </div>

      <div className="form-field">
        <label htmlFor="mission-status-filter">Status</label>
        <select
          id="mission-status-filter"
          value={value.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="all">All missions</option>
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="mission-priority-filter">Priority</label>
        <select
          id="mission-priority-filter"
          value={value.priority}
          onChange={(e) => set({ priority: e.target.value })}
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="mission-sort">Sort by</label>
        <select id="mission-sort" value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
