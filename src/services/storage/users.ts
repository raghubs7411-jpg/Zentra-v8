import { User } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Users storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const usersStore = defineEntity<User[]>('vyaparflow_users_v1');

export const loadUsers = usersStore.load;
export const saveUsers = usersStore.save;
