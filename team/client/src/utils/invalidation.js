const INVALIDATION_KEY = 'app:lastMutation';

export function notifyMutation() {
  try {
    localStorage.setItem(INVALIDATION_KEY, Date.now().toString());
  } catch {
    // localStorage unavailable
  }
  window.dispatchEvent(new Event('app:dataChanged'));
}

export function getLastMutationTime() {
  try {
    return Number(localStorage.getItem(INVALIDATION_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function onDataChanged(callback) {
  window.addEventListener('app:dataChanged', callback);
  return () => window.removeEventListener('app:dataChanged', callback);
}
