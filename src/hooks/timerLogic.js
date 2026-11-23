/**
 * Pure timer logic for the focus timer.
 *
 * This file has no React and no browser code in it, which makes it easy
 * to test. useTimer.js uses these helpers, and the test script in
 * tests/timerLogic.test.mjs checks them.
 *
 * Session types: focus, shortBreak, longBreak.
 * Statuses: standby, running, paused, completed.
 */

export const DEFAULT_TIMER_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsPerCycle: 4,
};

export const SESSION_LABELS = {
  focus: 'Focus Operation',
  shortBreak: 'Short Respite',
  longBreak: 'Long Respite',
};

const SESSION_TYPES = Object.keys(SESSION_LABELS);
const STATUSES = ['standby', 'running', 'paused', 'completed'];

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Fill in defaults and keep numbers in sane ranges. Never throws. */
export function sanitizeSettings(raw) {
  const s = isPlainObject(raw) ? raw : {};
  return {
    focusMinutes: clampInt(s.focusMinutes, DEFAULT_TIMER_SETTINGS.focusMinutes, 1, 180),
    shortBreakMinutes: clampInt(s.shortBreakMinutes, DEFAULT_TIMER_SETTINGS.shortBreakMinutes, 1, 90),
    longBreakMinutes: clampInt(s.longBreakMinutes, DEFAULT_TIMER_SETTINGS.longBreakMinutes, 1, 120),
    sessionsPerCycle: clampInt(s.sessionsPerCycle, DEFAULT_TIMER_SETTINGS.sessionsPerCycle, 1, 12),
  };
}

export function durationFor(sessionType, settings) {
  const s = sanitizeSettings(settings);
  if (sessionType === 'shortBreak') return s.shortBreakMinutes * 60 * 1000;
  if (sessionType === 'longBreak') return s.longBreakMinutes * 60 * 1000;
  return s.focusMinutes * 60 * 1000;
}

export function formatTime(ms) {
  // Round up to whole seconds first. Without the brackets this divided
  // the milliseconds after rounding, which printed long decimals.
  const totalSeconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatClock(timestamp) {
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour12: false });
}

export function createInitialState(settings) {
  const durationMs = durationFor('focus', settings);
  return {
    version: 1,
    status: 'standby',
    sessionType: 'focus',
    sessionId: 0,
    durationMs,
    remainingMs: durationMs,
    endTime: null,
    startedAt: null,
    cycleNumber: 1,
    completedInCycle: 0,
    completedFocusSessions: 0,
    nextType: null,
    completedForSessionId: null,
    lastEvent: null,
    assignedMissionId: null,
    sessionMission: null,
    lastRecord: null,
  };
}

/**
 * Snapshot of a session that just ended, ready to be saved as an
 * operation record (Phase 5). Breaks never carry a mission.
 * The event key is stable: session id plus original start time, so
 * the same finished session can never be recorded twice.
 */
export function buildSessionSnapshot(state, outcome, endedAt, actualDurationMs) {
  if (!state || !Number.isFinite(state.startedAt)) return null;
  const planned = Math.max(0, state.durationMs || 0);
  const actual = Math.min(planned, Math.max(0, Math.round(actualDurationMs || 0)));
  const mission =
    state.sessionType === 'focus' && isPlainObject(state.sessionMission)
      ? state.sessionMission
      : null;
  return {
    eventKey: `timer-${state.sessionId}-${state.startedAt}-${outcome}`,
    timerSessionId: state.sessionId,
    sessionType: state.sessionType,
    missionId: mission?.missionId ?? null,
    missionTitle: mission?.missionTitle ?? null,
    missionCode: mission?.missionCode ?? null,
    plannedDurationMs: planned,
    actualDurationMs: actual,
    startedAt: state.startedAt,
    endedAt,
    outcome,
  };
}

function cleanMissionSnapshot(raw) {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.missionId !== 'string' || !raw.missionId) return null;
  return {
    missionId: raw.missionId,
    missionTitle: typeof raw.missionTitle === 'string' ? raw.missionTitle : '',
    missionCode: typeof raw.missionCode === 'string' ? raw.missionCode : '',
  };
}

function cleanLastRecord(raw) {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.eventKey !== 'string' || !raw.eventKey) return null;
  if (!SESSION_TYPES.includes(raw.sessionType)) return null;
  if (!['completed', 'skipped', 'abandoned'].includes(raw.outcome)) return null;
  if (!Number.isFinite(raw.startedAt) || !Number.isFinite(raw.endedAt)) return null;
  return raw;
}

/**
 * Which session comes after a completed one.
 * The long break only happens when the cycle is full. Call this with
 * the completedInCycle count already updated for focus sessions.
 */
export function nextAfterCompletion(state, settings) {
  const s = sanitizeSettings(settings);
  if (state.sessionType === 'focus') {
    return state.completedInCycle >= s.sessionsPerCycle ? 'longBreak' : 'shortBreak';
  }
  return 'focus';
}

