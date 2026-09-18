import { AppState } from '../types';

const STORAGE_KEY = 'vyaparflow_crm_state_v1';
const QUOTA_WARNING_KEY = 'vyaparflow_quota_warned';

export const saveStateToStorage = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Clear any previous quota warning once a save succeeds
    if (sessionStorage.getItem(QUOTA_WARNING_KEY)) {
      sessionStorage.removeItem(QUOTA_WARNING_KEY);
    }
  } catch (error) {
    console.error('Failed to save state to localStorage', error);

    // Surface quota-exceeded errors to the user so they don't silently lose data
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      if (!sessionStorage.getItem(QUOTA_WARNING_KEY)) {
        sessionStorage.setItem(QUOTA_WARNING_KEY, '1');
        // Use a CustomEvent so the Toaster can pick it up
        window.dispatchEvent(new CustomEvent('storage-quota-exceeded'));
      }
    }
  }
};

export const loadStateFromStorage = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch (error) {
    console.error('Failed to load state from localStorage', error);
    return null;
  }
};

/**
 * Prefix cell values that could be interpreted as formulas (=, +, -, @)
 * with a tab character to prevent CSV / spreadsheet formula injection.
 */
const sanitizeCsvCell = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  const escaped = str.replace(/"/g, '""');
  // Guard against formula injection
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"\t${escaped}"`;
  }
  return `"${escaped}"`;
};

export const exportToJsonFile = (data: unknown, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCsvFile = (data: Record<string, unknown>[], filename: string): void => {
  if (!data || data.length === 0) {
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((header) => sanitizeCsvCell(row[header])).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
