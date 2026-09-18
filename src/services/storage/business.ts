import { BusinessProfile } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Business storage — this entity's profile object.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const businessStore = defineEntity<BusinessProfile>('vyaparflow_business_v1');

export const loadBusiness = businessStore.load;
export const saveBusiness = businessStore.save;
