import { missionProgress } from '../../hooks/missionLogic';

export default function DeleteMissionDialog({ mission, onConfirm, onCancel }) {
  if (!mission) return null;
  const { total } = missionProgress(mission);

  return (
    <div className="dialog-backdrop">
      <div className="dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc">
        <h2 id="delete-title">Delete this mission?</h2>
        <p id="delete-desc">
          “{mission.title}” will be permanently deleted
          {total > 0
            ? `, along with its ${total} objective${total === 1 ? '' : 's'}.`
            : '.'}{' '}
          This cannot be undone.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn--danger" onClick={() => onConfirm(mission.id)}>
            Delete Mission
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel} autoFocus>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
