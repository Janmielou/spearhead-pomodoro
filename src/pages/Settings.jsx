import CommunicationSettings from '../components/communication/CommunicationSettings';
import TimerSettings from '../components/settings/TimerSettings';
import DataManagement from '../components/settings/DataManagement';

function InterfaceToggle({ id, label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <span>
        <label htmlFor={id}>{label}</label>
        {description && <span className="toggle-desc">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

function SettingsSection({ id, title, meta, children }) {
  return (
    <section className="panel settings-section" aria-labelledby={id}>
      <div className="panel__head">
        <div className="panel__title">
          <h2 id={id}>{title}</h2>
          {meta && <span className="panel__id">{meta}</span>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings({ timer, communications, interfacePreferences }) {
  const { preferences, updatePreferences } = interfacePreferences;

  return (
    <>
      <section className="panel mission-page-head" aria-labelledby="settings-title">
        <div>
          <span className="ops-label">System Configuration</span>
          <h2 id="settings-title">Application Settings</h2>
          <p>Timer, communications, interface behavior, and browser data controls.</p>
        </div>
      </section>

      <SettingsSection id="settings-timer-title" title="Timer Configuration" meta="OPERATION TIMER">
        <TimerSettings timer={timer} />
      </SettingsSection>

      <SettingsSection
        id="settings-comms-title"
        title="Communication Configuration"
        meta="PARA-RAID"
      >
        <p className="foot-note" style={{ marginBottom: 12 }}>
          These are the same preferences used on the Para-RAID page. Changes apply in both places.
        </p>
        <CommunicationSettings communications={communications} />
      </SettingsSection>

      <SettingsSection id="settings-theme-title" title="Appearance" meta="DISPLAY THEME">
        <div className="theme-options" role="radiogroup" aria-label="Display theme">
          {[
            { value: 'light', label: 'Light Mode', name: 'Handler Light', description: 'Dark command frame with bright illuminated displays.' },
            { value: 'dark', label: 'Dark Mode', name: 'Tactical Dark', description: 'Deeper environment with dark, readable display surfaces.' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={preferences.theme === option.value}
              className={`theme-option${preferences.theme === option.value ? ' is-selected' : ''}`}
              onClick={() => updatePreferences({ theme: option.value })}
            >
              <span className="theme-option__label">{option.label}</span>
              <span className="theme-option__name">{option.name}</span>
              <span className="theme-option__desc">{option.description}</span>
              <span className="theme-option__state" aria-hidden="true">
                {preferences.theme === option.value ? 'Selected' : 'Select'}
              </span>
            </button>
          ))}
        </div>
        <p className="foot-note" style={{ marginTop: 10 }}>
          The theme applies immediately, is saved with your interface preferences, and is
          included in data backups.
        </p>
      </SettingsSection>

      <SettingsSection id="settings-interface-title" title="Interface Preferences" meta="DISPLAY">
        <InterfaceToggle
          id="interface-target-cursor"
          label="Custom targeting cursor"
          description="Shows an original targeting reticle over buttons, navigation, cards, and other controls on desktop pointer devices. Text fields keep the normal text cursor."
          checked={preferences.targetCursor}
          onChange={(value) => updatePreferences({ targetCursor: value })}
        />
        <InterfaceToggle
          id="interface-page-transitions"
          label="Enhanced Page Transitions"
          description="Switch command sections through a mosaic of medium-sized black three-dimensional tiles that flip away to reveal the destination. Reduced-motion and Interface Animations always take priority."
          checked={preferences.pageTransitionsEnabled}
          onChange={(value) => updatePreferences({ pageTransitionsEnabled: value })}
        />
        <InterfaceToggle
          id="interface-animations"
          label="Interface animations"
          description="Subtle page, panel, and cursor transitions. Your operating system reduced-motion setting is always respected."
          checked={preferences.animations}
          onChange={(value) => updatePreferences({ animations: value })}
        />
        <p className="foot-note" style={{ marginTop: 10 }}>
          Notification sound and browser notification choices are in Communication Configuration
          above, so there is only one set of communication preferences.
        </p>
      </SettingsSection>

      <SettingsSection id="settings-data-title" title="Data Management" meta="BROWSER STORAGE">
        <DataManagement />
      </SettingsSection>
    </>
  );
}
