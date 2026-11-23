import { useEffect, useRef, useState } from 'react';
import PageTransition from './PageTransition';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ activePage, onNavigate, atmosphere = 'standby', animationsEnabled = true, theme = 'light', transition = null, transitionsEnabled = true, onTransitionCovered, onTransitionRevealed, onTransitionUnavailable, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  // Move keyboard focus to the new content on page changes, but
  // never on the initial load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [activePage]);

  return (
    <div className="app-shell" data-atmosphere={atmosphere} data-animations={animationsEnabled ? 'on' : 'off'} data-theme={theme}>
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {menuOpen && (
        <button
          type="button"
          className="scrim"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-column">
        <Topbar activePage={activePage} onMenu={() => setMenuOpen(true)} />
        <main ref={mainRef} className="page-body" tabIndex={-1}>
          <div className="page-view" key={activePage}>{children}</div>
        </main>
        <PageTransition
          transition={transition}
          enabled={transitionsEnabled}
          onCovered={onTransitionCovered}
          onRevealed={onTransitionRevealed}
          onUnavailable={onTransitionUnavailable}
        />
      </div>
    </div>
  );
}
