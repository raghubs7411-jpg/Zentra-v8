/**
 * Cloud Sync Engine — Supabase <-> AppState
 *
 * Strategy (Phase 1: offline-first mirror sync)
 * - Login happens against Supabase Auth (owner account).
 * - On login we PULL the whole business dataset into the app state.
 * - Every subsequent state change is DIFFED against the last synced
 *   snapshot (cheap reference comparison per entity array) and the
 *   changed entities are PUSHED (upsert + child re-insert).
 * - Last-write-wins: whichever device pushes last wins per entity.
 *
 * When Supabase is not configured (.env missing) the app keeps
 * working exactly as before — pure localStorage mode.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { AppState, BusinessProfile, DeliveryChallan, Purchase, Quote, Sale, SalesReturn, User } from '../../types';
import * as M from './mappers';

export interface CloudSession {
  businessId: string;
  ownerEmail: string;
}

export type SyncStatus = 'offline' | 'connected' | 'syncing' | 'error';

export type SyncKey =
  | 'business'
  | 'customers'
  | 'products'
  | 'sales'
  | 'invoices'
  | 'payments'
  | 'purchases'
  | 'stockMovements'
  | 'salesReturns'
  | 'quotes'
  | 'priceHistories'
  | 'auditLogs'
  | 'roles'
  | 'users'
  | 'deliveryChallans'
  | 'notifications';

export const ALL_SYNC_KEYS: SyncKey[] = [
  'business',
  'roles',
  'users',
  'customers',
  'products',
  'sales',
  'invoices',
  'payments',
  'purchases',
  'stockMovements',
  'salesReturns',
  'quotes',
  'priceHistories',
  'auditLogs',
  'deliveryChallans',
  'notifications',
];

// ============================================================
// Snapshot & diff helpers
// ============================================================

/** Capture entity references so we can later detect what changed. */
export const buildSnapshot = (state: AppState): Partial<AppState> => ({
  business: state.business,
  customers: state.customers,
  products: state.products,
  sales: state.sales,
  invoices: state.invoices,
  payments: state.payments,
  purchases: state.purchases,
  stockMovements: state.stockMovements,
  salesReturns: state.salesReturns,
  quotes: state.quotes,
  priceHistories: state.priceHistories,
  auditLogs: state.auditLogs,
  roles: state.roles,
  users: state.users,
  deliveryChallans: state.deliveryChallans,
  notifications: state.notifications,
});

/** Keys whose array/object reference differs from the snapshot. */
export const detectChangedKeys = (state: AppState, snapshot: Partial<AppState>): SyncKey[] =>
  ALL_SYNC_KEYS.filter(
    (key) => (state as unknown as Record<string, unknown>)[key] !== (snapshot as unknown as Record<string, unknown>)[key]
  );

// ============================================================
// Low-level helpers
// ============================================================

