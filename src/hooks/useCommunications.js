import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from '../services/storageService';
import {
  appendMessage,
  buildMessage,
  clearTransmissionHistory,
  latestMessage,
  sanitizeKeyList,
  sanitizeMessages,
  sanitizePreferences,
  shouldEmit,
} from './communicationLogic';
import { playNotificationSound, showBrowserNotification } from '../services/notificationService';

const MESSAGES_KEY = 'communications';
const PREFERENCES_KEY = 'communication-preferences';
const PROCESSED_KEY = 'communication-processed';

/**
 * Para-RAID state: transmission history plus preferences.
 *
 * emit() is called by the timer and mission hooks when something
 * actually happens. Every event carries a unique key, and every key
 * that has been seen is remembered. That stops duplicates, and it
 * also stops an old event appearing later just because a channel
 * was turned back on.
 */
export function useCommunications() {
  const [messages, setMessages] = useState(() => sanitizeMessages(read(MESSAGES_KEY, [])));
  const [preferences, setPreferences] = useState(() =>
    sanitizePreferences(read(PREFERENCES_KEY, null)),
  );
  const [processedKeys, setProcessedKeys] = useState(() =>
    sanitizeKeyList(read(PROCESSED_KEY, [])),
  );

  const prefsRef = useRef(preferences);
  const processedRef = useRef(processedKeys);
  prefsRef.current = preferences;
  processedRef.current = processedKeys;

  useEffect(() => {
    write(MESSAGES_KEY, messages);
  }, [messages]);

  useEffect(() => {
    write(PREFERENCES_KEY, preferences);
  }, [preferences]);

  useEffect(() => {
    write(PROCESSED_KEY, processedKeys);
  }, [processedKeys]);

  const emit = useCallback((event) => {
    if (!event || typeof event.type !== 'string') return false;
    const at = Number.isFinite(event.at) ? event.at : Date.now();
    const eventKey = event.eventKey || `${event.type}-${at}`;
    if (processedRef.current.includes(eventKey)) return false;

    const nextKeys = [...processedRef.current, eventKey].slice(-300);
    processedRef.current = nextKeys;
    setProcessedKeys(nextKeys);

    const message = buildMessage({ ...event, at, eventKey }, `msg-${at}-${Math.random().toString(36).slice(2, 7)}`);
    if (!message || !shouldEmit(message, prefsRef.current)) return false;

    setMessages((prev) => appendMessage(prev, message));
    if (prefsRef.current.sound) playNotificationSound();
    if (prefsRef.current.browserNotifications && message.tier === 1) {
      showBrowserNotification(message.text);
    }
    return true;
  }, []);

  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) =>
      sanitizePreferences({
        ...prev,
        ...patch,
        categories: { ...prev.categories, ...(patch.categories || {}) },
      }),
    );
  }, []);

  // Clears messages only. Preferences and the processed event keys
  // used for duplicate prevention are deliberately left alone, so an
  // old event cannot reappear just because the log was emptied.
  const clearHistory = useCallback(() => {
    setMessages((prev) => clearTransmissionHistory(prev));
  }, []);

  const latest = latestMessage(messages);

  return { messages, latest, preferences, updatePreferences, emit, clearHistory };
}
