/**
 * Collision-resistant ID generator.
 * Uses crypto.randomUUID() when available, falls back to timestamp + random.
 */
export const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};
