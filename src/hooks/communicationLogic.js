/**
 * Pure Para-RAID communication logic.
 *
 * Four channels, and every message comes from a real app event.
 * There are no characters here. The channels are just categories:
 * handler (command), squadron (unit status), system (automated),
 * mission (Mission Control).
 *
 * Frequency tiers: 1 shows at Minimal, 2 at Standard, 3 only at Frequent.
 */

export const CHANNELS = {
  handler: 'Handler Command',
  squadron: 'Squadron Channel',
  system: 'System Notifications',
  mission: 'Mission Control',
};

export const FREQUENCIES = ['minimal', 'standard', 'frequent'];
const FREQUENCY_LEVEL = { minimal: 1, standard: 2, frequent: 3 };

export const DEFAULT_PREFERENCES = {
  enabled: true,
  categories: { handler: true, squadron: true, system: true, mission: true },
  frequency: 'standard',
  sound: false,
  browserNotifications: false,
};

/**
 * The event catalogue. Each entry knows its channel, how chatty it is,
 * and how to word the message. Context carries names and codes for
 * mission events, so messages can say which mission they mean.
 */
export const EVENT_DEFS = {
  'timer.focus.started': {
    category: 'handler',
    tier: 2,
    label: 'Operation Started',
    text: () => 'Operation authorized. Begin assigned objectives.',
  },
  'timer.focus.paused': {
    category: 'system',
    tier: 3,
    label: 'Operation Paused',
    text: () => 'Operation suspended. Awaiting operator input.',
  },
  'timer.focus.resumed': {
    category: 'squadron',
    tier: 3,
    label: 'Operation Resumed',
    text: () => 'Operational sequence restored. Continue execution.',
  },
  'timer.focus.milestone': {
    category: 'squadron',
    tier: 3,
    label: 'Focus Milestone',
    text: () => 'Operational interval progressing within schedule. Halfway point reached.',
  },
  'timer.focus.completed': {
    category: 'handler',
    tier: 1,
    label: 'Operation Completed',
    text: () => 'Operation concluded. Results successfully recorded.',
  },
  'timer.focus.skipped': {
    category: 'system',
    tier: 3,
    label: 'Operation Skipped',
    text: () => 'Operation abandoned by operator. Session not recorded as completed.',
  },
  'timer.focus.reset': {
    category: 'system',
    tier: 3,
    label: 'Timer Reset',
    text: () => 'Operation reset. Timer returned to standby.',
  },
  'timer.break.started': {
    category: 'handler',
    tier: 2,
    label: 'Respite Started',
    text: (c) =>
      c.sessionType === 'longBreak'
        ? 'Extended respite authorized. Stand by for the next operational cycle.'
        : 'Respite period authorized. Stand by for the next operational cycle.',
  },
  'timer.break.paused': {
    category: 'system',
    tier: 3,
    label: 'Respite Paused',
    text: () => 'Respite suspended. Awaiting operator input.',
  },
  'timer.break.resumed': {
    category: 'squadron',
    tier: 3,
    label: 'Respite Resumed',
    text: () => 'Respite resumed.',
  },
  'timer.break.completed': {
    category: 'squadron',
    tier: 1,
    label: 'Respite Completed',
    text: () => 'Respite concluded. Prepare for the next operation.',
  },
  'timer.break.skipped': {
    category: 'system',
    tier: 3,
    label: 'Respite Skipped',
    text: () => 'Respite ended early by operator.',
  },
  'timer.break.reset': {
    category: 'system',
    tier: 3,
    label: 'Timer Reset',
    text: () => 'Respite reset. Timer returned to standby.',
  },
  'mission.created': {
    category: 'mission',
    tier: 2,
    label: 'Mission Created',
    text: (c) => `New mission registered in the operational database: ${c.title} (${c.code}).`,
  },
  'mission.edited': {
    category: 'mission',
    tier: 3,
    label: 'Mission Updated',
    text: (c) => `Mission record updated: ${c.title} (${c.code}).`,
  },
  'mission.archived': {
    category: 'mission',
    tier: 2,
    label: 'Mission Archived',
    text: (c) => `Mission archived: ${c.title} (${c.code}).`,
  },
  'mission.restored': {
    category: 'mission',
    tier: 2,
    label: 'Mission Restored',
    text: (c) => `Mission restored to the operational board: ${c.title} (${c.code}).`,
  },
  'mission.reopened': {
    category: 'mission',
    tier: 2,
    label: 'Mission Reopened',
    text: (c) => `Mission reopened: ${c.title} (${c.code}).`,
  },
  'mission.completed': {
    category: 'mission',
    tier: 1,
    label: 'Mission Completed',
    text: (c) => `Mission status updated: COMPLETED. ${c.title} (${c.code}).`,
  },
  'mission.objectivesCompleted': {
    category: 'mission',
    tier: 2,
    label: 'All Objectives Completed',
    text: (c) =>
      `All objectives completed. Mission completion is awaiting operator authorization. ${c.title} (${c.code}).`,
  },
  'mission.objectiveCompleted': {
    category: 'mission',
    tier: 2,
    label: 'Objective Completed',
    text: (c) => `Objective accomplished. Mission progress updated: ${c.title} (${c.code}).`,
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizePreferences(raw) {
  if (!isPlainObject(raw)) return { ...DEFAULT_PREFERENCES, categories: { ...DEFAULT_PREFERENCES.categories } };
  const cats = isPlainObject(raw.categories) ? raw.categories : {};
  return {
    enabled: raw.enabled !== false,
    categories: {
      handler: cats.handler !== false,
      squadron: cats.squadron !== false,
      system: cats.system !== false,
      mission: cats.mission !== false,
    },
    frequency: FREQUENCIES.includes(raw.frequency) ? raw.frequency : 'standard',
    sound: raw.sound === true,
    browserNotifications: raw.browserNotifications === true,
  };
}

/** Turn a raw event into a ready to store message, or null if unknown. */
export function buildMessage(event, id) {
  const def = EVENT_DEFS[event?.type];
  if (!def || !Number.isFinite(event.at)) return null;
  return {
    id,
    eventKey: event.eventKey || `${event.type}-${event.at}`,
    type: event.type,
    category: def.category,
    label: def.label,
    tier: def.tier,
    text: def.text(event.context || {}),
    at: event.at,
  };
}

/** Should this message be shown, given the current preferences? */
export function shouldEmit(message, preferences) {
  const prefs = sanitizePreferences(preferences);
  if (!prefs.enabled) return false;
  if (!prefs.categories[message.category]) return false;
  return message.tier <= (FREQUENCY_LEVEL[prefs.frequency] ?? 2);
}

/** Clearing history means an empty list. Preferences are kept elsewhere. */
export function clearTransmissionHistory() {
  return [];
}

export function latestMessage(messages) {
  return Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
}

/** Add a message unless its event already produced one. Keeps the newest 200. */
export function appendMessage(messages, message, limit = 200) {
  if (!message) return messages;
  if (messages.some((m) => m.eventKey === message.eventKey)) return messages;
  return [...messages, message].slice(-limit);
}

export function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of raw) {
    if (!isPlainObject(item)) continue;
    const def = EVENT_DEFS[item.type];
    if (!def || !Number.isFinite(item.at) || typeof item.text !== 'string' || !item.text) continue;
    const eventKey = typeof item.eventKey === 'string' && item.eventKey ? item.eventKey : `${item.type}-${item.at}`;
    if (seen.has(eventKey)) continue;
    seen.add(eventKey);
    clean.push({
      id: typeof item.id === 'string' && item.id ? item.id : `msg-restored-${clean.length + 1}`,
      eventKey,
      type: item.type,
      category: def.category,
      label: def.label,
      tier: def.tier,
      text: item.text,
      at: item.at,
    });
  }
  return clean.slice(-200);
}

export function sanitizeKeyList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((k) => typeof k === 'string' && k))].slice(-300);
}

export function formatTimestamp(at) {
  if (!Number.isFinite(at)) return '';
  const date = new Date(at);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', { hour12: false });
  return `${day} · ${time}`;
}
