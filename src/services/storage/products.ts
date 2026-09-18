import { Product } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Products storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const productsStore = defineEntity<Product[]>('vyaparflow_products_v1');

export const loadProducts = productsStore.load;
export const saveProducts = productsStore.save;
