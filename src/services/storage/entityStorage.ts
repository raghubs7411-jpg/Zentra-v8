import { readJson, writeJson } from './jsonStore';

export interface EntityStorage<T> {
  /** localStorage key this entity persists under */
  key: string;
  /** Read this entity's records. Returns null when nothing has ever been stored. */
  load: () => T | null;
  /** Persist this entity's records. */
  save: (value: T) => void;
}

/**
 * Factory for per-entity storage modules. Keeps every entity file identical
 * in shape, so swapping in a Supabase-backed implementation later only means
 * changing what these two functions do internally.
 */
export const defineEntity = <T>(key: string): EntityStorage<T> => ({
  key,
  load: () => readJson<T>(key),
  save: (value) => writeJson(key, value),
});
