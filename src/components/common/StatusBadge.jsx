export default function StatusBadge({ tone = 'info', live = false, children }) {
  return (
    <span className={`badge badge--${tone}${live ? ' badge--live' : ''}`}>
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
