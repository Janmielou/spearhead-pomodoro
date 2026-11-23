/**
 * Structured storage service (Spec §7/§8).
 * Phase 1 establishes the safe read/write boundary so later phases
 * never scatter raw localStorage calls through components.
 * Feature data (missions, operations, settings) is wired in Phases 2 to 6.
 */
const PREFIX = 'spearhead:';

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    // Corrupted or unavailable storage must never crash the app (Spec §8).
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable, ignore */
  }
}
