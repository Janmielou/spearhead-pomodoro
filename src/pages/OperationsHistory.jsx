import { useMemo, useState } from 'react';
import OperationStats from '../components/statistics/OperationStats';
import WeeklyChart from '../components/statistics/WeeklyChart';
import ActivityCalendar from '../components/statistics/ActivityCalendar';
import OperationFilters from '../components/statistics/OperationFilters';
import OperationsLog from '../components/statistics/OperationsLog';
import {
  calendarActivity,
  computeStats,
  distinctMissions,
  filterRecords,
  legacySessionCount,
  weeklyActivity,
} from '../hooks/operationLogic';

export default function OperationsHistory({ operations, timer }) {
  const { records } = operations;
  const [filters, setFilters] = useState({
    range: 'all',
    from: '',
    to: '',
    mission: 'all',
    sessionType: 'all',
    outcome: 'all',
    sort: 'newest',
  });

  const now = new Date();
  const stats = useMemo(() => computeStats(records, now), [records]);
  const week = useMemo(() => weeklyActivity(records, now), [records]);
  const calendar = useMemo(() => calendarActivity(records, now, 35), [records]);
  const visible = useMemo(() => filterRecords(records, filters, now), [records, filters]);
  const missionOptions = useMemo(() => distinctMissions(records), [records]);

  // Sessions finished before Phase 5 only exist as the timer's total
  // counter. They have no timestamps or durations saved, so they can
  // never become individual records. Say so instead of hiding it,
  // whether or not any new records exist yet.
  const legacyCount = legacySessionCount(
    timer?.state.completedFocusSessions ?? 0,
    stats.completedFocusSessions,
  );

  return (
    <>
      <section className="panel mission-page-head" aria-labelledby="history-title">
        <div>
          <span className="ops-label">Operations History</span>
          <h2 id="history-title">Operational Archive</h2>
          <p>Operational records, session performance, and historical activity.</p>
        </div>
        <dl className="mission-counts terminal-surface terminal-counts">
          <div><dt>Recorded</dt><dd className="mono">{records.length}</dd></div>
          <div><dt>Focus Done</dt><dd className="mono">{stats.completedFocusSessions}</dd></div>
          <div><dt>Streak</dt><dd className="mono">{stats.streak}d</dd></div>
        </dl>
      </section>

      {records.length === 0 ? (
        <section className="panel empty-state" aria-label="No records yet">
          <span className="ops-label">No operations recorded</span>
          <h2>Your archive is empty.</h2>
          <p>
            Finish, skip, or reset a timer session and it will be recorded here with its real
            times. Detailed recording started with this version, so older sessions are not
            listed.
          </p>
          {legacyCount > 0 && (
            <p>
              Your detailed operational archive is currently empty. You have {legacyCount} focus
              session{legacyCount === 1 ? '' : 's'} completed before individual operation
              recording was introduced. Their original timestamps, durations, and mission
              associations are unavailable, so they cannot be displayed as individual records.
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="panel" aria-label="Overview statistics" style={{ marginBottom: 16 }}>
            <div className="panel__head">
              <div className="panel__title"><h2>Overview</h2></div>
              <span className="panel__id">COMPLETED FOCUS ONLY</span>
            </div>
            <OperationStats stats={stats} />
            {legacyCount > 0 && (
              <p className="foot-note" style={{ marginTop: 12 }}>
                Note: {legacyCount} earlier focus session{legacyCount === 1 ? '' : 's'} counted by
                the timer before detailed recording began {legacyCount === 1 ? 'has' : 'have'} no
                individual record, so {legacyCount === 1 ? 'it is' : 'they are'} not included
                above. Their original timestamps, durations, and mission associations are
                unavailable.
              </p>
            )}
          </section>

          <div className="dashboard-bottom" style={{ marginTop: 0, marginBottom: 16 }}>
            <section className="panel" aria-labelledby="weekly-title">
              <div className="panel__head">
                <div className="panel__title"><h2 id="weekly-title">This Week</h2></div>
                <span className="panel__id">MON TO SUN</span>
              </div>
              <WeeklyChart days={week} />
            </section>

            <section className="panel" aria-labelledby="calendar-title">
              <div className="panel__head">
                <div className="panel__title"><h2 id="calendar-title">Activity</h2></div>
                <span className="panel__id">LAST 35 DAYS</span>
              </div>
              <ActivityCalendar days={calendar} />
            </section>
          </div>

          <section className="panel" aria-labelledby="log-title">
            <div className="panel__head">
              <div className="panel__title">
                <h2 id="log-title">Operations Log</h2>
                <span className="panel__id">{visible.length} SHOWN</span>
              </div>
            </div>
            <OperationFilters value={filters} onChange={setFilters} missions={missionOptions} />
            <OperationsLog records={visible} sort={filters.sort} />
          </section>
        </>
      )}
    </>
  );
}
