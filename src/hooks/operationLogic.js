/**
 * Pure operations history logic.
 *
 * Records come from finished timer sessions. Statistics only ever
 * count focus sessions that reached zero (outcome: completed).
 * Skipped, abandoned, and break records are kept in the log but
 * never counted as focus work.
 *
 * All dates use the local calendar. A day is a local date string
 * like "2026-11-20", weeks run Monday to Sunday, and day stepping
 * goes through the Date constructor so daylight saving is safe.
 */

export const SESSION_TYPE_LABELS = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export const OUTCOMES = ['completed', 'skipped', 'abandoned'];
export const OUTCOME_LABELS = {
  completed: 'Completed',
  skipped: 'Skipped',
  abandoned: 'Abandoned',
};

const SESSION_TYPES = Object.keys(SESSION_TYPE_LABELS);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/* ---------------- Records ---------------- */

/** Turn a timer session snapshot into a valid record, or null. */
export function buildRecord(snapshot) {
  if (!isPlainObject(snapshot)) return null;
  if (!SESSION_TYPES.includes(snapshot.sessionType)) return null;
  if (!OUTCOMES.includes(snapshot.outcome)) return null;

  const { startedAt, endedAt } = snapshot;
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    return null;
  }
  const planned = Math.max(0, Math.round(Number(snapshot.plannedDurationMs) || 0));
  if (planned <= 0) return null;
  const actual = Math.min(planned, Math.max(0, Math.round(Number(snapshot.actualDurationMs) || 0)));
  const timerSessionId = Number.isFinite(snapshot.timerSessionId)
    ? Math.max(0, Math.round(snapshot.timerSessionId))
    : 0;

  const missionId =
    snapshot.sessionType === 'focus' && typeof snapshot.missionId === 'string' && snapshot.missionId
      ? snapshot.missionId
      : null;

  const eventKey =
    typeof snapshot.eventKey === 'string' && snapshot.eventKey
      ? snapshot.eventKey
      : `timer-${timerSessionId}-${startedAt}-${snapshot.outcome}`;

  return {
    id: `op-${eventKey}`,
    eventKey,
    timerSessionId,
    sessionType: snapshot.sessionType,
    missionId,
    missionTitle: missionId ? cleanText(snapshot.missionTitle) || null : null,
    missionCode: missionId ? cleanText(snapshot.missionCode) || null : null,
    plannedDurationMs: planned,
    actualDurationMs: actual,
    startedAt,
    endedAt,
    outcome: snapshot.outcome,
  };
}

/** Visible designation, kept in step with the timer's OP numbers. */
export function recordDesignation(record) {
  return `OP-${String(Math.max(1, record.timerSessionId || 1)).padStart(4, '0')}`;
}

/** Clean up saved records. Broken ones are dropped, duplicates removed. */
export function sanitizeRecords(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of raw) {
    const record = buildRecord(item);
    if (!record) continue;
    // Saved records carry their own id; keep it if present.
    if (typeof item.id === 'string' && item.id) record.id = item.id;
    if (seen.has(record.eventKey) || seen.has(record.id)) continue;
    seen.add(record.eventKey);
    seen.add(record.id);
    clean.push(record);
  }
  return clean.sort((a, b) => a.endedAt - b.endedAt);
}

/* ---------------- Dates (local calendar) ---------------- */

