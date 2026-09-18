import { AppState } from '../../types';
import { getInitialState } from '../../data/mockData';
import { readJson } from './jsonStore';
import { loadBusiness, saveBusiness } from './business';
import { loadCurrentUser, saveCurrentUser } from './currentUser';
import { loadCustomers, saveCustomers } from './customers';
import { loadProducts, saveProducts } from './products';
import { loadSales, saveSales } from './sales';
import { loadInvoices, saveInvoices } from './invoices';
import { loadPayments, savePayments } from './payments';
import { loadPurchases, savePurchases } from './purchases';
import { loadStockMovements, saveStockMovements } from './stockMovements';
import { loadSalesReturns, saveSalesReturns } from './salesReturns';
import { loadPriceHistories, savePriceHistories } from './priceHistories';
import { loadAuditLogs, saveAuditLogs } from './auditLogs';
import { loadRoles, saveRoles } from './roles';
import { loadUsers, saveUsers } from './users';
import { loadDeliveryChallans, saveDeliveryChallans } from './deliveryChallans';
import { loadNotifications, saveNotifications } from './notifications';

/**
 * LEGACY key used by versions before the per-entity split: the entire
 * AppState was stored as one JSON blob. Kept (never deleted) as a safety
 * snapshot; it is migrated automatically on the first load after upgrade.
 */
const LEGACY_STATE_KEY = 'vyaparflow_crm_state_v1';

/**
 * Persist the app state, one localStorage key per entity.
 * Called by AppContext on every state change.
 */
export const saveAppState = (state: AppState): void => {
  saveBusiness(state.business);
  saveCurrentUser(state.currentUser);
  saveCustomers(state.customers ?? []);
  saveProducts(state.products ?? []);
  saveSales(state.sales ?? []);
  saveInvoices(state.invoices ?? []);
  savePayments(state.payments ?? []);
  savePurchases(state.purchases ?? []);
  saveStockMovements(state.stockMovements ?? []);
  saveSalesReturns(state.salesReturns ?? []);
  savePriceHistories(state.priceHistories ?? []);
  saveAuditLogs(state.auditLogs ?? []);
  saveRoles(state.roles ?? []);
  saveUsers(state.users ?? []);
  saveDeliveryChallans(state.deliveryChallans ?? []);
  saveNotifications(state.notifications ?? []);
};

/**
 * Reassemble the app state from per-entity keys.
 *
 * - Returns null on a fresh install (nothing ever stored) — the caller
 *   then falls back to seed data.
 * - On the first run after upgrading from the old single-blob storage,
 *   migrates the legacy blob into per-entity keys and returns it.
 * - Each entity falls back to the legacy blob value, then to a default.
 */
export const loadAppState = (): AppState | null => {
  const legacy = readJson<Partial<AppState> | null>(LEGACY_STATE_KEY);

  // One-time migration from the old single-blob storage (v8 and earlier):
  // write per-entity keys once, then assemble below so every field is
  // properly defaulted (never returns the raw legacy object).
  if (legacy && loadCustomers() === null) {
    saveAppState(legacy as AppState);
  }

  // Fresh install — nothing was ever stored on this device
  if (loadCustomers() === null && !legacy) return null;

  const seed = getInitialState();

  return {
    business: loadBusiness() ?? legacy?.business ?? seed.business,
    currentUser: loadCurrentUser() ?? legacy?.currentUser ?? seed.currentUser,
    customers: loadCustomers() ?? legacy?.customers ?? [],
    products: loadProducts() ?? legacy?.products ?? [],
    sales: loadSales() ?? legacy?.sales ?? [],
    invoices: loadInvoices() ?? legacy?.invoices ?? [],
    payments: loadPayments() ?? legacy?.payments ?? [],
    purchases: loadPurchases() ?? legacy?.purchases ?? [],
    stockMovements: loadStockMovements() ?? legacy?.stockMovements ?? [],
    salesReturns: loadSalesReturns() ?? legacy?.salesReturns ?? [],
    priceHistories: loadPriceHistories() ?? legacy?.priceHistories ?? [],
    auditLogs: loadAuditLogs() ?? legacy?.auditLogs ?? [],
    roles: loadRoles() ?? legacy?.roles ?? seed.roles,
    users: loadUsers() ?? legacy?.users ?? seed.users,
    deliveryChallans: loadDeliveryChallans() ?? legacy?.deliveryChallans ?? [],
    notifications: loadNotifications() ?? legacy?.notifications ?? [],
  };
};
