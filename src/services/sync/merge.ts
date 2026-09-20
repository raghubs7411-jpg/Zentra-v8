/**
 * Three-way merge for cloud pulls.
 *
 * Rules per entity row (matched by id):
 *  - row exists locally and in the cloud  -> the CLOUD version wins (last
 *    synced state is authoritative across devices);
 *  - row exists only locally, never synced -> KEPT (it is pushed up on the
 *    next sync, so a sign-in can never wipe local data the cloud lacks);
 *  - row was in the last sync snapshot but is missing from the cloud ->
 *    deleted on another device -> removed locally too;
 *  - row exists only in the cloud          -> added locally.
 *
 * No Supabase imports here — pure functions, unit-testable in isolation.
 */
import { AppState } from '../../types';

interface HasId {
  id: string;
}

const ARRAY_KEYS = [
  'users',
  'roles',
  'customers',
  'products',
  'sales',
  'invoices',
  'payments',
  'purchases',
  'stockMovements',
  'salesReturns',
  'priceHistories',
  'auditLogs',
  'deliveryChallans',
  'notifications',
] as const;

function mergeById<T extends HasId>(local: T[], pulled: T[], snapshot: T[]): T[] {
  const pulledMap = new Map(pulled.map((r) => [r.id, r]));
  const snapMap = new Map(snapshot.map((r) => [r.id, r]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of local) {
    const cloud = pulledMap.get(row.id);
    if (cloud) {
      out.push(cloud);
      seen.add(row.id);
    } else if (snapMap.has(row.id)) {
      // Was synced before but is gone from the cloud: deleted on another device.
    } else {
      // Never synced: local-only row, keep it (pushed on the next sync).
      out.push(row);
    }
  }
  for (const row of pulled) {
    if (!seen.has(row.id)) out.push(row);
  }
  // If nothing local-only was kept, the pulled array IS the merged result.
  // Returning it by reference also marks the entity as already in sync.
  return out.length === pulled.length ? pulled : out;
}

/**
 * Merge a cloud pull into the local state without destroying local-only rows.
 * `snapshot` is what this device last knew about the cloud.
 */
export function mergePulledState(
  pulled: Partial<AppState>,
  local: AppState,
  snapshot: Partial<AppState>
): AppState {
  const merged: AppState = { ...local };
  for (const key of ARRAY_KEYS) {
    const p = (pulled as Record<string, unknown>)[key] as HasId[] | undefined;
    if (p === undefined) continue;
    const l = (local as unknown as Record<string, unknown>)[key] as HasId[] | undefined;
    const s = (snapshot as unknown as Record<string, unknown>)[key] as HasId[] | undefined;
    (merged as unknown as Record<string, unknown>)[key] = mergeById(l ?? [], p, s ?? []);
  }
  if (pulled.business) {
    merged.business = pulled.business;
  }
  return merged;
}

/**
 * The sync snapshot to remember after a pull: exactly what the cloud sent,
 * arrays kept by reference. Local-only rows kept by the merge then show up
 * in the next diff and get pushed to the cloud.
 */
export function pulledSnapshot(pulled: Partial<AppState>): Partial<AppState> {
  return { ...pulled };
}
