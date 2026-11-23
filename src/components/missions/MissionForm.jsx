import { useState } from 'react';
import {
  MISSION_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  validateMissionInput,
} from '../../hooks/missionLogic';

export default function MissionForm({ initial = null, onSubmit, onCancel }) {
  const editing = initial !== null;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'normal');
  const [status, setStatus] = useState(initial?.status ?? 'pending');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [estimatedSessions, setEstimatedSessions] = useState(initial?.estimatedSessions ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = validateMissionInput({ title });
    if (errors.title) {
      setError(errors.title);
      return;
    }
    onSubmit({
      title,
      description,
      priority,
      ...(editing ? { status } : {}),
      deadline: deadline || null,
      estimatedSessions: estimatedSessions === '' ? null : Number(estimatedSessions),
    });
  };

  return (
    <form className="mission-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="mission-title">
          Mission title <span aria-hidden="true">*</span>
        </label>
        <input
          id="mission-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="For example: Complete University Capstone"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'mission-title-error' : undefined}
          autoFocus
        />
        {error && (
          <p className="form-error" id="mission-title-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="mission-description">Description (optional)</label>
        <textarea
          id="mission-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does finishing this mission look like?"
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="mission-priority">Priority</label>
          <select id="mission-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {editing && (
          <div className="form-field">
            <label htmlFor="mission-status">Status</label>
            <select id="mission-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {MISSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="mission-deadline">Deadline (optional)</label>
          <input
            id="mission-deadline"
            type="date"
            value={deadline ?? ''}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="mission-estimate">Estimated focus sessions (optional)</label>
          <input
            id="mission-estimate"
            type="number"
            min={1}
            max={999}
            value={estimatedSessions}
            onChange={(e) => setEstimatedSessions(e.target.value)}
            placeholder="For example: 10"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          {editing ? 'Save Changes' : 'Create Mission'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
