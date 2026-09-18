import { AuditLog } from '../../types';
import { defineEntity } from './entityStorage';

/**
 * AuditLogs storage — this entity's records.
 * To move this entity to Supabase later, replace the internals of
 * load/save with dataApi calls. Nothing else in the app changes.
 */
export const auditLogsStore = defineEntity<AuditLog[]>('vyaparflow_audit_logs_v1');

export const loadAuditLogs = auditLogsStore.load;
export const saveAuditLogs = auditLogsStore.save;
