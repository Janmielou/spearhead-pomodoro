/**
 * Pure navigation transition decisions.
 * Kept separate so the rules can be tested without a browser:
 * same-page requests never start a transition, and a newer
 * navigation always replaces an older transition.
 */
export function navigationChange(currentPage, requestedPage) {
  if (!requestedPage || requestedPage === currentPage) {
    return { page: currentPage, changed: false };
  }
  return { page: requestedPage, changed: true };
}

/** The latest navigation wins. The previous trigger is discarded. */
export function startTransition(requestedPage, id) {
  return { page: requestedPage, id };
}

/**
 * Decide what a navigation request means during a transition.
 * Phases: idle, covering, swapping, revealing.
 * The latest valid request always wins, an outdated one never does.
 */
export function resolveTransitionRequest({ displayedPage, phase, destination, requestedPage }) {
  if (!requestedPage) return { action: 'none' };
  if (phase === 'idle') {
    return requestedPage === displayedPage
      ? { action: 'none' }
      : { action: 'start', destination: requestedPage };
  }
  if (phase === 'covering') {
    if (requestedPage === destination) return { action: 'none' };
    if (requestedPage === displayedPage) return { action: 'cancel' };
    return { action: 'retarget', destination: requestedPage };
  }
  // swapping or revealing: the destination is already committed.
  if (requestedPage === destination || requestedPage === displayedPage) {
    return { action: 'none' };
  }
  return { action: 'queue', destination: requestedPage };
}
