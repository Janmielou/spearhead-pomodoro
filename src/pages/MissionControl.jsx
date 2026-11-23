import { useEffect, useMemo, useRef, useState } from 'react';
import MissionCard from '../components/missions/MissionCard';
import MissionDetails from '../components/missions/MissionDetails';
import MissionForm from '../components/missions/MissionForm';
import MissionFilters from '../components/missions/MissionFilters';
import DeleteMissionDialog from '../components/missions/DeleteMissionDialog';
import { filterMissions, missionCompletionCheck } from '../hooks/missionLogic';

export default function MissionControl({ missionsApi }) {
  const { missions, counts } = missionsApi;
  const [filters, setFilters] = useState({ query: '', status: 'all', priority: 'all', sort: 'updated' });
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');
  const formRef = useRef(null);

  // The header control is the single creation entry point. Opening
  // the existing form brings it into view.
  useEffect(() => {
    if (creating) formRef.current?.scrollIntoView({ block: 'start' });
  }, [creating]);

  const visible = useMemo(() => filterMissions(missions, filters), [missions, filters]);
  const selected = missions.find((m) => m.id === selectedId) ?? visible[0] ?? null;

  const handleCreate = (input) => {
    const mission = missionsApi.createMission(input);
    if (mission) {
      setCreating(false);
      setSelectedId(mission.id);
      setNotice(`Mission created: ${mission.title}.`);
    }
  };

  const handleStatus = (missionId, status) => {
    // Same rule as the data layer. An ineligible completion shows the
    // reason instead of pretending it worked.
    if (status === 'completed') {
      const target = missions.find((m) => m.id === missionId);
      const check = target ? missionCompletionCheck(target) : { canComplete: false, message: '' };
      if (!check.canComplete) {
        setNotice(check.message);
        return;
      }
    }
    missionsApi.changeMissionStatus(missionId, status);
    setNotice(
      status === 'completed'
        ? 'Mission marked complete.'
        : status === 'archived'
          ? 'Mission archived.'
          : status === 'pending'
            ? 'Mission restored.'
            : 'Mission reopened.',
    );
  };

  const handleDelete = (missionId) => {
    missionsApi.removeMission(missionId);
    if (selectedId === missionId) setSelectedId(null);
    setDeleting(null);
    setNotice('Mission deleted.');
  };

  return (
    <>
      <section className="panel mission-page-head" aria-labelledby="mc-title">
        <div>
          <span className="ops-label">Mission Control</span>
          <h2 id="mc-title">Your Missions</h2>
          <p>Big tasks, broken into small objectives. Everything here is saved in your browser.</p>
        </div>
        <dl className="mission-counts terminal-surface terminal-counts">
          <div><dt>Total</dt><dd className="mono">{counts.total}</dd></div>
          <div><dt>Active</dt><dd className="mono">{counts.active}</dd></div>
          <div><dt>Completed</dt><dd className="mono">{counts.completed}</dd></div>
        </dl>
        <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Close Form' : 'Create Mission'}
        </button>
      </section>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {creating && (
        <section ref={formRef} className="panel" aria-label="Create a mission" style={{ marginBottom: 16 }}>
          <div className="panel__head">
            <div className="panel__title"><h2>New Mission</h2></div>
          </div>
          <MissionForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </section>
      )}

      {missions.length === 0 ? (
        <section className="panel empty-state" aria-label="No missions">
          <span className="ops-label">No active missions</span>
          <h2>Your board is clear.</h2>
          <p>
            Create a mission to start organizing your objectives. Use the Create Mission
            control above.
          </p>
        </section>
      ) : (
        <>
          <section className="panel" aria-label="Search and filter missions" style={{ marginBottom: 16 }}>
            <MissionFilters value={filters} onChange={setFilters} />
          </section>

          <div className="mission-layout">
            <section className="mission-list" aria-label="Mission list">
              {visible.length === 0 ? (
                <div className="panel">
                  <p className="empty-note">No missions match that search or filter. Try clearing them.</p>
                </div>
              ) : (
                visible.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    selected={selected?.id === mission.id}
                    onSelect={setSelectedId}
                  />
                ))
              )}
            </section>

            <MissionDetails
              mission={selected}
              onEditMission={(id, changes) => {
                missionsApi.editMission(id, changes);
                setNotice('Mission updated.');
              }}
              onChangeStatus={handleStatus}
              onRequestDelete={setDeleting}
              onAddObjective={(id, input) => {
                missionsApi.createObjective(id, input);
                setNotice('Objective added.');
              }}
              onToggleObjective={missionsApi.toggleObjective}
              onUpdateObjective={(mid, oid, changes) => {
                missionsApi.editObjective(mid, oid, changes);
                setNotice('Objective updated.');
              }}
              onDeleteObjective={(mid, oid) => {
                missionsApi.removeObjective(mid, oid);
                setNotice('Objective deleted.');
              }}
            />
          </div>
        </>
      )}

      <DeleteMissionDialog
        mission={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
