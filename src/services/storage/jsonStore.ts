const QUOTA_WARNING_KEY = 'vyaparflow_quota_warned';

/**
 * Low-level JSON persistence for a single localStorage key.
 * Kept tiny on purpose: one key in, one value out, errors never thrown.
 */
export const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load "${key}" from localStorage`, error);
    return null;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Clear any previous quota warning once a save succeeds
    if (sessionStorage.getItem(QUOTA_WARNING_KEY)) {
      sessionStorage.removeItem(QUOTA_WARNING_KEY);
    }
  } catch (error) {
    console.error(`Failed to save "${key}" to localStorage`, error);
    // Surface quota-exceeded errors to the user so they don't silently lose data
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      if (!sessionStorage.getItem(QUOTA_WARNING_KEY)) {
        sessionStorage.setItem(QUOTA_WARNING_KEY, '1');
        window.dispatchEvent(new CustomEvent('storage-quota-exceeded'));
      }
    }
  }
};
