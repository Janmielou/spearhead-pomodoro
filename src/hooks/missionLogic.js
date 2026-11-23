/**
 * Pure mission and objective logic.
 *
 * No React and no storage in here. useMissions.js calls these helpers,
 * and tests/missionLogic.test.mjs checks them.
 *
 * Priorities: low, normal, high, critical.
 * Statuses: pending, active, completed, archived.
 * Dates for deadlines are plain "YYYY-MM-DD" strings, or null.
 */

export const PRIORITIES = ['low', 'normal', 'high', 'critical'];
export const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};
const PRIORITY_WEIGHT = { low: 0, normal: 1, high: 2, critical: 3 };

export const MISSION_STATUSES = ['pending', 'active', 'completed', 'archived'];
export const STATUS_LABELS = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanEstimate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(999, Math.round(n));
}

function validDeadline(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const ok =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return ok ? value.trim() : null;
}

function validTime(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function validateMissionInput(input) {
  const errors = {};
  if (!cleanText(input?.title)) errors.title = 'Give the mission a title.';
  return errors;
}

export function validateObjectiveInput(input) {
  const errors = {};
  if (!cleanText(input?.title)) errors.title = 'Give the objective a title.';
  return errors;
}

/* ---------------- Objectives ---------------- */

export function sanitizeObjective(raw, index, seenIds, now) {
  if (!isPlainObject(raw)) return null;
  const title = cleanText(raw.title);
  if (!title) return null;

  let id = typeof raw.id === 'string' && raw.id ? raw.id : `obj-restored-${index + 1}`;
  while (seenIds.has(id)) id = `${id}-r`;
  seenIds.add(id);

  const createdAt = validTime(raw.createdAt, now);
  const completed = raw.completed === true;
  return {
    id,
    title,
    description: cleanText(raw.description),
    completed,
    estimatedSessions: cleanEstimate(raw.estimatedSessions),
    createdAt,
    completedAt: completed ? validTime(raw.completedAt, createdAt) : null,
  };
}

export function createObjective(input, now, id) {
  return {
    id,
    title: cleanText(input?.title),
    description: cleanText(input?.description),
    completed: false,
    estimatedSessions: cleanEstimate(input?.estimatedSessions),
    createdAt: now,
    completedAt: null,
  };
}

/* ---------------- Missions ---------------- */

export function sanitizeMission(raw, index, now) {
  if (!isPlainObject(raw)) return null;
  const title = cleanText(raw.title);
  if (!title) return null;

  const createdAt = validTime(raw.createdAt, now);
  let status = MISSION_STATUSES.includes(raw.status) ? raw.status : 'pending';
  const seenIds = new Set();
  const objectives = Array.isArray(raw.objectives)
    ? raw.objectives
        .map((obj, i) => sanitizeObjective(obj, i, seenIds, now))
        .filter(Boolean)
    : [];

  // Correct records that were marked completed without finishing
  // every objective (or with none at all). Nothing else is changed.
  if (
    status === 'completed' &&
    (objectives.length === 0 || objectives.some((o) => !o.completed))
  ) {
    status = 'pending';
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `msn-restored-${index + 1}`,
    code: typeof raw.code === 'string' && /^MSN-\d+$/.test(raw.code) ? raw.code : null,
    title,
    description: cleanText(raw.description),
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'normal',
    status,
    deadline: validDeadline(raw.deadline),
    estimatedSessions: cleanEstimate(raw.estimatedSessions),
    createdAt,
    updatedAt: validTime(raw.updatedAt, createdAt),
    completedAt: status === 'completed' ? validTime(raw.completedAt, createdAt) : null,
    archivedAt: status === 'archived' ? validTime(raw.archivedAt, createdAt) : null,
    objectives,
  };
}

/**
 * Clean up whatever was in storage. Good records are kept, broken ones
 * are fixed or dropped, and duplicate ids or codes are sorted out.
 */
export function sanitizeMissions(raw, now = Date.now()) {
  if (!Array.isArray(raw)) return [];
  const missions = raw.map((m, i) => sanitizeMission(m, i, now)).filter(Boolean);

  const seenIds = new Set();
  for (const mission of missions) {
    let id = mission.id;
    while (seenIds.has(id)) id = `${id}-r`;
    seenIds.add(id);
    mission.id = id;
  }

  const usedCodes = new Set();
  let maxCode = 0;
  for (const mission of missions) {
    if (mission.code && !usedCodes.has(mission.code)) {
      usedCodes.add(mission.code);
      maxCode = Math.max(maxCode, Number(mission.code.slice(4)) || 0);
    } else {
      mission.code = null;
    }
  }
  for (const mission of missions) {
    if (!mission.code) {
      maxCode += 1;
      mission.code = `MSN-${String(maxCode).padStart(3, '0')}`;
    }
  }
  return missions;
}

function nextCode(missions) {
  let max = 0;
  for (const m of missions) {
    const n = Number(String(m.code || '').slice(4));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `MSN-${String(max + 1).padStart(3, '0')}`;
}

export function createMission(input, now, id, code) {
  return {
    id,
    code,
    title: cleanText(input?.title),
    description: cleanText(input?.description),
    priority: PRIORITIES.includes(input?.priority) ? input.priority : 'normal',
    status: MISSION_STATUSES.includes(input?.status) ? input.status : 'pending',
    deadline: validDeadline(input?.deadline),
    estimatedSessions: cleanEstimate(input?.estimatedSessions),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    objectives: [],
  };
}

export function addMission(missions, input, now, id) {
  if (validateMissionInput(input).title) return { missions, mission: null };
  const mission = createMission(input, now, id, nextCode(missions));
  return { missions: [mission, ...missions], mission };
}

function applyStatus(mission, status, now) {
  return {
    ...mission,
    status,
    updatedAt: now,
    completedAt: status === 'completed' ? now : null,
    archivedAt: status === 'archived' ? now : null,
  };
}

export function updateMission(missions, missionId, changes, now) {
  return missions.map((mission) => {
    if (mission.id !== missionId) return mission;
    const next = {
      ...mission,
      title: changes.title !== undefined ? cleanText(changes.title) || mission.title : mission.title,
      description:
        changes.description !== undefined ? cleanText(changes.description) : mission.description,
      priority: PRIORITIES.includes(changes.priority) ? changes.priority : mission.priority,
      deadline:
        changes.deadline !== undefined ? validDeadline(changes.deadline) : mission.deadline,
      estimatedSessions:
        changes.estimatedSessions !== undefined
          ? cleanEstimate(changes.estimatedSessions)
          : mission.estimatedSessions,
      updatedAt: now,
    };
    const wantsComplete =
      MISSION_STATUSES.includes(changes.status) &&
      changes.status !== mission.status &&
      changes.status === 'completed';
    if (wantsComplete && !missionCompletionCheck(mission).canComplete) return next;
    return MISSION_STATUSES.includes(changes.status) && changes.status !== mission.status
      ? applyStatus(next, changes.status, now)
      : next;
  });
}

export function setMissionStatus(missions, missionId, status, now) {
  if (!MISSION_STATUSES.includes(status)) return missions;
  return missions.map((mission) => {
    if (mission.id !== missionId) return mission;
    if (status === 'completed' && !missionCompletionCheck(mission).canComplete) return mission;
    return applyStatus(mission, status, now);
  });
}

export function deleteMission(missions, missionId) {
  return missions.filter((mission) => mission.id !== missionId);
}

/* ---------------- Objective changes ---------------- */

function mapMission(missions, missionId, change, now) {
  return missions.map((mission) =>
    mission.id === missionId
      ? { ...change(mission), updatedAt: now }
      : mission,
  );
}

export function addObjective(missions, missionId, input, now, id) {
  if (validateObjectiveInput(input).title) return missions;
  const objective = createObjective(input, now, id);
  return mapMission(
    missions,
    missionId,
    (mission) => ({ ...mission, objectives: [...mission.objectives, objective] }),
    now,
  );
}

export function updateObjective(missions, missionId, objectiveId, changes, now) {
  return mapMission(
    missions,
    missionId,
    (mission) => ({
      ...mission,
      objectives: mission.objectives.map((obj) =>
        obj.id === objectiveId
          ? {
              ...obj,
              title: changes.title !== undefined ? cleanText(changes.title) || obj.title : obj.title,
              description:
                changes.description !== undefined ? cleanText(changes.description) : obj.description,
              estimatedSessions:
                changes.estimatedSessions !== undefined
                  ? cleanEstimate(changes.estimatedSessions)
                  : obj.estimatedSessions,
            }
          : obj,
      ),
    }),
    now,
  );
}

export function setObjectiveCompleted(missions, missionId, objectiveId, completed, now) {
  return mapMission(
    missions,
    missionId,
    (mission) => ({
      ...mission,
      objectives: mission.objectives.map((obj) =>
        obj.id === objectiveId
          ? { ...obj, completed, completedAt: completed ? now : null }
          : obj,
      ),
    }),
    now,
  );
}

export function deleteObjective(missions, missionId, objectiveId, now) {
  return mapMission(
    missions,
    missionId,
    (mission) => ({
      ...mission,
      objectives: mission.objectives.filter((obj) => obj.id !== objectiveId),
    }),
    now,
  );
}

/* ---------------- Progress, search, filter, sort ---------------- */

/**
 * Can this mission be marked completed?
 * Needs at least one objective, and every objective done.
 * This is the one place the rule lives, so the buttons, the edit
 * form, and the data operations all agree.
 */
export function missionCompletionCheck(mission) {
  const total = mission?.objectives?.length ?? 0;
  if (total === 0) {
    return {
      canComplete: false,
      message: 'Add at least one objective before completing this mission.',
    };
  }
  const done = mission.objectives.filter((o) => o.completed).length;
  if (done < total) {
    return {
      canComplete: false,
      message: 'Complete all objectives before marking this mission as completed.',
    };
  }
  return { canComplete: true, message: '' };
}

/** Progress is always worked out from the objectives. It is never stored. */
export function missionProgress(mission) {
  const total = mission?.objectives?.length ?? 0;
  const completed = mission?.objectives?.filter((o) => o.completed).length ?? 0;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/**
 * Would ticking this objective finish the last unfinished one?
 * False for missions with no objectives, and false if the objective
 * is already completed.
 */
export function willCompleteAllObjectives(mission, objectiveId) {
  const objectives = mission?.objectives ?? [];
  if (objectives.length === 0) return false;
  const target = objectives.find((o) => o.id === objectiveId);
  if (!target || target.completed) return false;
  return objectives.every((o) => o.id === objectiveId || o.completed);
}

export function missionCounts(missions) {
  return {
    total: missions.length,
    pending: missions.filter((m) => m.status === 'pending').length,
    active: missions.filter((m) => m.status === 'active').length,
    completed: missions.filter((m) => m.status === 'completed').length,
    archived: missions.filter((m) => m.status === 'archived').length,
  };
}

export const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'priority', label: 'Priority' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'title', label: 'Alphabetical' },
];

export function filterMissions(missions, { query = '', status = 'all', priority = 'all', sort = 'updated' } = {}) {
  const q = cleanText(query).toLowerCase();
  const filtered = missions.filter((mission) => {
    if (status !== 'all' && mission.status !== status) return false;
    if (priority !== 'all' && mission.priority !== priority) return false;
    if (!q) return true;
    return (
      mission.title.toLowerCase().includes(q) ||
      mission.description.toLowerCase().includes(q) ||
      mission.code.toLowerCase().includes(q)
    );
  });

  const byUpdated = (a, b) => b.updatedAt - a.updatedAt;
  const sorted = [...filtered];
  switch (sort) {
    case 'created':
      sorted.sort((a, b) => b.createdAt - a.createdAt || byUpdated(a, b));
      break;
    case 'priority':
      sorted.sort(
        (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || byUpdated(a, b),
      );
      break;
    case 'deadline':
      sorted.sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline) || byUpdated(a, b);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return byUpdated(a, b);
      });
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      sorted.sort(byUpdated);
  }
  return sorted;
}

/* ---------------- Small display helpers ---------------- */

export function formatDeadline(deadline) {
  if (!deadline) return '';
  const date = new Date(`${deadline}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isOverdue(mission, today = todayString()) {
  if (!mission.deadline) return false;
  if (mission.status === 'completed' || mission.status === 'archived') return false;
  return mission.deadline < today;
}
