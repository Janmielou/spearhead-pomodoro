import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from '../services/storageService';
import {
  DEFAULT_TIMER_SETTINGS,
  applyLongBreakEnd,
  buildSessionSnapshot,
  completeSession,
  createInitialState,
  durationFor,
  nextAfterSkip,
  sanitizeSettings,
  sanitizeTimerState,
} from './timerLogic';

const SETTINGS_KEY = 'timer-settings';
const STATE_KEY = 'timer-state';

function loadSettings() {
  return sanitizeSettings(read(SETTINGS_KEY, DEFAULT_TIMER_SETTINGS));
}

function loadState(settings) {
  return sanitizeTimerState(read(STATE_KEY, null), settings);
}

/**
 * The countdown engine.
 *
 * It never counts down by subtracting. While a session runs, the only
 * number that matters is endTime. Remaining time is always worked out
 * as endTime minus Date.now(), so a throttled or suspended tab still
 * shows the right time when it wakes up.
 */
export function useTimer() {
  const [settings, setSettings] = useState(loadSettings);
  const [state, setState] = useState(() => loadState(loadSettings()));
  const intervalRef = useRef(null);

  // Save settings and state whenever they change. This is the only
  // place timer data is written, and it goes through storageService.
  useEffect(() => {
    write(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    write(STATE_KEY, state);
  }, [state]);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // One interval while running, cleaned up on pause, finish, or unmount.
  useEffect(() => {
    if (state.status !== 'running') {
      clearTick();
      return undefined;
    }

    const tick = () => {
      setState((prev) => {
        if (prev.status !== 'running' || !Number.isFinite(prev.endTime)) return prev;
        const remainingMs = Math.max(0, prev.endTime - Date.now());
        if (remainingMs <= 0) return completeSession(prev, settings, prev.endTime);
        if (remainingMs === prev.remainingMs) return prev;
        return { ...prev, remainingMs };
      });
    };

    tick();
    intervalRef.current = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      document.removeEventListener('visibilitychange', tick);
      clearTick();
    };
  }, [state.status, state.endTime, state.sessionId, settings, clearTick]);

  const start = useCallback(
    (missionSnapshot = null) => {
      setState((prev) => {
        if (prev.status !== 'standby') return prev;
        const now = Date.now();
        const durationMs = durationFor(prev.sessionType, settings);
        return {
          ...prev,
          status: 'running',
          durationMs,
          remainingMs: durationMs,
          endTime: now + durationMs,
          startedAt: now,
          sessionId: prev.sessionId + 1,
          completedForSessionId: null,
          nextType: null,
          sessionMission: prev.sessionType === 'focus' ? missionSnapshot : null,
          lastEvent: { kind: 'started', sessionType: prev.sessionType, at: now },
        };
      });
    },
    [settings],
  );

  const setAssignedMissionId = useCallback((missionId) => {
    setState((prev) => ({ ...prev, assignedMissionId: missionId || null }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' || !Number.isFinite(prev.endTime)) return prev;
      const now = Date.now();
      const remainingMs = Math.max(0, prev.endTime - now);
      if (remainingMs <= 0) return completeSession(prev, settings, prev.endTime);
      return {
        ...prev,
        status: 'paused',
        remainingMs,
        endTime: null,
        lastEvent: { kind: 'paused', sessionType: prev.sessionType, at: now },
      };
    });
  }, [settings]);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'paused') return prev;
      const now = Date.now();
      return {
        ...prev,
        status: 'running',
        endTime: now + prev.remainingMs,
        lastEvent: { kind: 'resumed', sessionType: prev.sessionType, at: now },
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' && prev.status !== 'paused') return prev;
      const now = Date.now();
      // Work out the remaining time right now (paused time is already
      // excluded, because remaining only falls while running), then
      // snapshot the session before its fields are cleared.
      const remainingNow =
        prev.status === 'running' && Number.isFinite(prev.endTime)
          ? Math.max(0, prev.endTime - now)
          : prev.remainingMs;
      const record = buildSessionSnapshot(
        prev,
        'abandoned',
        now,
        prev.durationMs - remainingNow,
      );
      const durationMs = durationFor(prev.sessionType, settings);
      return {
        ...prev,
        status: 'standby',
        durationMs,
        remainingMs: durationMs,
        endTime: null,
        startedAt: null,
        nextType: null,
        sessionMission: null,
        lastRecord: record ?? prev.lastRecord,
        lastEvent: { kind: 'reset', sessionType: prev.sessionType, at: now },
      };
    });
  }, [settings]);

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' && prev.status !== 'paused') return prev;
      const now = Date.now();
      const remainingNow =
        prev.status === 'running' && Number.isFinite(prev.endTime)
          ? Math.max(0, prev.endTime - now)
          : prev.remainingMs;
      const record = buildSessionSnapshot(
        prev,
        'skipped',
        now,
        prev.durationMs - remainingNow,
      );
      const skippedType = prev.sessionType;
      const adjusted = applyLongBreakEnd(prev);
      const sessionType = nextAfterSkip(prev);
      const durationMs = durationFor(sessionType, settings);
      return {
        ...adjusted,
        status: 'standby',
        sessionType,
        durationMs,
        remainingMs: durationMs,
        endTime: null,
        startedAt: null,
        nextType: null,
        sessionMission: null,
        lastRecord: record ?? prev.lastRecord,
        lastEvent: { kind: 'skipped', sessionType: skippedType, at: now },
      };
    });
  }, [settings]);

  /** From the completed state, begin the next session in the cycle. */
  const beginNext = useCallback(
    (missionSnapshot = null) => {
      setState((prev) => {
        if (prev.status !== 'completed' || !prev.nextType) return prev;
      const now = Date.now();
      const adjusted =
        prev.sessionType === 'longBreak' ? applyLongBreakEnd(prev) : prev;
      const sessionType = prev.nextType;
      const durationMs = durationFor(sessionType, settings);
        return {
          ...adjusted,
          status: 'running',
          sessionType,
          durationMs,
          remainingMs: durationMs,
          endTime: now + durationMs,
          startedAt: now,
          sessionId: prev.sessionId + 1,
          completedForSessionId: null,
          nextType: null,
          sessionMission: sessionType === 'focus' ? missionSnapshot : null,
          lastEvent: { kind: 'started', sessionType, at: now },
        };
      });
    },
    [settings],
  );

  /**
   * Update durations. Used by the settings page in a later phase.
   * If nothing is running, the current session length updates too.
   */
  const updateSettings = useCallback(
    (partial) => {
      const next = sanitizeSettings({ ...settings, ...(partial || {}) });
      setSettings(next);
      setState((current) => {
        if (current.status === 'running' || current.status === 'completed') return current;
        const durationMs = durationFor(current.sessionType, next);
        return { ...current, durationMs, remainingMs: durationMs };
      });
    },
    [settings],
  );

  const atmosphere =
    state.status === 'paused'
      ? 'paused'
      : state.sessionType !== 'focus' &&
          (state.status === 'running' || state.status === 'completed')
        ? 'sanctuary'
        : state.status === 'running'
          ? 'active'
          : 'standby';

  return {
    state,
    settings,
    start,
    setAssignedMissionId,
    pause,
    resume,
    reset,
    skip,
    beginNext,
    updateSettings,
    atmosphere,
  };
}

export { createInitialState };
