import { SalesReturn } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * SalesReturns storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const salesReturnsStore = defineEntity<SalesReturn[]>('vyaparflow_sales_returns_v1');

export const loadSalesReturns = salesReturnsStore.load;
export const saveSalesReturns = salesReturnsStore.save;