/** Which session comes after a skipped one. Skipping never earns a long break. */
export function nextAfterSkip(state) {
  return state.sessionType === 'focus' ? 'shortBreak' : 'focus';
}

/**
 * Move a running session to the completed state.
 * Safe to call twice for the same session. The second call changes
 * nothing, so a finished session can never be counted twice.
 */
export function completeSession(state, settings, completedAt) {
  if (!isPlainObject(state) || state.status === 'completed') return state;
  if (state.completedForSessionId === state.sessionId) return state;

  const finishedType = state.sessionType;
  let { completedInCycle, completedFocusSessions, cycleNumber } = state;

  if (finishedType === 'focus') {
    completedFocusSessions += 1;
    completedInCycle += 1;
  }

  const probe = { ...state, completedInCycle };
  const nextType = nextAfterCompletion(probe, settings);

  return {
    ...state,
    status: 'completed',
    remainingMs: 0,
    endTime: null,
    completedInCycle,
    completedFocusSessions,
    cycleNumber,
    nextType,
    completedForSessionId: state.sessionId,
    lastEvent: { kind: 'completed', sessionType: finishedType, at: completedAt },
    lastRecord: buildSessionSnapshot(state, 'completed', completedAt, state.durationMs),
  };
}

/** Reset the per-cycle count when a long break ends (finished or skipped). */
export function applyLongBreakEnd(state) {
  if (state.sessionType !== 'longBreak') return state;
  return { ...state, completedInCycle: 0, cycleNumber: state.cycleNumber + 1 };
}

/**
 * Turn whatever was stored into a safe state.
 * If a running session ended while the tab was closed or suspended,
 * it is completed here, exactly once. The result is then stored in
 * the completed state, so loading it again will not count it again.
 */
export function sanitizeTimerState(raw, settings, now = Date.now()) {
  const fresh = createInitialState(settings);
  if (!isPlainObject(raw)) return fresh;

  const sessionType = SESSION_TYPES.includes(raw.sessionType) ? raw.sessionType : 'focus';
  const status = STATUSES.includes(raw.status) ? raw.status : 'standby';
  const durationMs = durationFor(sessionType, settings);

  const state = {
    ...fresh,
    sessionType,
    status,
    sessionId: clampInt(raw.sessionId, 0, 0, 1000000000),
    durationMs,
    cycleNumber: clampInt(raw.cycleNumber, 1, 1, 100000),
    completedInCycle: clampInt(
      raw.completedInCycle,
      0,
      0,
      sanitizeSettings(settings).sessionsPerCycle,
    ),
    completedFocusSessions: clampInt(raw.completedFocusSessions, 0, 0, 1000000000),
    nextType: SESSION_TYPES.includes(raw.nextType) ? raw.nextType : null,
    completedForSessionId: Number.isFinite(raw.completedForSessionId)
      ? raw.completedForSessionId
      : null,
    assignedMissionId: typeof raw.assignedMissionId === 'string' ? raw.assignedMissionId : null,
    sessionMission: cleanMissionSnapshot(raw.sessionMission),
    lastRecord: cleanLastRecord(raw.lastRecord),
    lastEvent:
      isPlainObject(raw.lastEvent) && Number.isFinite(raw.lastEvent.at)
        ? {
            kind: String(raw.lastEvent.kind || ''),
            sessionType: SESSION_TYPES.includes(raw.lastEvent.sessionType)
              ? raw.lastEvent.sessionType
              : sessionType,
            at: raw.lastEvent.at,
          }
        : null,
  };

  if (status === 'running') {
    if (!Number.isFinite(raw.endTime)) {
      return { ...state, status: 'standby', remainingMs: durationMs, endTime: null };
    }
    state.endTime = raw.endTime;
    state.startedAt = Number.isFinite(raw.startedAt) ? raw.startedAt : null;
    state.remainingMs = Math.max(0, raw.endTime - now);
    if (state.remainingMs <= 0) {
      return completeSession(state, settings, raw.endTime);
    }
    return state;
  }

  if (status === 'standby') {
    // A session that has not started always shows its full length.
    return { ...state, endTime: null, remainingMs: durationMs, startedAt: null };
  }

  if (status === 'paused') {
    const remaining = Number.isFinite(raw.remainingMs) ? raw.remainingMs : durationMs;
    return {
      ...state,
      endTime: null,
      remainingMs: Math.min(durationMs, Math.max(0, remaining)),
      startedAt: Number.isFinite(raw.startedAt) ? raw.startedAt : null,
    };
  }

  // completed: make sure there is always a next session to begin,
  // even if the stored record was damaged.
  return {
    ...state,
    remainingMs: 0,
    endTime: null,
    nextType: state.nextType ?? nextAfterCompletion(state, settings),
  };
}
