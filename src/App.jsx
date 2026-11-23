import { useEffect, useRef, useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import CommandCenter from './pages/CommandCenter';
import MissionControl from './pages/MissionControl';
import ParaRaid from './pages/ParaRaid';
import OperationsHistory from './pages/OperationsHistory';
import Settings from './pages/Settings';
import { useTimer } from './hooks/useTimer';
import { useMissions } from './hooks/useMissions';
import { useCommunications } from './hooks/useCommunications';
import { useOperations } from './hooks/useOperations';
import { useInterfacePreferences } from './hooks/useInterfacePreferences';
import TargetCursor from './components/common/TargetCursor';
import { resolveTransitionRequest } from './hooks/navigationLogic';

const PAGES = {
  command: CommandCenter,
  missions: MissionControl,
  paraid: ParaRaid,
  history: OperationsHistory,
  settings: Settings,
};

export default function App() {
  const [activePage, setActivePage] = useState('command');
  // Transition state machine: idle, covering, swapping, revealing.
  // activePage only changes at the swap point, once the micro-tile
  // cover is complete, so the old page stays visible underneath.
  const [transition, setTransition] = useState(null);
  const transitionRef = useRef(null);
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;
  const queuedRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setTransitionBoth = (next) => {
    transitionRef.current = next;
    setTransition(next);
  };

  const handleNavigate = (requestedPage) => {
    const current = transitionRef.current;
    const decision = resolveTransitionRequest({
      displayedPage: activePageRef.current,
      phase: current?.phase ?? 'idle',
      destination: current?.destination ?? activePageRef.current,
      requestedPage,
    });
    if (decision.action === 'none') return;
    if (decision.action === 'cancel') {
      queuedRef.current = null;
      setTransitionBoth(null);
      return;
    }
    if (decision.action === 'queue') {
      queuedRef.current = decision.destination;
      return;
    }
    if (decision.action === 'retarget' && current) {
      setTransitionBoth({ ...current, destination: decision.destination });
      return;
    }
    // start
    if (enhancedRef.current) {
      setTransitionBoth({ id: Date.now(), destination: decision.destination, phase: 'covering' });
    } else {
      setActivePage(decision.destination);
    }
  };

  const handleCovered = (id) => {
    const current = transitionRef.current;
    if (!current || current.id !== id || current.phase !== 'covering') return;
    setActivePage(current.destination);
    setTransitionBoth({ ...current, phase: 'swapping' });
  };

  const handleRevealed = (id) => {
    const current = transitionRef.current;
    if (!current || current.id !== id) return;
    setTransitionBoth(null);
    const queued = queuedRef.current;
    queuedRef.current = null;
    if (queued && queued !== activePageRef.current) {
      if (enhancedRef.current) {
        setTransitionBoth({ id: Date.now(), destination: queued, phase: 'covering' });
      } else {
        setActivePage(queued);
      }
    }
  };

  const handleUnavailable = (id) => {
    const current = transitionRef.current;
    if (!current || current.id !== id) return;
    queuedRef.current = null;
    setActivePage(current.destination);
    setTransitionBoth(null);
  };
  // The timer lives here so it keeps running when you switch pages,
  // and so the shell can match its look to the timer state.
  const timer = useTimer();
  const communications = useCommunications();
  const missionsApi = useMissions(communications.emit);
  const operations = useOperations();
  const interfacePreferences = useInterfacePreferences();
  const theme = interfacePreferences.preferences.theme;
  const enhanced =
    interfacePreferences.preferences.pageTransitionsEnabled &&
    interfacePreferences.preferences.animations &&
    !reducedMotion;
  const enhancedRef = useRef(enhanced);
  enhancedRef.current = enhanced;

  // Swap confirmation: the destination page has committed when
  // activePage matches. Two frames later the reveal may begin, so
  // an unrendered page is never revealed.
  useEffect(() => {
    if (!transition || transition.phase !== 'swapping') return undefined;
    if (activePage !== transition.destination) return undefined;
    let second = null;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        const current = transitionRef.current;
        if (current && current.phase === 'swapping') {
          setTransitionBoth({ ...current, phase: 'revealing' });
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second !== null) window.cancelAnimationFrame(second);
    };
  }, [transition, activePage]);

  // If animation permission is withdrawn mid-transition, finish
  // the pending navigation immediately and cleanly.
  useEffect(() => {
    if (enhanced) return;
    const current = transitionRef.current;
    if (!current) return;
    const target = queuedRef.current ?? current.destination;
    queuedRef.current = null;
    setTransitionBoth(null);
    setActivePage(target);
  }, [enhanced]);

  // Root-level theme so the document background, scrollbars, and
  // native controls follow the same tokens as the application shell.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const Page = PAGES[activePage] ?? CommandCenter;

  // Timer events become transmissions. The timer already records a
  // lastEvent for everything it does, and each one carries the time
  // it happened, so messages keep accurate timestamps even if the
  // session finished while the tab was closed.
  const emitRef = useRef(communications.emit);
  emitRef.current = communications.emit;
  const lastEvent = timer.state.lastEvent;
  const sessionId = timer.state.sessionId;
  useEffect(() => {
    if (!lastEvent) return;
    const group = lastEvent.sessionType === 'focus' ? 'focus' : 'break';
    emitRef.current({
      type: `timer.${group}.${lastEvent.kind}`,
      at: lastEvent.at,
      eventKey: `timer-${sessionId}-${group}-${lastEvent.kind}`,
      context: { sessionType: lastEvent.sessionType },
    });
  }, [lastEvent, sessionId]);

  // Finished sessions become operation records. The timer attaches
  // a snapshot (lastRecord) the moment a session completes, is
  // skipped, or is reset, and this records it exactly once.
  const recordRef = useRef(operations.record);
  recordRef.current = operations.record;
  const lastRecord = timer.state.lastRecord;
  useEffect(() => {
    if (lastRecord) recordRef.current(lastRecord);
  }, [lastRecord]);

  // One milestone per focus session, at the halfway point.
  // It is a Frequent only message, so most operators never see it.
  const milestoneSentFor = useRef(null);
  const { status, sessionType, remainingMs, durationMs } = timer.state;
  useEffect(() => {
    if (status !== 'running' || sessionType !== 'focus' || durationMs <= 0) return;
    if (milestoneSentFor.current === sessionId) return;
    if (remainingMs <= durationMs / 2) {
      milestoneSentFor.current = sessionId;
      emitRef.current({
        type: 'timer.focus.milestone',
        at: Date.now(),
        eventKey: `timer-${sessionId}-focus-milestone`,
        context: {},
      });
    }
  }, [status, sessionType, remainingMs, durationMs, sessionId]);

  return (
    <>
      <MainLayout
        activePage={activePage}
        onNavigate={handleNavigate}
        transition={transition}
        transitionsEnabled={enhanced}
        onTransitionCovered={handleCovered}
        onTransitionRevealed={handleRevealed}
        onTransitionUnavailable={handleUnavailable}
        atmosphere={timer.atmosphere}
        animationsEnabled={interfacePreferences.preferences.animations}
        theme={theme}
      >
        <Page
          onNavigate={handleNavigate}
          timer={timer}
          missionsApi={missionsApi}
          communications={communications}
          operations={operations}
          interfacePreferences={interfacePreferences}
        />
      </MainLayout>
      <TargetCursor
        enabled={interfacePreferences.preferences.targetCursor}
        animated={interfacePreferences.preferences.animations}
      />
    </>
  );
}
