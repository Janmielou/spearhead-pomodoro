import { useCallback, useEffect, useState } from 'react';
import { read, write } from '../services/storageService';
import {
  DEFAULT_INTERFACE_PREFERENCES,
  sanitizeInterfacePreferences,
} from './interfaceLogic.js';

export { DEFAULT_INTERFACE_PREFERENCES, sanitizeInterfacePreferences };

const STORAGE_KEY = 'interface-preferences';

/**
 * Practical display preferences, saved through storageService.
 * Sound and browser notifications are not duplicated here. They
 * stay with the shared communication preferences.
 */
export function useInterfacePreferences() {
  const [preferences, setPreferences] = useState(() =>
    sanitizeInterfacePreferences(read(STORAGE_KEY, DEFAULT_INTERFACE_PREFERENCES)),
  );

  useEffect(() => {
    write(STORAGE_KEY, preferences);
  }, [preferences]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) => sanitizeInterfacePreferences({ ...prev, ...(patch || {}) }));
  }, []);

  return { preferences, updatePreferences };
}
