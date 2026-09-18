import { DeliveryChallan } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * DeliveryChallans storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const deliveryChallansStore = defineEntity<DeliveryChallan[]>('vyaparflow_delivery_challans_v1');

export const loadDeliveryChallans = deliveryChallansStore.load;
export const saveDeliveryChallans = deliveryChallansStore.save;
