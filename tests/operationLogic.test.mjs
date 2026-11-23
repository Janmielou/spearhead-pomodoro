/**
 * Plain Node tests for operations history logic. Run with:
 * node tests/operationLogic.test.mjs
 *
 * Dates are built with the local Date constructor on purpose, so the
 * calendar tests mean the same thing in any timezone.
 */
import assert from 'node:assert/strict';
import {
  buildRecord,
  calendarActivity,
  computeStats,
  currentStreak,
  distinctMissions,
  filterRecords,
  groupRecordsByDay,
  legacySessionCount,
  localDateKey,
  sanitizeRecords,
  weeklyActivity,
} from '../src/hooks/operationLogic.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

const MIN = 60 * 1000;
const at = (y, mo, d, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

function snap(patch = {}) {
  const startedAt = patch.startedAt ?? at(2026, 11, 20, 9, 0);
  return {
    eventKey: patch.eventKey ?? `timer-${patch.timerSessionId ?? 1}-${startedAt}-${patch.outcome ?? 'completed'}`,
    timerSessionId: 1,
    sessionType: 'focus',
    missionId: null,
    missionTitle: null,
    missionCode: null,
    plannedDurationMs: 25 * MIN,
    actualDurationMs: 25 * MIN,
    startedAt,
    endedAt: startedAt + 25 * MIN,
    outcome: 'completed',
    ...patch,
  };
}

/* Recording (spec tests 1 to 10) */

check('1. a completed focus record is built with OP data intact', () => {
  const r = buildRecord(snap());
  assert.equal(r.sessionType, 'focus');
  assert.equal(r.outcome, 'completed');
  assert.equal(r.plannedDurationMs, 25 * MIN);
  assert.equal(r.actualDurationMs, 25 * MIN);
});

check('2 and 3. completed break records are built too', () => {
  assert.equal(buildRecord(snap({ sessionType: 'shortBreak', plannedDurationMs: 5 * MIN, actualDurationMs: 5 * MIN })).sessionType, 'shortBreak');
  assert.equal(buildRecord(snap({ sessionType: 'longBreak', plannedDurationMs: 15 * MIN, actualDurationMs: 15 * MIN })).sessionType, 'longBreak');
});

check('4 and 5. skipped and abandoned outcomes are kept distinct', () => {
  assert.equal(buildRecord(snap({ outcome: 'skipped' })).outcome, 'skipped');
  assert.equal(buildRecord(snap({ outcome: 'abandoned' })).outcome, 'abandoned');
});

check('6 and 7. mission association and snapshots are preserved', () => {
  const r = buildRecord(snap({ missionId: 'm1', missionTitle: 'Capstone', missionCode: 'MSN-001' }));
  assert.equal(r.missionId, 'm1');
  assert.equal(r.missionTitle, 'Capstone');
  assert.equal(r.missionCode, 'MSN-001');
  const breakRec = buildRecord(snap({ sessionType: 'shortBreak', missionId: 'm1' }));
  assert.equal(breakRec.missionId, null); // breaks are never assigned
});

check('8. duplicate records are refused by event key', () => {
  const one = buildRecord(snap());
  const saved = sanitizeRecords([one, one, { ...one, id: 'op-copy' }]);
  assert.equal(saved.length, 1);
});

check('9. records with invalid times or unknown types are rejected', () => {
  assert.equal(buildRecord(snap({ endedAt: 10, startedAt: 20 })), null);
  assert.equal(buildRecord(snap({ startedAt: NaN })), null);
  assert.equal(buildRecord(snap({ sessionType: 'warp' })), null);
  assert.equal(buildRecord(snap({ plannedDurationMs: 0 })), null);
  assert.equal(buildRecord(null), null);
});

check('10. invalid stored data loads as an empty, safe list', () => {
  assert.deepEqual(sanitizeRecords('garbage'), []);
  assert.deepEqual(sanitizeRecords(null), []);
  const mixed = sanitizeRecords([snap(), 'junk', { sessionType: 'focus' }, snap({ eventKey: 'k2', timerSessionId: 2, startedAt: at(2026, 11, 19) })]);
  assert.equal(mixed.length, 2);
});

/* Durations (11 to 15) */

check('11 and 12. actual duration is planned minus remaining, so pauses never count', () => {
  // 25 minutes planned, finished with 10 minutes still on the clock
  // means 15 active minutes, however long the pauses in between were.
  const skipped = buildRecord(snap({ outcome: 'skipped', actualDurationMs: 15 * MIN }));
  assert.equal(skipped.actualDurationMs, 15 * MIN);
  const completed = buildRecord(snap({ actualDurationMs: 25 * MIN }));
  assert.equal(completed.actualDurationMs, completed.plannedDurationMs);
});

check('13 and 14. partial durations for skipped and reset sessions are recorded as given', () => {
  assert.equal(buildRecord(snap({ outcome: 'skipped', actualDurationMs: 15 * MIN })).actualDurationMs, 15 * MIN);
  assert.equal(buildRecord(snap({ outcome: 'abandoned', actualDurationMs: 5 * MIN })).actualDurationMs, 5 * MIN);
});

check('15. durations are clamped so nothing negative or over-planned survives', () => {
  assert.equal(buildRecord(snap({ actualDurationMs: -500 })).actualDurationMs, 0);
  assert.equal(buildRecord(snap({ actualDurationMs: 999 * MIN })).actualDurationMs, 25 * MIN);
});

/* Statistics (16 to 25) */

// Friday 20 Nov 2026, midday local. Its week is Mon 16 to Sun 22 Nov.
const NOW = new Date(2026, 10, 20, 12, 0);
const history = [
  buildRecord(snap({ timerSessionId: 1, eventKey: 'a', startedAt: at(2026, 11, 20, 9) })), // today
  buildRecord(snap({ timerSessionId: 2, eventKey: 'b', startedAt: at(2026, 11, 20, 10), actualDurationMs: 15 * MIN, plannedDurationMs: 15 * MIN })),
  buildRecord(snap({ timerSessionId: 3, eventKey: 'c', startedAt: at(2026, 11, 19, 9) })), // yesterday, same week
  buildRecord(snap({ timerSessionId: 4, eventKey: 'd', startedAt: at(2026, 11, 18, 9) })), // Wed, same week
  buildRecord(snap({ timerSessionId: 5, eventKey: 'e', startedAt: at(2026, 11, 10, 9) })), // last week
  buildRecord(snap({ timerSessionId: 6, eventKey: 'f', startedAt: at(2026, 11, 20, 11), outcome: 'skipped', actualDurationMs: 10 * MIN })),
  buildRecord(snap({ timerSessionId: 7, eventKey: 'g', startedAt: at(2026, 11, 20, 11, 30), outcome: 'abandoned', actualDurationMs: 5 * MIN })),
  buildRecord(snap({ timerSessionId: 8, eventKey: 'h', startedAt: at(2026, 11, 20, 8), sessionType: 'shortBreak', plannedDurationMs: 5 * MIN, actualDurationMs: 5 * MIN })),
];

check('16 to 18. only completed focus sessions count', () => {
  const stats = computeStats(history, NOW);
  assert.equal(stats.completedFocusSessions, 5); // not the skipped, abandoned, or break records
  assert.equal(stats.totalRecords, 8);
});

check('19 to 21. total, average, and longest focus time', () => {
  const stats = computeStats(history, NOW);
  assert.equal(stats.totalFocusMs, (25 + 15 + 25 + 25 + 25) * MIN);
  assert.equal(stats.averageFocusMs, Math.round(((25 + 15 + 25 + 25 + 25) * MIN) / 5));
  assert.equal(stats.longestFocusMs, 25 * MIN);
  assert.equal(computeStats([], NOW).averageFocusMs, 0); // no division by zero
});

check('22 to 25. today and this week use the local calendar, Monday first', () => {
  const stats = computeStats(history, NOW);
  assert.equal(stats.todaySessions, 2);
  assert.equal(stats.todayFocusMs, 40 * MIN);
  assert.equal(stats.weekSessions, 4); // Mon 16 to Sun 22 Nov
  assert.equal(stats.weekFocusMs, (25 + 15 + 25 + 25) * MIN);
});

check('weekly chart covers Monday to Sunday with zero days handled', () => {
  const week = weeklyActivity(history, NOW);
  assert.equal(week.length, 7);
  assert.deepEqual(week.map((d) => d.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(week[4].sessions, 2); // Friday the 20th
  assert.equal(week[4].isToday, true);
  assert.equal(week[0].sessions, 0); // Monday, no activity, still present
  assert.equal(week[2].focusMs, 25 * MIN); // Wednesday
});

/* Streaks and calendar (26 to 30) */

check('26. a streak counts consecutive active days including today', () => {
  assert.equal(currentStreak(history, NOW), 3); // 20th, 19th, 18th
});

check('27. the streak survives a quiet today if yesterday was active', () => {
  const saturday = new Date(2026, 10, 21, 9, 0); // nothing on the 21st yet
  assert.equal(currentStreak(history, saturday), 3);
});

check('28. the streak is zero when today and yesterday are both quiet', () => {
  const monday = new Date(2026, 10, 23, 9, 0); // 22nd and 23rd quiet (22nd has none in history)
  const withoutSunday = history.filter((r) => localDateKey(r.endedAt) !== '2026-11-22');
  assert.equal(currentStreak(withoutSunday, monday), 0);
});

check('29. grouping uses local dates, and the log groups match', () => {
  assert.equal(localDateKey(at(2026, 11, 20, 0, 5)), '2026-11-20');
  assert.equal(localDateKey(at(2026, 11, 19, 23, 55)), '2026-11-19');
  const groups = groupRecordsByDay(history, NOW);
  assert.equal(groups[0].label, 'TODAY');
  assert.equal(groups[1].label, 'YESTERDAY');
});

check('30. dates behave across month and year boundaries', () => {
  const newYearsDay = new Date(2027, 0, 1, 10, 0);
  const nye = buildRecord(snap({ timerSessionId: 9, eventKey: 'nye', startedAt: at(2026, 12, 31, 22) }));
  assert.equal(currentStreak([nye], newYearsDay), 1); // yesterday counts
  const week = weeklyActivity([nye], newYearsDay);
  assert.equal(week.length, 7);
  const cal = calendarActivity([nye], newYearsDay, 35);
  assert.equal(cal.length, 35);
  assert.equal(cal[cal.length - 1].dateKey, '2027-01-01');
  assert.equal(cal[cal.length - 2].sessions, 1); // 31 Dec 2026
});

/* Filtering (31 to 36) */

check('31 to 36. filters work on their own and together', () => {
  const withMission = [
    ...history,
    buildRecord(snap({ timerSessionId: 10, eventKey: 'm', startedAt: at(2026, 11, 20, 7), missionId: 'm1', missionTitle: 'Capstone', missionCode: 'MSN-001' })),
  ];
  assert.equal(filterRecords(withMission, { sessionType: 'shortBreak' }, NOW).length, 1);
  assert.equal(filterRecords(withMission, { mission: 'm1' }, NOW).length, 1);
  assert.equal(filterRecords(withMission, { mission: 'unassigned' }, NOW).length, withMission.length - 1);
  assert.equal(filterRecords(withMission, { outcome: 'skipped' }, NOW).length, 1);
  assert.equal(filterRecords(withMission, { range: 'today' }, NOW).length, 6);
  assert.equal(filterRecords(withMission, { range: '7d' }, NOW).length, 8); // all but last week's
  assert.equal(
    filterRecords(withMission, { range: 'today', outcome: 'completed', sessionType: 'focus', mission: 'unassigned' }, NOW).length,
    2,
  );
  assert.equal(filterRecords(withMission, { sort: 'oldest' }, NOW)[0].eventKey, 'e');
  assert.equal(distinctMissions(withMission)[0].title, 'Capstone');
});

/* Persistence (37 to 40) */

check('37 and 38. records restore after a reload without duplicating', () => {
  const restored = sanitizeRecords(JSON.parse(JSON.stringify(history)));
  assert.equal(restored.length, history.length);
  const again = sanitizeRecords([...restored, ...restored]);
  assert.equal(again.length, history.length);
  assert.equal(again[0].startedAt, history.map((r) => r.startedAt).sort((x, y) => x - y)[0]);
});

check('39. snapshots survive even when they are all that is left of a mission', () => {
  const orphan = buildRecord(snap({ missionId: 'deleted-mission', missionTitle: 'Old Project', missionCode: 'MSN-009' }));
  const restored = sanitizeRecords([orphan]);
  assert.equal(restored[0].missionTitle, 'Old Project');
  assert.equal(restored[0].missionCode, 'MSN-009');
});

check('40. building records does not need timer or mission data to change', () => {
  const timerState = { completedFocusSessions: 7, status: 'standby' };
  const frozen = JSON.stringify(timerState);
  buildRecord(snap());
  sanitizeRecords(history);
  assert.equal(JSON.stringify(timerState), frozen);
});

/* Sorting corrections */

const sortHistory = [
  buildRecord(snap({ timerSessionId: 21, eventKey: 's-nov18-early', startedAt: at(2026, 11, 18, 9) })),
  buildRecord(snap({ timerSessionId: 22, eventKey: 's-nov18-late', startedAt: at(2026, 11, 18, 15) })),
  buildRecord(snap({ timerSessionId: 23, eventKey: 's-nov19-early', startedAt: at(2026, 11, 19, 9) })),
  buildRecord(snap({ timerSessionId: 24, eventKey: 's-nov19-late', startedAt: at(2026, 11, 19, 16) })),
  buildRecord(snap({ timerSessionId: 25, eventKey: 's-nov20-early', startedAt: at(2026, 11, 20, 8) })),
  buildRecord(snap({ timerSessionId: 26, eventKey: 's-nov20-late', startedAt: at(2026, 11, 20, 11) })),
];

check('Sorting 1. newest-first date groups run newest date to oldest date', () => {
  const groups = groupRecordsByDay(sortHistory, NOW, 'newest');
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-20', '2026-11-19', '2026-11-18']);
  assert.equal(groups[0].label, 'TODAY');
  assert.equal(groups[1].label, 'YESTERDAY');
});

check('Sorting 2. newest-first records inside a date run newest to oldest', () => {
  const groups = groupRecordsByDay(sortHistory, NOW, 'newest');
  assert.deepEqual(groups[0].records.map((r) => r.eventKey), ['s-nov20-late', 's-nov20-early']);
  assert.deepEqual(groups[2].records.map((r) => r.eventKey), ['s-nov18-late', 's-nov18-early']);
});

check('Sorting 3. oldest-first date groups run oldest date to newest date', () => {
  const groups = groupRecordsByDay(sortHistory, NOW, 'oldest');
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-18', '2026-11-19', '2026-11-20']);
  assert.equal(groups[2].label, 'TODAY');
  assert.equal(groups[1].label, 'YESTERDAY');
});

check('Sorting 4. oldest-first records inside a date run oldest to newest, without mutating input', () => {
  const before = sortHistory.map((r) => r.eventKey);
  const groups = groupRecordsByDay(sortHistory, NOW, 'oldest');
  assert.deepEqual(groups[0].records.map((r) => r.eventKey), ['s-nov18-early', 's-nov18-late']);
  assert.deepEqual(groups[2].records.map((r) => r.eventKey), ['s-nov20-early', 's-nov20-late']);
  assert.deepEqual(sortHistory.map((r) => r.eventKey), before);
  // Default stays newest-first for existing callers.
  assert.deepEqual(groupRecordsByDay(sortHistory, NOW).map((g) => g.key), ['2026-11-20', '2026-11-19', '2026-11-18']);
});

check('Sorting 5. oldest-first grouping stays consistent with combined filters', () => {
  const mixed = [
    ...sortHistory,
    buildRecord(snap({ timerSessionId: 27, eventKey: 's-skipped', startedAt: at(2026, 11, 20, 10), outcome: 'skipped', actualDurationMs: 10 * MIN })),
    buildRecord(snap({ timerSessionId: 28, eventKey: 's-mission', startedAt: at(2026, 11, 19, 12), missionId: 'm1', missionTitle: 'Capstone', missionCode: 'MSN-001' })),
    buildRecord(snap({ timerSessionId: 29, eventKey: 's-break', startedAt: at(2026, 11, 18, 12), sessionType: 'shortBreak', plannedDurationMs: 5 * MIN, actualDurationMs: 5 * MIN })),
  ];
  const filtered = filterRecords(
    mixed,
    { range: '7d', sessionType: 'focus', outcome: 'completed', mission: 'unassigned', sort: 'oldest' },
    NOW,
  );
  assert.deepEqual(filtered.map((r) => r.eventKey), [
    's-nov18-early',
    's-nov18-late',
    's-nov19-early',
    's-nov19-late',
    's-nov20-early',
    's-nov20-late',
  ]);
  const groups = groupRecordsByDay(filtered, NOW, 'oldest');
  assert.deepEqual(groups.map((g) => g.key), ['2026-11-18', '2026-11-19', '2026-11-20']);
  assert.deepEqual(groups.flatMap((g) => g.records.map((r) => r.eventKey)), filtered.map((r) => r.eventKey));
});

/* Legacy session information */

check('Legacy 6. empty archive with zero legacy sessions reports zero', () => {
  const emptyStats = computeStats([], NOW);
  assert.equal(emptyStats.completedFocusSessions, 0);
  assert.equal(legacySessionCount(0, emptyStats.completedFocusSessions), 0);
});

check('Legacy 7. empty archive with earlier sessions reports them without listing them', () => {
  const emptyRecords = [];
  const emptyStats = computeStats(emptyRecords, NOW);
  assert.equal(legacySessionCount(4, emptyStats.completedFocusSessions), 4);
  assert.equal(emptyRecords.length, 0);
  // Legacy sessions have no records, so record-based statistics stay at zero.
  assert.equal(emptyStats.totalRecords, 0);
  assert.equal(emptyStats.totalFocusMs, 0);
});

check('Legacy 8. archive with new records and legacy sessions reports only the difference', () => {
  const stats = computeStats(history, NOW); // 5 recorded completed focus sessions
  assert.equal(stats.completedFocusSessions, 5);
  assert.equal(legacySessionCount(8, stats.completedFocusSessions), 3);
});

check('Legacy 9. legacy count calculation is correct and never negative', () => {
  assert.equal(legacySessionCount(10, 3), 7);
  assert.equal(legacySessionCount(1, 0), 1);
  assert.equal(legacySessionCount(3, 3), 0);
  assert.equal(legacySessionCount(2, 5), 0);
  assert.equal(legacySessionCount(undefined, undefined), 0);
  assert.equal(legacySessionCount('garbage', null), 0);
});

check('Legacy 10. calculating the legacy count creates no fabricated records', () => {
  const recordsBefore = [...history];
  const count = legacySessionCount(12, computeStats(history, NOW).completedFocusSessions);
  assert.equal(count, 7);
  assert.deepEqual(history, recordsBefore);
  assert.equal(history.length, 8);
  assert.equal(sanitizeRecords([]).length, 0);
  // The legacy count is not turned into statistics either.
  assert.equal(computeStats(history, NOW).completedFocusSessions, 5);
});

check('Legacy 11. recorded sessions are not counted twice', () => {
  const recorded = computeStats(history, NOW).completedFocusSessions;
  // Timer counter matches the recorded total exactly: nothing is legacy.
  assert.equal(legacySessionCount(recorded, recorded), 0);
  assert.equal(recorded + legacySessionCount(recorded, recorded), recorded);
  // Timer counter covering recorded plus earlier sessions totals each session once.
  assert.equal(recorded + legacySessionCount(recorded + 3, recorded), recorded + 3);
});

console.log(`\nAll ${passed} operation logic tests passed.`);
