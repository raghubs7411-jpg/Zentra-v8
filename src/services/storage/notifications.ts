import { AppNotification } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * Notifications storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const notificationsStore = defineEntity<AppNotification[]>('vyaparflow_notifications_v1');

export const loadNotifications = notificationsStore.load;
export const saveNotifications = notificationsStore.save;
