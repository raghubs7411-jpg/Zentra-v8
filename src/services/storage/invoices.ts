import { Invoice } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Invoices storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const invoicesStore = defineEntity<Invoice[]>('vyaparflow_invoices_v1');

export const loadInvoices = invoicesStore.load;
export const saveInvoices = invoicesStore.save;