export function localDateKey(timestamp) {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKeyOf(date) {
  return localDateKey(date.getTime());
}

/** Step whole calendar days. Safe across month, year, and DST changes. */
export function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday 00:00 local of the week containing the given date. */
export function startOfWeek(date) {
  const day = startOfLocalDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------------- Focus activity ---------------- */

export function completedFocusRecords(records) {
  return records.filter((r) => r.sessionType === 'focus' && r.outcome === 'completed');
}

/** Map of local date key to { sessions, focusMs } for completed focus only. */
export function focusActivityByDay(records) {
  const map = new Map();
  for (const record of completedFocusRecords(records)) {
    const key = localDateKey(record.endedAt);
    const entry = map.get(key) ?? { sessions: 0, focusMs: 0 };
    entry.sessions += 1;
    entry.focusMs += record.actualDurationMs;
    map.set(key, entry);
  }
  return map;
}

/**
 * Consecutive local days with at least one completed focus session.
 * Counts back from today, or from yesterday if today has none yet.
 */
export function currentStreak(records, now = new Date()) {
  const active = focusActivityByDay(records);
  let cursor;
  if (active.has(dateKeyOf(now))) {
    cursor = startOfLocalDay(now);
  } else if (active.has(dateKeyOf(addDays(now, -1)))) {
    cursor = addDays(startOfLocalDay(now), -1);
  } else {
    return 0;
  }
  let streak = 0;
  while (active.has(dateKeyOf(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeStats(records, now = new Date()) {
  const focus = completedFocusRecords(records);
  const totalFocusMs = focus.reduce((sum, r) => sum + r.actualDurationMs, 0);
  const byDay = focusActivityByDay(records);

  const today = byDay.get(dateKeyOf(now)) ?? { sessions: 0, focusMs: 0 };

  const weekStart = startOfWeek(now);
  let weekSessions = 0;
  let weekFocusMs = 0;
  for (let i = 0; i < 7; i += 1) {
    const entry = byDay.get(dateKeyOf(addDays(weekStart, i)));
    if (entry) {
      weekSessions += entry.sessions;
      weekFocusMs += entry.focusMs;
    }
  }

  return {
    totalRecords: records.length,
    completedFocusSessions: focus.length,
    totalFocusMs,
    averageFocusMs: focus.length === 0 ? 0 : Math.round(totalFocusMs / focus.length),
    longestFocusMs: focus.reduce((max, r) => Math.max(max, r.actualDurationMs), 0),
    todaySessions: today.sessions,
    todayFocusMs: today.focusMs,
    weekSessions,
    weekFocusMs,
    streak: currentStreak(records, now),
  };
}

/** Seven entries, Monday to Sunday, for the week containing `now`. */
export function weeklyActivity(records, now = new Date()) {
  const byDay = focusActivityByDay(records);
  const monday = startOfWeek(now);
  return DAY_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    const entry = byDay.get(dateKeyOf(date)) ?? { sessions: 0, focusMs: 0 };
    return {
      label,
      date,
      dateKey: dateKeyOf(date),
      sessions: entry.sessions,
      focusMs: entry.focusMs,
      isToday: dateKeyOf(date) === dateKeyOf(now),
    };
  });
}

/** The last `count` days including today, oldest first. */
export function calendarActivity(records, now = new Date(), count = 35) {
  const byDay = focusActivityByDay(records);
  const days = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = addDays(startOfLocalDay(now), -i);
    const entry = byDay.get(dateKeyOf(date)) ?? { sessions: 0, focusMs: 0 };
    days.push({
      date,
      dateKey: dateKeyOf(date),
      sessions: entry.sessions,
      focusMs: entry.focusMs,
      isToday: i === 0,
    });
  }
  return days;
}

/* ---------------- Filtering and grouping ---------------- */

export function distinctMissions(records) {
  const seen = new Map();
  for (const record of records) {
    if (record.missionId && !seen.has(record.missionId)) {
      seen.set(record.missionId, {
        id: record.missionId,
        title: record.missionTitle || 'Untitled mission',
        code: record.missionCode || '',
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function filterRecords(
  records,
  {
    range = 'all',
    from = '',
    to = '',
    mission = 'all',
    sessionType = 'all',
    outcome = 'all',
    sort = 'newest',
  } = {},
  now = new Date(),
) {
  const todayKey = dateKeyOf(now);
  const rangeStart =
    range === '7d'
      ? dateKeyOf(addDays(now, -6))
      : range === '30d'
        ? dateKeyOf(addDays(now, -29))
        : null;

  const filtered = records.filter((record) => {
    const key = localDateKey(record.endedAt);
    if (range === 'today' && key !== todayKey) return false;
    if (rangeStart && key < rangeStart) return false;
    if (range === 'custom') {
      if (from && key < from) return false;
      if (to && key > to) return false;
    }
    if (mission === 'unassigned' && record.missionId) return false;
    if (mission !== 'all' && mission !== 'unassigned' && record.missionId !== mission) return false;
    if (sessionType !== 'all' && record.sessionType !== sessionType) return false;
    if (outcome !== 'all' && record.outcome !== outcome) return false;
    return true;
  });

  return [...filtered].sort((a, b) =>
    sort === 'oldest' ? a.endedAt - b.endedAt : b.endedAt - a.endedAt,
  );
}

/**
 * How many completed focus sessions are only known from the timer's
 * overall counter, because they finished before individual records
 * existed. This never creates records and never counts a recorded
 * session twice: it is simply the counter minus the recorded total.
 */
export function legacySessionCount(timerCompletedFocusSessions, recordedCompletedFocusSessions) {
  const total = Math.max(0, Math.floor(Number(timerCompletedFocusSessions) || 0));
  const recorded = Math.max(0, Math.floor(Number(recordedCompletedFocusSessions) || 0));
  return Math.max(0, total - recorded);
}

/**
 * Group records by local day for the log.
 * The sort order applies to both the date groups and the records
 * inside each group, so the log matches the filtered order.
 * The input array is copied first and never mutated.
 */
export function groupRecordsByDay(records, now = new Date(), sort = 'newest') {
  const sorted = [...records].sort((a, b) =>
    sort === 'oldest' ? a.endedAt - b.endedAt : b.endedAt - a.endedAt,
  );
  const groups = [];
  const todayKey = dateKeyOf(now);
  const yesterdayKey = dateKeyOf(addDays(now, -1));

  for (const record of sorted) {
    const key = localDateKey(record.endedAt);
    let label;
    if (key === todayKey) label = 'TODAY';
    else if (key === yesterdayKey) label = 'YESTERDAY';
    else {
      label = new Date(record.endedAt)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        .toUpperCase();
    }
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.records.push(record);
    else groups.push({ key, label, records: [record] });
  }
  return groups;
}

/* ---------------- Display helpers ---------------- */

/** "2h 05m", "45m", "0m". Used for totals and averages. */
export function formatFocusTime(ms) {
  const totalMinutes = Math.round(Math.max(0, Number(ms) || 0) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m`;
}
