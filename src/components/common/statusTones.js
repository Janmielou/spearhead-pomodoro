/**
 * Central semantic tone map for StatusBadge.
 * Status, priority, outcome, timer state, and channel each get
 * their own colors so one color never means two different things.
 * Every badge also carries visible text, never color alone.
 */
export const MISSION_STATUS_TONES = {
  pending: 'steel',
  active: 'cyan',
  completed: 'green',
  archived: 'gray',
};

export const PRIORITY_TONES = {
  low: 'gray',
  normal: 'info',
  high: 'amber',
  critical: 'red',
};

export const OUTCOME_TONES = {
  completed: 'green',
  skipped: 'amber',
  abandoned: 'red',
};

export const TIMER_STATUS_TONES = {
  standby: 'steel',
  running: 'cyan',
  paused: 'amber',
  completed: 'green',
};

export const CHANNEL_TONES = {
  handler: 'cyan',
  squadron: 'info',
  system: 'steel',
  mission: 'deep',
};
