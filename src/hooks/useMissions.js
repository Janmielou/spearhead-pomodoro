import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from '../services/storageService';
import {
  addMission,
  addObjective,
  deleteMission,
  deleteObjective,
  makeId,
  missionCompletionCheck,
  missionCounts,
  sanitizeMissions,
  setMissionStatus,
  setObjectiveCompleted,
  updateMission,
  updateObjective,
  willCompleteAllObjectives,
} from './missionLogic';

const STORAGE_KEY = 'missions';

/**
 * Mission state for the whole app.
 * Loads once from storage, saves on every change, and only ever
 * touches storage through storageService. Timer keys are separate
 * and are not touched here.
 */
export function useMissions(onEvent = () => {}) {
  const [missions, setMissions] = useState(() => sanitizeMissions(read(STORAGE_KEY, [])));

  // Kept in a ref so the actions below stay stable while the
  // communication hook can still receive every event.
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  }, [onEvent]);
  const emit = useCallback((type, mission, extra = {}, eventKeyOverride = null) => {
    if (!mission) return;
    eventRef.current({
      type,
      at: Date.now(),
      eventKey:
        eventKeyOverride ||
        `${type}-${mission.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      context: { title: mission.title, code: mission.code, ...extra },
    });
  }, []);

  useEffect(() => {
    write(STORAGE_KEY, missions);
  }, [missions]);

  const createMission = useCallback(
    (input) => {
      const result = addMission(missions, input, Date.now(), makeId('msn'));
      if (result.mission) {
        setMissions(result.missions);
        emit('mission.created', result.mission);
      }
      return result.mission;
    },
    [missions, emit],
  );

  const editMission = useCallback(
    (missionId, changes) => {
      const before = missions.find((m) => m.id === missionId);
      setMissions((prev) => updateMission(prev, missionId, changes, Date.now()));
      if (!before) return;
      // Announcements describe the mission as it is after the edit,
      // so a renamed mission is announced by its new title.
      const updated = {
        ...before,
        title:
          typeof changes.title === 'string' && changes.title.trim()
            ? changes.title.trim()
            : before.title,
      };
      if (changes.status && changes.status !== before.status) {
        if (changes.status === 'completed' && missionCompletionCheck(before).canComplete) {
          emit('mission.completed', updated);
        } else if (changes.status === 'archived') {
          emit('mission.archived', updated);
        } else if (before.status === 'archived') {
          emit('mission.restored', updated);
        } else if (before.status === 'completed') {
          emit('mission.reopened', updated);
        }
      } else {
        emit('mission.edited', updated);
      }
    },
    [missions, emit],
  );

  const changeMissionStatus = useCallback(
    (missionId, status) => {
      const before = missions.find((m) => m.id === missionId);
      setMissions((prev) => setMissionStatus(prev, missionId, status, Date.now()));
      if (!before || before.status === status) return;
      if (status === 'completed') {
        // Only announce it if the completion rule actually allowed it.
        if (missionCompletionCheck(before).canComplete) emit('mission.completed', before);
      } else if (status === 'archived') {
        emit('mission.archived', before);
      } else if (before.status === 'archived') {
        emit('mission.restored', before);
      } else if (before.status === 'completed') {
        emit('mission.reopened', before);
      }
    },
    [missions, emit],
  );

  const removeMission = useCallback((missionId) => {
    setMissions((prev) => deleteMission(prev, missionId));
  }, []);

  const createObjective = useCallback((missionId, input) => {
    setMissions((prev) => addObjective(prev, missionId, input, Date.now(), makeId('obj')));
  }, []);

  const editObjective = useCallback((missionId, objectiveId, changes) => {
    setMissions((prev) => updateObjective(prev, missionId, objectiveId, changes, Date.now()));
  }, []);

  const toggleObjective = useCallback(
    (missionId, objectiveId, completed) => {
      const mission = missions.find((m) => m.id === missionId);
      const objective = mission?.objectives.find((o) => o.id === objectiveId);
      setMissions((prev) => setObjectiveCompleted(prev, missionId, objectiveId, completed, Date.now()));
      if (completed && mission && objective && !objective.completed) {
        emit('mission.objectiveCompleted', mission, { objective: objective.title });
        if (willCompleteAllObjectives(mission, objectiveId)) {
          // One milestone per mission and objective set. The fixed
          // key means ticking the same objective off and on again
          // cannot produce it twice. The mission itself is not
          // completed here; that still needs the operator to do it.
          const milestoneKey = `mission-objectivesCompleted-${mission.id}-${mission.objectives
            .map((o) => o.id)
            .sort()
            .join('-')}`;
          emit('mission.objectivesCompleted', mission, {}, milestoneKey);
        }
      }
    },
    [missions, emit],
  );

  const removeObjective = useCallback((missionId, objectiveId) => {
    setMissions((prev) => deleteObjective(prev, missionId, objectiveId, Date.now()));
  }, []);

  return {
    missions,
    counts: missionCounts(missions),
    createMission,
    editMission,
    changeMissionStatus,
    removeMission,
    createObjective,
    editObjective,
    toggleObjective,
    removeObjective,
  };
}
