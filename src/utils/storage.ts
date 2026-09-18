// Persistence now lives in src/services/storage — one module per entity
// (customers, products, sales, ...), with automatic migration from the old
// single-blob storage. These re-exports keep every existing import working.
export {
  saveAppState as saveStateToStorage,
  loadAppState as loadStateFromStorage,
} from '../services/storage';

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
