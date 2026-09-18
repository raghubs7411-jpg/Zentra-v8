import { Customer } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Customers storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const customersStore = defineEntity<Customer[]>('vyaparflow_customers_v1');

export const loadCustomers = customersStore.load;
export const saveCustomers = customersStore.save;
