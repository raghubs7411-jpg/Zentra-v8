import { User } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * CurrentUser storage — this entity's profile object.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const currentUserStore = defineEntity<User>('vyaparflow_current_user_v1');

export const loadCurrentUser = currentUserStore.load;
export const saveCurrentUser = currentUserStore.save;
