import { useRef, useState } from 'react';
import {
  applyBackup,
  buildBackup,
  clearApplicationData,
  validateBackup,
} from '../../services/dataService';

export default function DataManagement() {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [errors, setErrors] = useState([]);
  const [note, setNote] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleExport = () => {
    const backup = buildBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spearhead-backup-${backup.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNote('Backup downloaded. Keep the JSON file somewhere safe.');
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPending(null);
    setErrors([]);
    setNote('');
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const result = validateBackup(parsed);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setPending(result);
    } catch {
      setErrors(['The selected file could not be read as JSON. Nothing was changed.']);
    }
  };

  const confirmImport = () => {
    if (!pending || !applyBackup(pending.data)) return;
    // Reload so every hook reloads from storage through its own
    // sanitizer. Imported data is never applied half way.
    window.location.reload();
  };

  const confirmClear = () => {
    clearApplicationData();
    window.location.reload();
  };

  return (
    <div>
      <p className="settings-current terminal-surface">
        SPEARHEAD data is stored only in this browser. Export creates one JSON backup containing
        missions, objectives, timer settings and state, transmissions, communication preferences,
        operation records, and interface preferences.
      </p>

      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="btn btn--primary" onClick={handleExport}>
          Export Data
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          Import Data
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Choose a SPEARHEAD backup file"
          onChange={handleFile}
        />
        <button type="button" className="btn btn--danger" onClick={() => setConfirmingClear(true)}>
          Clear Application Data
        </button>
      </div>

      {errors.length > 0 && (
        <div className="form-error" role="alert" style={{ marginTop: 12 }}>
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {pending && (
        <section className="import-preview" aria-labelledby="import-preview-title">
          <h3 id="import-preview-title">Import preview</h3>
          <ul className="module-tasks">
            <li>
              <span className="mono">FILE</span> Exported{' '}
              {pending.preview.exportedAt
                ? new Date(pending.preview.exportedAt).toLocaleString('en-GB')
                : 'at an unknown time'}
            </li>
            <li>
              <span className="mono">DATA</span> {pending.preview.missions} missions,{' '}
              {pending.preview.operations} operation records, {pending.preview.transmissions}{' '}
              transmissions
            </li>
            <li>
              <span className="mono">SECTIONS</span> {pending.preview.sections.join(', ')}
            </li>
          </ul>
          <p className="foot-note">
            Sections in this backup will replace the matching current data. Sections that are not
            in the backup are left unchanged. The page reloads after import so all records are
            checked again on load.
          </p>
          <div className="form-actions">
            <button type="button" className="btn btn--primary" onClick={confirmImport}>
              Confirm Import
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
              Cancel Import
            </button>
          </div>
        </section>
      )}

      {note && (
        <p className="foot-note" role="status" style={{ marginTop: 8 }}>
          {note}
        </p>
      )}

      {confirmingClear && (
        <div className="dialog-backdrop">
          <div
            className="dialog panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-data-title"
            aria-describedby="clear-data-desc"
          >
            <h2 id="clear-data-title">Clear all SPEARHEAD data?</h2>
            <p id="clear-data-desc">
              This deletes your missions and objectives, timer settings and state, transmissions
              and communication preferences, operation records, and interface preferences from
              this browser. Only SPEARHEAD data is removed. This cannot be undone unless you
              have exported a backup.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn--danger" onClick={confirmClear}>
                Clear All Data
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmingClear(false)}
                autoFocus
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
