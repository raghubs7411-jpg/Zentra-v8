/**
 * Pure field mappers between the app's TypeScript models (camelCase)
 * and the Supabase DB rows (snake_case). No Supabase imports here —
 * these functions are unit-testable in isolation.
 */

import {
  AppNotification,
  AuditLog,
  BusinessProfile,
  Customer,
  DeliveryChallan,
  Invoice,
  Payment,
  PriceHistory,
  Product,
  Purchase,
  PurchaseItem,
  RolePermission,
  Sale,
  SaleItem,
  SalesReturn,
  SalesReturnItem,
  StockMovement,
  User,
} from '../../types';

// ============================================================
// Helpers
// ============================================================

/** Normalize any DB timestamp to an ISO string the app expects. */
const iso = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value !== 'string' || !value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
};

const num = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return isNaN(n) ? fallback : n;
};

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const strOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  const s = String(value);
  return s === '' ? null : s;
};

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : value == null ? fallback : Boolean(value);

/** Row type: whatever Supabase returns (plain JSON object). */
export type DbRow = Record<string, any>;

// ============================================================
// BUSINESS PROFILE
// ============================================================

export const businessToDb = (
  businessId: string,
  b: BusinessProfile,
  ownerAuthId?: string | null
): DbRow => {
  const row: DbRow = {
    id: businessId,
    name: b.name,
    tagline: b.tagline || '',
    logo_url: b.logoUrl ?? null,
    phone: b.phone,
    alt_phone: strOrNull(b.altPhone),
    email: b.email,
    address: b.address,
    city: b.city,
    state: b.state,
    pincode: strOrNull(b.pincode),
    gstin: strOrNull(b.gstin),
    pan: strOrNull(b.pan),
    state_code: strOrNull(b.stateCode),
    bank_name: strOrNull(b.bankDetails?.bankName),
    bank_account_no: strOrNull(b.bankDetails?.accountNo),
    bank_ifsc: strOrNull(b.bankDetails?.ifscCode),
    bank_branch: strOrNull(b.bankDetails?.branch),
    bank_upi_id: strOrNull(b.bankDetails?.upiId),
    bank_account_holder: strOrNull(b.bankDetails?.accountHolderName),
    invoice_prefix: b.invoicePrefix || 'INV-',
    next_invoice_number: b.nextInvoiceNumber ?? 1,
    next_payment_number: b.nextPaymentNumber ?? 1,
    next_purchase_number: b.nextPurchaseNumber ?? 1,
    next_return_number: b.nextReturnNumber ?? 1,
    invoice_terms: b.invoiceTerms || '',
    currency_symbol: b.currencySymbol || '₹',
    enable_gst: b.enableGst ?? true,
    default_gst_rate: b.defaultGstRate ?? 18,
    business_state_code: b.businessStateCode || '27',
  };
  // Only include owner_auth_id when explicitly provided: an upsert during
  // sync must never try to clear it (RLS requires owner_auth_id = auth.uid()).
  if (ownerAuthId) row.owner_auth_id = ownerAuthId;
  return row;
};

export const businessFromDb = (row: DbRow): BusinessProfile => ({
  name: str(row.name),
  tagline: str(row.tagline),
  logoUrl: row.logo_url ?? undefined,
  phone: str(row.phone),
  altPhone: row.alt_phone ?? undefined,
  email: str(row.email),
  address: str(row.address),
  city: str(row.city),
  state: str(row.state),
  pincode: str(row.pincode ?? ''),
  gstin: str(row.gstin ?? ''),
  pan: str(row.pan ?? ''),
  stateCode: str(row.state_code ?? ''),
  bankDetails: {
    bankName: str(row.bank_name),
    accountNo: str(row.bank_account_no),
    ifscCode: str(row.bank_ifsc),
    branch: str(row.bank_branch),
    upiId: str(row.bank_upi_id),
    accountHolderName: str(row.bank_account_holder),
  },
  invoicePrefix: str(row.invoice_prefix, 'INV-'),
  nextInvoiceNumber: num(row.next_invoice_number, 1),  nextPaymentNumber: num(row.next_payment_number, 1),
  nextSupplierInvoiceNo: str(row.vendor_invoice_no),
  supplierName: str(row.supplier_name),
  supplierPhone: row.supplier_phone ?? '',
  supplierGstin: row.supplier_gstin ?? undefined,
  date: iso(row.date),
  creditDays: row.credit_days != null ? num(row.credit_days) : undefined,
  dueDate: row.due_date ? iso(row.due_date) : undefined,
  items: (items || []).map(purchaseItemFromDb),
  totalAmount: num(row.total_amount),
  amountPaid: num(row.amount_paid),
  paymentStatus: (str(row.payment_status, 'Pending') as Purchase['paymentStatus']),
  notes: row.notes ?? undefined,
  recordedBy: str(row.recorded_by),
  createdAt: iso(row.created_at),
});

