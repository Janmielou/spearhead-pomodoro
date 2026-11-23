/**
 * Sound and browser notifications for Para-RAID.
 * Both are off by default and only ever called when the operator has
 * turned them on. Everything here fails quietly: no audio device or
 * no permission just means no alert.
 */

let audioContext = null;

/** Two short soft tones, generated in code. No audio files needed. */
export function playNotificationSound() {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audioContext = audioContext || new Ctor();
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    [880, 1174].forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.2);
    });
  } catch {
    /* sound is optional, never break the app for it */
  }
}

export function browserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestBrowserPermission() {
  if (!browserNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function browserPermission() {
  if (!browserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/** Only used for the most important (tier 1) transmissions. */
export function showBrowserNotification(text) {
  try {
    if (!browserNotificationSupported() || Notification.permission !== 'granted') return;
    new Notification('SPEARHEAD', { body: text, tag: 'spearhead-paraid' });
  } catch {
    /* notifications are optional */
  }
}
