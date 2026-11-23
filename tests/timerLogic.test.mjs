/**
 * Plain Node tests for the timer logic. No test framework needed.
 * Run with: node tests/timerLogic.test.mjs
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_TIMER_SETTINGS,
  completeSession,
  createInitialState,
  durationFor,
  formatTime,
  nextAfterSkip,
  sanitizeSettings,
  sanitizeTimerState,
} from '../src/hooks/timerLogic.js';

const settings = { ...DEFAULT_TIMER_SETTINGS };
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

check('defaults are 25 / 5 / 15 with a cycle of 4', () => {
  assert.equal(durationFor('focus', settings), 25 * 60 * 1000);
  assert.equal(durationFor('shortBreak', settings), 5 * 60 * 1000);
  assert.equal(durationFor('longBreak', settings), 15 * 60 * 1000);
});

check('formatTime never goes negative and pads values', () => {
  assert.equal(formatTime(25 * 60 * 1000), '25:00');
  assert.equal(formatTime(61 * 1000), '01:01');
  assert.equal(formatTime(-5000), '00:00');
  assert.equal(formatTime(65 * 60 * 1000), '1:05:00');
});

check('corrupt settings fall back to safe defaults', () => {
  const s = sanitizeSettings({ focusMinutes: 'banana', sessionsPerCycle: 999 });
  assert.equal(s.focusMinutes, 25);
  assert.equal(s.sessionsPerCycle, 12);
  assert.deepEqual(sanitizeSettings(null), settings);
});

check('a finished focus session is counted and leads to a short break', () => {
  const running = {
    ...createInitialState(settings),
    status: 'running',
    sessionId: 1,
    endTime: 1000,
  };
  const done = completeSession(running, settings, 1000);
  assert.equal(done.status, 'completed');
  assert.equal(done.completedFocusSessions, 1);
  assert.equal(done.completedInCycle, 1);
  assert.equal(done.nextType, 'shortBreak');
  assert.equal(done.remainingMs, 0);
});

check('completing the same session twice counts it once', () => {
  const running = {
    ...createInitialState(settings),
    status: 'running',
    sessionId: 7,
    endTime: 1000,
  };
  const once = completeSession(running, settings, 1000);
  const twice = completeSession(once, settings, 1000);
  assert.equal(twice.completedFocusSessions, 1);
  assert.equal(twice, once);
});

check('the fourth finished focus session leads to a long break', () => {
  const running = {
    ...createInitialState(settings),
    status: 'running',
    sessionId: 4,
    completedInCycle: 3,
    completedFocusSessions: 3,
    endTime: 1000,
  };
  const done = completeSession(running, settings, 1000);
  assert.equal(done.completedInCycle, 4);
  assert.equal(done.nextType, 'longBreak');
});

check('skipping a focus session does not count it', () => {
  const running = { ...createInitialState(settings), status: 'running', sessionId: 1 };
  assert.equal(running.completedFocusSessions, 0);
  assert.equal(nextAfterSkip(running), 'shortBreak');
  assert.equal(nextAfterSkip({ ...running, sessionType: 'shortBreak' }), 'focus');
});

check('a running session that expired while away completes once on load', () => {
  const stored = {
    ...createInitialState(settings),
    status: 'running',
    sessionId: 3,
    endTime: 1000,
    startedAt: 0,
  };
  const loaded = sanitizeTimerState(stored, settings, 5000);
  assert.equal(loaded.status, 'completed');
  assert.equal(loaded.completedFocusSessions, 1);
  const loadedAgain = sanitizeTimerState(loaded, settings, 6000);
  assert.equal(loadedAgain.completedFocusSessions, 1);
});

check('a running session restored after refresh keeps the right time left', () => {
  const now = 100000;
  const stored = {
    ...createInitialState(settings),
    status: 'running',
    sessionId: 1,
    endTime: now + 10 * 60 * 1000,
  };
  const loaded = sanitizeTimerState(stored, settings, now);
  assert.equal(loaded.status, 'running');
  assert.equal(loaded.remainingMs, 10 * 60 * 1000);
});

check('a paused session restored after refresh keeps its saved time', () => {
  const stored = {
    ...createInitialState(settings),
    status: 'paused',
    sessionId: 1,
    remainingMs: 7 * 60 * 1000,
  };
  const loaded = sanitizeTimerState(stored, settings, Date.now());
  assert.equal(loaded.status, 'paused');
  assert.equal(loaded.remainingMs, 7 * 60 * 1000);
});

check('garbage stored data falls back to a fresh standby timer', () => {
  for (const bad of [null, 42, 'nope', [], { status: 'flying', sessionType: 'warp' }]) {
    const loaded = sanitizeTimerState(bad, settings, Date.now());
    assert.equal(loaded.status, 'standby');
    assert.equal(loaded.sessionType, 'focus');
    assert.equal(loaded.remainingMs, 25 * 60 * 1000);
  }
});

check('a damaged completed record still knows what comes next', () => {
  const stored = {
    ...createInitialState(settings),
    status: 'completed',
    sessionType: 'focus',
    sessionId: 2,
    completedInCycle: 1,
    nextType: null,
  };
  const loaded = sanitizeTimerState(stored, settings, Date.now());
  assert.equal(loaded.nextType, 'shortBreak');
});

check('a standby record always shows the full session length', () => {
  const stored = { ...createInitialState(settings), status: 'standby', remainingMs: 1234 };
  const loaded = sanitizeTimerState(stored, settings, Date.now());
  assert.equal(loaded.remainingMs, 25 * 60 * 1000);
});

check('fractional milliseconds never print decimal places', () => {
  assert.equal(formatTime(24 * 60 * 1000 + 54 * 1000 + 432), '24:55');
  assert.equal(formatTime(1494432.0000000002), '24:55');
  assert.equal(formatTime(59999), '01:00');
  assert.match(formatTime(1234567), /^\d{2}:\d{2}$/);
});

console.log(`\nAll ${passed} timer logic tests passed.`);
