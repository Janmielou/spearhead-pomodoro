import { useState } from 'react';
import ObjectiveItem from './ObjectiveItem';
import { validateObjectiveInput } from '../../hooks/missionLogic';

export default function ObjectiveList({
  mission,
  readOnly,
  onAdd,
  onToggle,
  onUpdate,
  onDelete,
}) {
  const [title, setTitle] = useState('');
  const [estimatedSessions, setEstimatedSessions] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (validateObjectiveInput({ title }).title) {
      setError('Give the objective a title.');
      return;
    }
    onAdd(mission.id, {
      title,
      estimatedSessions: estimatedSessions === '' ? null : Number(estimatedSessions),
    });
    setTitle('');
    setEstimatedSessions('');
    setError('');
  };

  return (
    <>
      {mission.objectives.length === 0 ? (
        <p className="empty-note">No objectives yet. Add the first small step below.</p>
      ) : (
        <ul className="objective-list">
          {mission.objectives.map((objective) => (
            <ObjectiveItem
              key={objective.id}
              missionId={mission.id}
              objective={objective}
              readOnly={readOnly}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {!readOnly && (
        <form className="add-objective" onSubmit={submit}>
          <div className="form-field add-objective__title">
            <label htmlFor={`add-objective-${mission.id}`}>New objective</label>
            <input
              id={`add-objective-${mission.id}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="For example: Write the introduction"
            />
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <div className="form-field add-objective__est">
            <label htmlFor={`add-objective-est-${mission.id}`}>Est. sessions</label>
            <input
              id={`add-objective-est-${mission.id}`}
              type="number"
              min={1}
              max={999}
              value={estimatedSessions}
              onChange={(e) => setEstimatedSessions(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary btn--small add-objective__button">
            Add Objective
          </button>
        </form>
      )}
    </>
  );
}
