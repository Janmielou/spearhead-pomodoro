import { useState } from 'react';
import { validateObjectiveInput } from '../../hooks/missionLogic';

export default function ObjectiveItem({ missionId, objective, readOnly, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description);
  const [estimatedSessions, setEstimatedSessions] = useState(objective.estimatedSessions ?? '');
  const [error, setError] = useState('');

  const save = (event) => {
    event.preventDefault();
    if (validateObjectiveInput({ title }).title) {
      setError('Give the objective a title.');
      return;
    }
    onUpdate(missionId, objective.id, {
      title,
      description,
      estimatedSessions: estimatedSessions === '' ? null : Number(estimatedSessions),
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="objective objective--editing">
        <form className="objective-edit" onSubmit={save}>
          <div className="form-field">
            <label htmlFor={`obj-title-${objective.id}`}>Objective title</label>
            <input
              id={`obj-title-${objective.id}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <div className="form-field">
            <label htmlFor={`obj-desc-${objective.id}`}>Description (optional)</label>
            <input
              id={`obj-desc-${objective.id}`}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor={`obj-est-${objective.id}`}>Est. sessions</label>
            <input
              id={`obj-est-${objective.id}`}
              type="number"
              min={1}
              max={999}
              value={estimatedSessions}
              onChange={(e) => setEstimatedSessions(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary btn--small">Save</button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  const checkboxId = `obj-${objective.id}`;
  return (
    <li className={`objective${objective.completed ? ' is-done' : ''}`}>
      <input
        type="checkbox"
        id={checkboxId}
        checked={objective.completed}
        disabled={readOnly}
        onChange={(e) => onToggle(missionId, objective.id, e.target.checked)}
      />
      <span className="objective__text">
        <label htmlFor={checkboxId}>{objective.title}</label>
        {objective.description && (
          <span className="objective__desc">{objective.description}</span>
        )}
      </span>
      {objective.estimatedSessions && (
        <span className="objective__est">
          {objective.estimatedSessions} session{objective.estimatedSessions === 1 ? '' : 's'}
        </span>
      )}
      {!readOnly && (
        <span className="objective__actions">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onDelete(missionId, objective.id)}
            aria-label={`Delete objective ${objective.title}`}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  );
}
