import { useEffect, useState } from 'react';
import { DEFAULT_TIMER_SETTINGS } from '../../hooks/timerLogic';

const FIELDS = [
  { key: 'focusMinutes', label: 'Focus duration (minutes)', min: 1, max: 180 },
  { key: 'shortBreakMinutes', label: 'Short break duration (minutes)', min: 1, max: 90 },
  { key: 'longBreakMinutes', label: 'Long break duration (minutes)', min: 1, max: 120 },
  { key: 'sessionsPerCycle', label: 'Focus sessions per cycle', min: 1, max: 12 },
];

function validate(draft) {
  const errors = {};
  for (const field of FIELDS) {
    const value = Number(draft[field.key]);
    if (!Number.isInteger(value) || value < field.min || value > field.max) {
      errors[field.key] = `Use a whole number from ${field.min} to ${field.max}.`;
    }
  }
  return errors;
}

export default function TimerSettings({ timer }) {
  const { settings, state } = timer;
  const [draft, setDraft] = useState(settings);
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState('');

  // Keep the form in step with saved values loaded or applied elsewhere.
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const locked = state.status === 'running' || state.status === 'paused';
  const dirty = FIELDS.some((field) => Number(draft[field.key]) !== settings[field.key]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setNote('Settings were not applied. Correct the highlighted values first.');
      return;
    }
    timer.updateSettings({
      focusMinutes: Number(draft.focusMinutes),
      shortBreakMinutes: Number(draft.shortBreakMinutes),
      longBreakMinutes: Number(draft.longBreakMinutes),
      sessionsPerCycle: Number(draft.sessionsPerCycle),
    });
    setNote(
      state.status === 'completed'
        ? 'Timer settings saved. The new lengths apply from the next session.'
        : 'Timer settings saved. The standby timer now uses the new lengths.',
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="settings-current terminal-surface mono" aria-label="Current saved timer settings">
        Current: {settings.focusMinutes} min focus / {settings.shortBreakMinutes} min short break /{' '}
        {settings.longBreakMinutes} min long break / {settings.sessionsPerCycle} sessions per cycle
      </p>

      {locked && (
        <p className="notice" role="status">
          A session is {state.status}. Duration controls are locked so the active countdown is
          never changed unexpectedly. You can edit them again when the timer returns to standby.
        </p>
      )}
      {state.status === 'completed' && !locked && (
        <p className="foot-note" role="status" style={{ marginBottom: 12 }}>
          The current session is finished. Applied settings take effect on the next session and
          do not reset your cycle position.
        </p>
      )}

      <fieldset className="settings-fieldset" disabled={locked}>
        <div className="form-row">
          {FIELDS.map((field) => (
            <div className="form-field" key={field.key}>
              <label htmlFor={`timer-${field.key}`}>{field.label}</label>
              <input
                id={`timer-${field.key}`}
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                step={1}
                value={draft[field.key]}
                aria-invalid={errors[field.key] ? 'true' : undefined}
                aria-describedby={errors[field.key] ? `timer-${field.key}-error` : undefined}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, [field.key]: event.target.value }));
                  setNote('');
                }}
              />
              {errors[field.key] && (
                <p className="form-error" id={`timer-${field.key}-error`} role="alert">
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={locked || !dirty}>
          Apply Timer Settings
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={locked}
          onClick={() => {
            setDraft(DEFAULT_TIMER_SETTINGS);
            setErrors({});
            setNote('Defaults restored in the form. Select Apply Timer Settings to save them.');
          }}
        >
          Restore Defaults
        </button>
      </div>
      {note && (
        <p className="foot-note" role="status" style={{ marginTop: 8 }}>
          {note}
        </p>
      )}
    </form>
  );
}