export const purchaseItemFromDb = (row: DbRow): PurchaseItem => ({
  id: str(row.id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  unit: str(row.unit, 'Pieces'),
  quantity: num(row.quantity),
  purchasePrice: num(row.purchase_price),
  gstRate: num(row.gst_rate),
  totalAmount: num(row.total_amount),
});

// ============================================================
// STOCK MOVEMENTS
// ============================================================

export const stockMovementToDb = (m: StockMovement, businessId: string): DbRow => ({
  id: m.id,
  business_id: businessId,
  product_id: m.productId || null,
  product_name: m.productName,
  type: m.type,
  quantity: m.quantity,
  previous_stock: m.previousStock ?? null,
  new_stock: m.newStock ?? null,
  reference_id: strOrNull(m.referenceId),
  reason: strOrNull(m.reason),
  created_by: m.createdBy,
  created_at: iso(m.createdAt),
});

export const stockMovementFromDb = (row: DbRow): StockMovement => ({
  id: str(row.id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  type: (str(row.type, 'Adjustment') as StockMovement['type']),
  quantity: num(row.quantity),
  previousStock: num(row.previous_stock),
  newStock: num(row.new_stock),
  referenceId: row.reference_id ?? undefined,
  reason: row.reason ?? undefined,
  createdBy: str(row.created_by),
  createdAt: iso(row.created_at),
});

// ============================================================
// SALES RETURNS + ITEMS
// ============================================================

export const salesReturnToDb = (r: SalesReturn, businessId: string): DbRow => ({
  id: r.id,
  business_id: businessId,
  return_number: r.returnNumber,
  sale_id: r.saleId || null,
  invoice_number: r.invoiceNumber,
  customer_id: r.customerId || null,
  customer_name: r.customerName,
  date: iso(r.date),  total_refund_amount: r.totalRefundAmount ?? 0,
  restock_inventory: r.restockInventory ?? false,
  refund_method: r.refundMethod || 'Cash',
  reason: r.reason,
  processed_by: r.processedBy,
  created_at: iso(r.createdAt),
});

export const salesReturnFromDb = (row: DbRow, items: DbRow[]): SalesReturn => ({
  id: str(row.id),
  returnNumber: str(row.return_number),
  saleId: str(row.sale_id),
  invoiceNumber: str(row.invoice_number),
  customerId: str(row.customer_id),
  customerName: str(row.customer_name),
  date: iso(row.date),
  items: (items || []).map(salesReturnItemFromDb),
  totalRefundAmount: num(row.total_refund_amount),
  restockInventory: bool(row.restock_inventory),
  refundMethod: (str(row.refund_method, 'Cash') as SalesReturn['refundMethod']),
  reason: str(row.reason),
  processedBy: str(row.processed_by),
  createdAt: iso(row.created_at),
});

// ============================================================
// PRICE HISTORIES
// =============================================================

export const priceHistoryToDb = (h: PriceHistory, businessId: string): DbRow => ({
  id: h.id,
  business_id: businessId,
  product_id: h.productId || null,
  product_name: h.productName,
  old_price: h.oldPrice ?? null,
  new_price: h.newPrice ?? null,
  price_type: h.priceType || 'retail',
  changed_by: h.changedBy,
  changed_at: iso(h.changedAt),
  reason: strOrNull(h.reason),
});

export const priceHistoryFromDb = (row: DbRow): PriceHistory => ({
  id: str(row.id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  oldPrice: num(row.old_price),
  newPrice: num(row.new_price),
  priceType: (str(row.price_type, 'retail') as PriceHistory['priceType']),
  changedBy: str(row.changed_by),
  changedAt: iso(row.changed_at),
  reason: row.reason ?? undefined,
});

// ============================================================
// AUDIT LOGS
// ============================================================

export const auditLogToDb = (l: AuditLog, businessId: string): DbRow => ({
  id: l.id,
  business_id: businessId,
  action: l.action,
  entity_type: l.entityType,
  entity_id: l.entityId,
  details: l.details,
  performed_by: l.performedBy,
  timestamp: iso(l.timestamp),
});

export const auditLogFromDb = (row: DbRow): AuditLog => ({
  id: str(row.id),
  action: str(row.action),
  entityType: (str(row.entity_type, 'Settings') as AuditLog['entityType']),
  entityId: str(row.entity_id),
  details: str(row.details),
  performedBy: str(row.performed_by),
  timestamp: iso(row.timestamp),
});

// ============================================================
// DELIVERY CHALLANS + ITEMS
// ============================================================

export const challanToDb = (c: DeliveryChallan, businessId: string): DbRow => ({
  id: c.id,
  business_id: businessId,
  challan_number: c.challanNumber,
  sale_id: c.saleId || null,
  customer_name: c.customerName,
  customer_phone: c.customerPhone,
  customer_address: c.customerAddress,
  vehicle_number: c.vehicleNumber,
  driver_name: c.driverName,
  transport_name: c.transportName,
  dispatch_date: iso(c.dispatchDate),
  delivery_status: c.deliveryStatus || 'Dispatched',
  delivered_at: c.deliveredAt ? iso(c.deliveredAt) : null,
  received_by: strOrNull(c.receivedBy),
  notes: strOrNull(c.notes),  created_by: c.createdBy,
  created_at: iso(c.createdAt),
});

export const challanItemToDb = (item: DeliveryChallan['items'][number], challanId: string): DbRow => ({
  id: item.id,
  challan_id: challanId,
  product_id: item.productId || null,
  product_name: item.productName,
  quantity: item.quantity,
  unit: item.unit || 'Pieces',
});

export const challanFromDb = (row: DbRow, items: DbRow[]): DeliveryChallan => ({
  id: str(row.id),
  challanNumber: str(row.challan_number),
  saleId: str(row.sale_id),
  customerName: str(row.customer_name),
  customerPhone: str(row.customer_phone),
  customerAddress: str(row.customer_address ?? ''),
  vehicleNumber: str(row.vehicle_number),
  driverName: str(row.driver_name),
  transportName: str(row.transport_name),
  dispatchDate: iso(row.dispatch_date),
  deliveryStatus: (str(row.delivery_status, 'Dispatched') as DeliveryChallan['deliveryStatus']),  deliveredAt: row.delivered_at ? iso(row.delivered_at) : undefined,
  receivedBy: row.received_by ?? undefined,
  notes: row.notes ?? undefined,
  createdBy: str(row.created_by),
  createdAt: iso(row.created_at),
  items: (items || []).map(challanFromDb),
});

export const challanItemFromDb = (row: DbRow): DeliveryChallan['items'][number] => ({
  id: str(row.id),
  challanId: str(row.challan_id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  quantity: num(row.quantity),
  unit: str(row.unit, 'Pieces'),
});

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notificationToDb = (n: AppNotification, businessId: string): DbRow => ({
  id: n.id,
  business_id: businessId,
  user_id: n.userId || null,
  type: n.type,
  title: n.title,
  body: strOrNull(n.body),
  data: n.data ?? null,
  is_read: n.isRead ?? false,
  created_at: iso(n.createdAt),
});

export const notificationFromDb = (row: DbRow): AppNotification => ({
  id: str(row.id),
  userId: str(row.user_id),
  type: (str(row.type, 'daily_summary') as AppNotification['type']),
  title: str(row.title),
  body: row.body ?? undefined,
  data: (row.data as Record<string, unknown>) ?? undefined,
  isRead: bool(row.is_read),
  createdAt: iso(row.created_at),
});
