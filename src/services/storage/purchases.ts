import { Purchase } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Purchases storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const purchasesStore = defineEntity<Purchase[]>('vyaparflow_purchases_v1');

export const loadPurchases = purchasesStore.load;
export const savePurchases = purchasesStore.save;
