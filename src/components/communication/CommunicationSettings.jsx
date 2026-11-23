import { useState } from 'react';
import { CHANNELS } from '../../hooks/communicationLogic';
import {
  browserNotificationSupported,
  browserPermission,
  requestBrowserPermission,
} from '../../services/notificationService';

function Toggle({ id, label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <span>
        <label htmlFor={id}>{label}</label>
        {description && <span className="toggle-desc">{description}</span>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export default function CommunicationSettings({ communications }) {
  const { preferences, updatePreferences } = communications;
  const [note, setNote] = useState('');

  const handleBrowserToggle = async (enabled) => {
    if (!enabled) {
      updatePreferences({ browserNotifications: false });
      setNote('');
      return;
    }
    if (!browserNotificationSupported()) {
      setNote('This browser does not support notifications.');
      return;
    }
    const result = browserPermission() === 'granted' ? 'granted' : await requestBrowserPermission();
    if (result === 'granted') {
      updatePreferences({ browserNotifications: true });
      setNote('Browser notifications are on. Only the most important messages use them.');
    } else {
      updatePreferences({ browserNotifications: false });
      setNote('Permission was not granted, so browser notifications stay off.');
    }
  };

  return (
    <div>
      <Toggle
        id="paraid-enabled"
        label="Para-RAID communications"
        description="Master switch. Off means no messages are recorded at all."
        checked={preferences.enabled}
        onChange={(v) => updatePreferences({ enabled: v })}
      />

      <fieldset className="toggle-group" disabled={!preferences.enabled}>
        <legend className="ops-label">Channels</legend>
        {Object.entries(CHANNELS).map(([key, label]) => (
          <Toggle
            key={key}
            id={`channel-${key}`}
            label={label}
            checked={preferences.categories[key]}
            onChange={(v) => updatePreferences({ categories: { [key]: v } })}
          />
        ))}
      </fieldset>

      <div className="form-field" style={{ maxWidth: 320, marginTop: 14 }}>
        <label htmlFor="comms-frequency">Communication frequency</label>
        <select
          id="comms-frequency"
          value={preferences.frequency}
          disabled={!preferences.enabled}
          onChange={(e) => updatePreferences({ frequency: e.target.value })}
        >
          <option value="minimal">Minimal: completions only</option>
          <option value="standard">Standard: main events</option>
          <option value="frequent">Frequent: every event, including pauses</option>
        </select>
      </div>

      <Toggle
        id="comms-sound"
        label="Notification sound"
        description="A short soft tone when a message arrives."
        checked={preferences.sound}
        onChange={(v) => updatePreferences({ sound: v })}
      />
      <Toggle
        id="comms-browser"
        label="Browser notifications"
        description="Used only for finished sessions and completed missions."
        checked={preferences.browserNotifications}
        onChange={handleBrowserToggle}
      />
      {note && (
        <p className="foot-note" role="status" style={{ marginTop: 8 }}>
          {note}
        </p>
      )}
    </div>
  );
}
