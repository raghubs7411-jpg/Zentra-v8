import { Sale } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Sales storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const salesStore = defineEntity<Sale[]>('vyaparflow_sales_v1');

export const loadSales = salesStore.load;
export const saveSales = salesStore.save;
