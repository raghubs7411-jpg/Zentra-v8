import { RolePermission } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Roles storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const rolesStore = defineEntity<RolePermission[]>('vyaparflow_roles_v1');

export const loadRoles = rolesStore.load;
export const saveRoles = rolesStore.save;
