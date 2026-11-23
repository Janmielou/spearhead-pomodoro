import StatusBadge from '../common/StatusBadge';

export const NAV_ITEMS = [
  { id: 'command', label: 'Command Center', glyph: '◇' },
  { id: 'missions', label: 'Mission Control', glyph: '◎' },
  { id: 'paraid', label: 'Para-RAID', glyph: '∿' },
  { id: 'history', label: 'Operations History', glyph: '▤' },
  { id: 'settings', label: 'System Configuration', glyph: '⚙' },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  return (
    <aside className={`sidebar${isOpen ? ' is-open' : ''}`} aria-label="Primary">
      <div className="sidebar__brand">
        <div className="brand-mark">
          <div className="brand-diamond" aria-hidden="true"><span /></div>
          <div className="brand-text">
            <div className="brand-name">SPEARHEAD</div>
            <div className="brand-sub">Tactical Command</div>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${activePage === item.id ? ' is-active' : ''}`}
            aria-current={activePage === item.id ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
            onClick={() => {
              onNavigate(item.id);
              onClose();
            }}
          >
            <span className="nav-item__glyph" aria-hidden="true">{item.glyph}</span>
            <span className="nav-item__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__operator">
        <span className="ops-label">Operator on Duty</span>
        <div className="operator-name">PROCESSOR-01</div>
        <div className="operator-meta">Spearhead Unit · Sector 01</div>
        <div style={{ marginTop: 10 }}>
          <StatusBadge tone="green" live>Systems Nominal</StatusBadge>
        </div>
      </div>
    </aside>
  );
}
