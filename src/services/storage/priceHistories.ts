import { PriceHistory } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * PriceHistories storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const priceHistoriesStore = defineEntity<PriceHistory[]>('vyaparflow_price_histories_v1');

export const loadPriceHistories = priceHistoriesStore.load;
export const savePriceHistories = priceHistoriesStore.save;
