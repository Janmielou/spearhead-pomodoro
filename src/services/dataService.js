import { read, remove, write } from './storageService.js';

/**
 * Backup, restore, and reset for SPEARHEAD browser data.
 * Only the known SPEARHEAD keys are ever touched. Unrelated
 * browser storage is never read, exported, or deleted.
 */
export const BACKUP_VERSION = 1;

export const DATA_KEYS = [
  'timer-settings',
  'timer-state',
  'missions',
  'communications',
  'communication-preferences',
  'communication-processed',
  'operations',
  'interface-preferences',
];

const ARRAY_KEYS = new Set([
  'missions',
  'communications',
  'communication-processed',
  'operations',
]);

const OBJECT_KEYS = new Set([
  'timer-settings',
  'timer-state',
  'communication-preferences',
  'interface-preferences',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function buildBackup(now = new Date()) {
  const data = {};
  for (const key of DATA_KEYS) {
    const value = read(key, null);
    if (value !== null) data[key] = value;
  }
  return {
    app: 'SPEARHEAD',
    kind: 'spearhead-backup',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

function countOf(value) {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Check a parsed backup before anything is applied.
 * Returns a preview the operator can confirm, or clear errors.
 * Detailed records are sanitized again by their own hooks on load,
 * so a structurally valid backup cannot corrupt the application.
 */
export function validateBackup(raw) {
  const errors = [];
  if (!isPlainObject(raw)) {
    return { ok: false, errors: ['The file is not a SPEARHEAD backup object.'], preview: null, data: null };
  }
  if (raw.app !== 'SPEARHEAD' || raw.kind !== 'spearhead-backup') {
    errors.push('The file does not identify itself as a SPEARHEAD backup.');
  }
  if (raw.version !== BACKUP_VERSION) {
    errors.push(`Unsupported backup version: ${String(raw.version ?? 'missing')}.`);
  }
  if (!isPlainObject(raw.data)) {
    errors.push('The backup has no data section.');
    return { ok: false, errors, preview: null, data: null };
  }

  for (const [key, value] of Object.entries(raw.data)) {
    if (!DATA_KEYS.includes(key)) {
      errors.push(`Unknown data section: ${key}.`);
    } else if (value !== null && ARRAY_KEYS.has(key) && !Array.isArray(value)) {
      errors.push(`The ${key} section must be a list.`);
    } else if (value !== null && OBJECT_KEYS.has(key) && !isPlainObject(value)) {
      errors.push(`The ${key} section must be an object.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors, preview: null, data: null };

  const preview = {
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null,
    missions: countOf(raw.data.missions),
    operations: countOf(raw.data.operations),
    transmissions: countOf(raw.data.communications),
    sections: Object.keys(raw.data),
  };
  return { ok: true, errors: [], preview, data: raw.data };
}

/** Apply only the sections present in a validated backup. */
export function applyBackup(data) {
  if (!isPlainObject(data)) return false;
  for (const key of DATA_KEYS) {
    if (!(key in data)) continue;
    if (data[key] === null) remove(key);
    else write(key, data[key]);
  }
  return true;
}

/** Remove every SPEARHEAD key and nothing else. */
export function clearApplicationData() {
  for (const key of DATA_KEYS) remove(key);
}
