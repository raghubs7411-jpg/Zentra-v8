import { Quote } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Quotations storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const quotesStore = defineEntity<Quote[]>('vyaparflow_quotes_v1');

export const loadQuotes = quotesStore.load;
export const saveQuotes = quotesStore.save;