function chunk<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertRows(table: string, rows: M.DbRow[]): Promise<void> {
  if (!supabase || rows.length === 0) return;
  for (const batch of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function deleteRowsByIds(table: string, ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  for (const batch of chunk(ids, 200)) {
    const { error } = await supabase.from(table).delete().in('id', batch);
    if (error) throw new Error(`${table} delete failed: ${error.message}`);
  }
}

async function deleteRowsByColumn(table: string, column: string, values: string[]): Promise<void> {
  if (!supabase || values.length === 0) return;
  for (const batch of chunk(values, 200)) {
    const { error } = await supabase.from(table).delete().in(column, batch);
    if (error) throw new Error(`${table} delete failed: ${error.message}`);
  }
}

// ============================================================
// AUTH (owner account via Supabase Auth)
// ============================================================

/** Sign in and return the business id linked to this auth account. */
export async function cloudSignIn(email: string, password: string): Promise<string> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sign-in failed — no session returned.');

  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .limit(1);
  if (bizError) throw new Error(`Could not read your business profile: ${bizError.message}`);
  if (!businesses || businesses.length === 0) {
    throw new Error('No business is linked to this account yet. Use "Set up cloud account" once to upload your data.');
  }
  return businesses[0].id as string;
}

/**
 * Create the owner account + business row, then upload ALL local data
 * (initial migration of the device's localStorage data to the cloud).
 */
export async function cloudSignUp(
  email: string,
  password: string,
  ownerName: string,
  state: AppState
): Promise<CloudSession> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) {
    throw new Error(
      'EMAIL_CONFIRMATION_REQUIRED'
    );
  }

  // Does this auth account already own a business?
  const { data: existing } = await supabase.from('businesses').select('id').limit(1);
  if (existing && existing.length > 0) {
    throw new Error('This account already has a business linked. Sign in instead.');
  }

  const businessId = `biz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  // Insert business profile (owner_auth_id from the fresh session)
  const bizRow = M.businessToDb(businessId, state.business, data.user.id);
  const { error: bizErr } = await supabase.from('businesses').insert(bizRow);
  if (bizErr) throw new Error(`Creating business failed: ${bizErr.message}`);

  // Build the upload state: local users + an owner row for the cloud account
  const ownerEmail = email.toLowerCase();
  const users = [...state.users];
  if (!users.some((u) => u.email.toLowerCase() === ownerEmail)) {
    const ownerUser: User = {
      id: `user-owner-${Math.random().toString(36).slice(2, 10)}`,
      name: ownerName || 'Owner',
      email: ownerEmail,
      role: 'Administrator',
      roleId: 'role-admin',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    users.push(ownerUser);
  }
  const uploadState: AppState = { ...state, users };

  // Initial full upload of this device's data
  await pushEntities(uploadState, ALL_SYNC_KEYS, {}, businessId);

  return { businessId, ownerEmail };
}

/** If a Supabase session still exists, return its business id (else null). */
export async function restoreCloudSession(ownerEmail: string): Promise<CloudSession | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: businesses } = await supabase.from('businesses').select('id').limit(1);
  if (!businesses || businesses.length === 0) return null;
  return { businessId: businesses[0].id as string, ownerEmail: ownerEmail.toLowerCase() };
}

export async function cloudSignOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ============================================================
// PULL — download the whole business dataset
// ============================================================

export async function pullCloudState(businessId: string): Promise<Partial<AppState>> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const sb = supabase; // local const keeps the non-null narrowing inside closures

  const eq = (table: string) => sb.from(table).select('*').eq('business_id', businessId);

  const [businesses, customers, products, users, roles, invoices, payments, stockMovements, priceHistories, auditLogs, notifications] =
    await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
      eq('customers'),
      eq('products'),
      eq('users'),
      supabase.from('roles').select('*').or(`business_id.is.null,business_id.eq.${businessId}`),
      eq('invoices'),
      eq('payments'),
      eq('stock_movements'),
      eq('price_histories'),
      eq('audit_logs'),
      eq('notifications'),
    ]);

  // Parents with embedded child rows
  const salesRes = await supabase.from('sales').select('*, sale_items(*)').eq('business_id', businessId);
  const purchasesRes = await supabase.from('purchases').select('*, purchase_items(*)').eq('business_id', businessId);
  const returnsRes = await supabase.from('sales_returns').select('*, sales_return_items(*)').eq('business_id', businessId);
  const challansRes = await supabase.from('delivery_challans').select('*, delivery_challan_items(*)').eq('business_id', businessId);
  const quotesRes = await supabase.from('quotations').select('*, quotation_items(*)').eq('business_id', businessId);

  const err = (e: unknown, what: string): never => {
    throw new Error(`Downloading ${what} failed: ${e instanceof Error ? e.message : String(e)}`);
  };

  if (salesRes.error) err(salesRes.error, 'sales');
  if (purchasesRes.error) err(purchasesRes.error, 'purchases');
  if (returnsRes.error) err(returnsRes.error, 'sales returns');
  if (challansRes.error) err(challansRes.error, 'delivery challans');
  if (quotesRes.error) err(quotesRes.error, 'quotations');
  if (businesses.error) err(businesses.error, 'business profile');
  for (const [res, what] of [
    [customers, 'customers'],
    [products, 'products'],
    [users, 'users'],
    [roles, 'roles'],
    [invoices, 'invoices'],
    [payments, 'payments'],
    [stockMovements, 'stock movements'],
    [priceHistories, 'price histories'],
    [auditLogs, 'audit logs'],
    [notifications, 'notifications'],
  ] as const) {
    if (res.error) err(res.error, what);
  }

  // Map sales + items
  const sales = (salesRes.data || []).map((row: M.DbRow) =>
    M.saleFromDb(row, (row.sale_items as M.DbRow[]) || [])
  );
  const itemsBySaleId = new Map(sales.map((s) => [s.id, s.items]));

  const invoicesMapped = (invoices.data || []).map((row: M.DbRow) =>
    M.invoiceFromDb(row, itemsBySaleId.get(String(row.sale_id)) || [])
  );

  const result: Partial<AppState> = {
    business: businesses.data ? M.businessFromDb(businesses.data as M.DbRow) : ({} as BusinessProfile),
    users: (users.data || []).map(M.userFromDb),
    roles: (roles.data || []).map(M.roleFromDb),
    customers: (customers.data || []).map(M.customerFromDb),
    products: (products.data || []).map(M.productFromDb),
    sales,
    invoices: invoicesMapped,
    payments: (payments.data || []).map(M.paymentFromDb),
    purchases: (purchasesRes.data || []).map((row: M.DbRow) =>
      M.purchaseFromDb(row, (row.purchase_items as M.DbRow[]) || [])
    ),
    stockMovements: (stockMovements.data || []).map(M.stockMovementFromDb),
    salesReturns: (returnsRes.data || []).map((row: M.DbRow) =>
      M.salesReturnFromDb(row, (row.sales_return_items as M.DbRow[]) || [])
    ),
    priceHistories: (priceHistories.data || []).map(M.priceHistoryFromDb),
    auditLogs: (auditLogs.data || []).map(M.auditLogFromDb),
    deliveryChallans: (challansRes.data || []).map((row: M.DbRow) =>
      M.challanFromDb(row, (row.delivery_challan_items as M.DbRow[]) || [])
    ),
    quotes: (quotesRes.data || []).map((row: M.DbRow) =>
      M.quoteFromDb(row, (row.quotation_items as M.DbRow[]) || [])
    ),
    notifications: (notifications.data || []).map(M.notificationFromDb),
  };

  return result;
}

// ============================================================
// PUSH — upload changed entities (upsert + child re-insert)
// ============================================================

/**
 * Push the given entities.
 * `snapshot` is the state at the last successful sync — it is used to
 * (a) delete rows that disappeared locally, and
 * (b) skip unchanged parents (only their children get re-inserted).
 */
export async function pushEntities(
  state: AppState,
  keys: SyncKey[],
  snapshot: Partial<AppState>,
  businessId: string
): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');

  const wants = (key: SyncKey) => keys.includes(key);
  const currentOf = (key: SyncKey) => (state as unknown as Record<string, any>)[key] ?? [];
  const prevOf = (key: SyncKey) => (snapshot as unknown as Record<string, any>)[key] ?? [];

  const removedIds = (key: SyncKey): string[] => {
    const prev = prevOf(key) as { id?: string }[];
    const currIds = new Set((currentOf(key) as { id?: string }[]).map((r) => r.id));
    return prev.filter((r) => r && r.id && !currIds.has(r.id)).map((r) => r.id as string);
  };

  const changedParents = <T extends { id: string }>(_state: AppState, key: SyncKey): T[] => {
    const prevMap = new Map(
      (prevOf(key) as T[]).map((p) => [p.id, JSON.stringify(p)] as const)
    );
    return (currentOf(key) as T[]).filter((p) => {
      const oldJson = prevMap.get(p.id);
      return !oldJson || oldJson !== JSON.stringify(p);
    });
  };

  // ---------- 1. Deletions first (children cascade via FK) ----------
  const DEL_ORDER: SyncKey[] = [
    'notifications',
    'quotes',
    'deliveryChallans',
    'auditLogs',
    'priceHistories',
    'salesReturns',
    'stockMovements',
    'purchases',
    'payments',
    'invoices',
    'sales',
    'products',
    'customers',
    'users',
    'roles',
  ];
  const DEL_TABLE: Partial<Record<SyncKey, string>> = {
    notifications: 'notifications',
    quotes: 'quotations',
    deliveryChallans: 'delivery_challans',
    auditLogs: 'audit_logs',
    priceHistories: 'price_histories',
    salesReturns: 'sales_returns',
    stockMovements: 'stock_movements',
    purchases: 'purchases',
    payments: 'payments',
    invoices: 'invoices',
    sales: 'sales',
    products: 'products',
    customers: 'customers',
    users: 'users',
    roles: 'roles',
  };
  for (const key of DEL_ORDER) {
    if (!wants(key)) continue;
    const table = DEL_TABLE[key];
    if (!table) continue;
    const ids = removedIds(key);
    if (ids.length) await deleteRowsByIds(table, ids);
  }

  // ---------- 2. Upserts in FK-safe order ----------
  if (wants('business')) {
    await upsertRows('businesses', [M.businessToDb(businessId, state.business)]);
  }
  if (wants('roles')) {
    await upsertRows('roles', state.roles.map(M.roleToDb));
  }
  if (wants('users')) {
    await upsertRows('users', state.users.map((u) => M.userToDb(u, businessId)));
  }
  if (wants('customers')) {
    await upsertRows('customers', state.customers.map((c) => M.customerToDb(c, businessId)));
  }
  if (wants('products')) {
    await upsertRows('products', state.products.map((p) => M.productToDb(p, businessId)));
  }
  if (wants('sales')) {
    const changed = changedParents<Sale>(state, 'sales');
    await upsertRows('sales', changed.map((s) => M.saleToDb(s, businessId)));
    // Replace child rows for changed sales (delete + insert beats per-row diffing)
    const changedIds = changed.map((s) => s.id);
    await deleteRowsByColumn('sale_items', 'sale_id', changedIds);
    const allItems = changed.flatMap((s) => s.items.map((it) => M.saleItemToDb(it, s.id)));
    await upsertRows('sale_items', allItems);
  }
  if (wants('invoices')) {
    await upsertRows('invoices', state.invoices.map((i) => M.invoiceToDb(i, businessId)));
  }
  if (wants('payments')) {
    await upsertRows('payments', state.payments.map((p) => M.paymentToDb(p, businessId)));
  }
  if (wants('purchases')) {
    const changed = changedParents<Purchase>(state, 'purchases');
    await upsertRows('purchases', changed.map((p) => M.purchaseToDb(p, businessId)));
    await deleteRowsByColumn('purchase_items', 'purchase_id', changed.map((p) => p.id));
    const allItems = changed.flatMap((p) => p.items.map((it) => M.purchaseItemToDb(it, p.id)));
    await upsertRows('purchase_items', allItems);
  }
  if (wants('stockMovements')) {
    await upsertRows('stock_movements', state.stockMovements.map((m) => M.stockMovementToDb(m, businessId)));
  }
  if (wants('salesReturns')) {
    const changed = changedParents<SalesReturn>(state, 'salesReturns');
    await upsertRows('sales_returns', changed.map((r) => M.salesReturnToDb(r, businessId)));
    await deleteRowsByColumn('sales_return_items', 'sales_return_id', changed.map((r) => r.id));
    const allItems = changed.flatMap((r) => r.items.map((it) => M.salesReturnItemToDb(it, r.id)));
    await upsertRows('sales_return_items', allItems);
  }
  if (wants('quotes') && state.quotes) {
    const changed = changedParents<Quote>(state, 'quotes');
    await upsertRows('quotations', changed.map((q) => M.quoteToDb(q, businessId)));
    // Replace child rows for changed quotes (delete + insert beats per-row diffing)
    await deleteRowsByColumn('quotation_items', 'quote_id', changed.map((q) => q.id));
    const allQuoteItems = changed.flatMap((q) => q.items.map((it) => M.quoteItemToDb(it, q.id)));
    await upsertRows('quotation_items', allQuoteItems);
  }
  if (wants('priceHistories')) {
    await upsertRows('price_histories', state.priceHistories.map((h) => M.priceHistoryToDb(h, businessId)));
  }
  if (wants('auditLogs')) {
    await upsertRows('audit_logs', state.auditLogs.map((l) => M.auditLogToDb(l, businessId)));
  }
  if (wants('deliveryChallans') && state.deliveryChallans) {
    const changed = changedParents<DeliveryChallan>(state, 'deliveryChallans');
    await upsertRows('delivery_challans', changed.map((c) => M.challanToDb(c, businessId)));
    await deleteRowsByColumn('delivery_challan_items', 'challan_id', changed.map((c) => c.id));
    const allItems = changed.flatMap((c) => c.items.map((it) => M.challanItemToDb(it, c.id)));
    await upsertRows('delivery_challan_items', allItems);
  }
  if (wants('notifications') && state.notifications) {
    await upsertRows('notifications', state.notifications.map((n) => M.notificationToDb(n, businessId)));
  }
}
