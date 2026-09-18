import { Payment } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Payments storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const paymentsStore = defineEntity<Payment[]>('vyaparflow_payments_v1');

export const loadPayments = paymentsStore.load;
export const savePayments = paymentsStore.save;
