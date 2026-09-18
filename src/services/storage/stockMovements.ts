import { StockMovement } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * StockMovements storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const stockMovementsStore = defineEntity<StockMovement[]>('vyaparflow_stock_movements_v1');

export const loadStockMovements = stockMovementsStore.load;
export const saveStockMovements = stockMovementsStore.save;
