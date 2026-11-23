import { useCallback, useEffect, useState } from 'react';
import { read, write } from '../services/storageService';
import { buildRecord, sanitizeRecords } from './operationLogic';

const STORAGE_KEY = 'operations';

/**
 * Saved operation records.
 * record() is called with the timer's lastRecord snapshot whenever a
 * session ends. Duplicates are refused by event key, both here and
 * when the saved list is loaded, so refreshes and repeated effects
 * can never create the same record twice.
 */
export function useOperations() {
  const [records, setRecords] = useState(() => sanitizeRecords(read(STORAGE_KEY, [])));

  useEffect(() => {
    write(STORAGE_KEY, records);
  }, [records]);

  const record = useCallback((snapshot) => {
    const built = buildRecord(snapshot);
    if (!built) return false;
    let added = false;
    setRecords((prev) => {
      if (prev.some((r) => r.eventKey === built.eventKey)) return prev;
      added = true;
      return [...prev, built];
    });
    return added;
  }, []);

  return { records, record };
}
