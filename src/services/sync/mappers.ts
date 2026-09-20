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
  nextInvoiceNumber: num(row.next_invoice_number, 1),
  nextPaymentNumber: num(row.next_payment_number, 1),
  nextPurchaseNumber: num(row.next_purchase_number, 1),
  nextReturnNumber: num(row.next_return_number, 1),
  invoiceTerms: str(row.invoice_terms),
  currencySymbol: str(row.currency_symbol, '₹'),
  enableGst: bool(row.enable_gst, true),
  defaultGstRate: num(row.default_gst_rate, 18),
  businessStateCode: str(row.business_state_code, '27'),
});

// ============================================================
// USERS
// ============================================================

export const userToDb = (u: User, businessId: string): DbRow => ({
  id: u.id,
  business_id: businessId,
  name: u.name,
  email: u.email,
  phone: strOrNull(u.phone),
  role: u.role,
  role_id: u.roleId ?? null,
  status: u.status || 'Active',
  password: strOrNull(u.password),
  avatar_url: strOrNull(u.avatarUrl),
  fcm_token: null,
  created_at: iso(u.createdAt),
  updated_at: new Date().toISOString(),
});

export const userFromDb = (row: DbRow): User => ({
  id: str(row.id),
  name: str(row.name),
  email: str(row.email),
  phone: row.phone ?? undefined,
  role: str(row.role, 'Sales Executive'),
  roleId: str(row.role_id, 'role-admin'),
  status: row.status === 'Disabled' ? 'Disabled' : 'Active',
  password: row.password ?? undefined,
  avatarUrl: row.avatar_url ?? undefined,
  createdAt: row.created_at ? iso(row.created_at) : undefined,
});

// ============================================================
// ROLES
// ============================================================

export const roleToDb = (r: RolePermission): DbRow => ({
  id: r.id,
  // System roles are shared across all tenants (business_id NULL)
  business_id: r.isSystemRole ? null : null,
  name: r.name,
  description: r.description || '',
  is_system_role: r.isSystemRole ?? false,
  accessible_modules: r.accessibleModules || [],
  can_view_cost_price: r.canViewCostPrice ?? false,
  can_view_profit: r.canViewProfit ?? false,
  can_edit_prices: r.canEditPrices ?? false,
  can_cancel_invoices: r.canCancelInvoices ?? false,
  can_process_returns: r.canProcessReturns ?? false,
  can_delete_products: r.canDeleteProducts ?? false,
  can_delete_sales: r.canDeleteSales ?? false,
  can_modify_stock: r.canModifyStock ?? false,
  can_export_data: r.canExportData ?? false,
  can_manage_settings: r.canManageSettings ?? false,
});

export const roleFromDb = (row: DbRow): RolePermission => ({
  id: str(row.id),
  name: str(row.name),
  description: str(row.description),
  isSystemRole: bool(row.is_system_role),
  accessibleModules: Array.isArray(row.accessible_modules) ? row.accessible_modules : [],
  canViewCostPrice: bool(row.can_view_cost_price),
  canViewProfit: bool(row.can_view_profit),
  canEditPrices: bool(row.can_edit_prices),
  canCancelInvoices: bool(row.can_cancel_invoices),
  canProcessReturns: bool(row.can_process_returns),
  canDeleteProducts: bool(row.can_delete_products),
  canDeleteSales: bool(row.can_delete_sales),
  canModifyStock: bool(row.can_modify_stock),
  canExportData: bool(row.can_export_data),
  canManageSettings: bool(row.can_manage_settings),
});

// ============================================================
// CUSTOMERS
// ============================================================

export const customerToDb = (c: Customer, businessId: string): DbRow => ({
  id: c.id,
  business_id: businessId,
  name: c.name,
  phone: c.phone,
  alt_phone: strOrNull(c.altPhone),
  email: strOrNull(c.email),
  address: c.address || '',
  city: c.city || '',
  state: c.state || '',
  pincode: strOrNull(c.pincode),
  gstin: strOrNull(c.gstin),
  customer_type: c.customerType || 'Retail',
  credit_limit: c.creditLimit ?? 0,
  payment_terms_days: c.paymentTermsDays ?? 15,
  total_purchases: c.totalPurchases ?? 0,
  total_paid: c.totalPaid ?? 0,
  outstanding_balance: c.outstandingBalance ?? 0,
  opening_balance: c.openingBalance ?? 0,
  notes: strOrNull(c.notes),
  created_at: iso(c.createdAt),
  updated_at: iso(c.updatedAt),
});

export const customerFromDb = (row: DbRow): Customer => ({
  id: str(row.id),
  name: str(row.name),
  phone: str(row.phone),
  altPhone: row.alt_phone ?? undefined,
  email: row.email ?? undefined,
  address: str(row.address),
  city: str(row.city),
  state: str(row.state),
  pincode: row.pincode ?? undefined,
  gstin: row.gstin ?? undefined,
  customerType: (str(row.customer_type, 'Retail') as Customer['customerType']),
  creditLimit: num(row.credit_limit),
  paymentTermsDays: num(row.payment_terms_days, 15),
  totalPurchases: num(row.total_purchases),
  totalPaid: num(row.total_paid),
  outstandingBalance: num(row.outstanding_balance),
  openingBalance: num(row.opening_balance),
  notes: row.notes ?? undefined,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

// ============================================================
// PRODUCTS
// ============================================================

export const productToDb = (p: Product, businessId: string): DbRow => ({
  id: p.id,
  business_id: businessId,
  sku: p.sku,
  barcode: strOrNull(p.barcode),
  name: p.name,
  category: p.category || 'General',
  unit: p.unit || 'Pieces',
  purchase_price: p.purchasePrice ?? 0,
  selling_price: p.sellingPrice ?? 0,
  wholesale_price: p.wholesalePrice ?? 0,
  dealer_price: p.dealerPrice ?? 0,
  min_stock_level: p.minStockLevel ?? 0,
  current_stock: p.currentStock ?? 0,
  gst_rate: p.gstRate ?? 18,
  hsn_code: strOrNull(p.hsnCode),
  description: strOrNull(p.description),
  created_at: iso(p.createdAt),
  updated_at: iso(p.updatedAt),
});

export const productFromDb = (row: DbRow): Product => ({
  id: str(row.id),
  sku: str(row.sku),
  barcode: row.barcode ?? undefined,
  name: str(row.name),
  category: str(row.category, 'General'),
  unit: str(row.unit, 'Pieces'),
  purchasePrice: num(row.purchase_price),
  sellingPrice: num(row.selling_price),
  wholesalePrice: num(row.wholesale_price),
  dealerPrice: num(row.dealer_price),
  minStockLevel: num(row.min_stock_level),
  currentStock: num(row.current_stock),
  gstRate: num(row.gst_rate, 18),
  hsnCode: row.hsn_code ?? undefined,
  description: row.description ?? undefined,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

// ============================================================
// SALES + SALE ITEMS
// ============================================================

export const saleToDb = (s: Sale, businessId: string): DbRow => ({
  id: s.id,
  business_id: businessId,
  invoice_number: s.invoiceNumber,
  customer_id: s.customerId || null,
  customer_name: s.customerName,
  customer_phone: s.customerPhone,
  customer_address: strOrNull(s.customerAddress),
  customer_gstin: strOrNull(s.customerGstin),
  date: iso(s.date),
  subtotal: s.subtotal ?? 0,
  total_discount: s.totalDiscount ?? 0,
  total_tax: s.totalTax ?? 0,
  round_off: s.roundOff ?? 0,
  grand_total: s.grandTotal ?? 0,
  amount_paid: s.amountPaid ?? 0,
  balance_due: s.balanceDue ?? 0,
  payment_status: s.paymentStatus || 'Pending',
  payment_method: s.paymentMethod || 'Cash',
  split_payments: s.splitPayments ?? null,
  is_zero_gst: s.isZeroGst ?? false,
  is_inter_state: s.isInterState ?? false,
  employee_name: s.employeeName,
  notes: strOrNull(s.notes),
  cancellation_reason: strOrNull(s.cancellationReason),
  created_at: iso(s.createdAt),
  updated_at: iso(s.updatedAt),
});

export const saleItemToDb = (item: SaleItem, saleId: string): DbRow => ({
  id: item.id,
  sale_id: saleId,
  product_id: item.productId || null,
  product_name: item.productName,
  sku: item.sku,
  unit: item.unit || 'Pieces',
  quantity: item.quantity,
  purchase_price: item.purchasePrice ?? 0,
  unit_price: item.unitPrice,
  discount: item.discount ?? 0,
  discount_type: item.discountType || 'fixed',
  gst_rate: item.gstRate ?? 0,
  tax_amount: item.taxAmount ?? 0,
  total_amount: item.totalAmount ?? 0,
});

export const saleFromDb = (row: DbRow, items: DbRow[]): Sale => ({
  id: str(row.id),
  invoiceNumber: str(row.invoice_number),
  customerId: str(row.customer_id),
  customerName: str(row.customer_name),
  customerPhone: str(row.customer_phone),
  customerAddress: row.customer_address ?? undefined,
  customerGstin: row.customer_gstin ?? undefined,
  date: iso(row.date),
  items: (items || []).map(saleItemFromDb),
  subtotal: num(row.subtotal),
  totalDiscount: num(row.total_discount),
  totalTax: num(row.total_tax),
  roundOff: num(row.round_off),
  grandTotal: num(row.grand_total),
  amountPaid: num(row.amount_paid),
  balanceDue: num(row.balance_due),
  paymentStatus: (str(row.payment_status, 'Pending') as Sale['paymentStatus']),
  paymentMethod: (str(row.payment_method, 'Cash') as Sale['paymentMethod']),
  splitPayments: Array.isArray(row.split_payments)
    ? row.split_payments.map((sp: any) => ({
        method: str(sp?.method, 'Cash') as any,
        amount: num(sp?.amount),
        referenceNo: sp?.referenceNo,
      }))
    : undefined,
  isZeroGst: bool(row.is_zero_gst),
  isInterState: bool(row.is_inter_state),
  employeeName: str(row.employee_name),
  notes: row.notes ?? undefined,
  cancellationReason: row.cancellation_reason ?? undefined,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

export const saleItemFromDb = (row: DbRow): SaleItem => ({
  id: str(row.id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  sku: str(row.sku),
  unit: str(row.unit, 'Pieces'),
  quantity: num(row.quantity),
  purchasePrice: num(row.purchase_price),
  unitPrice: num(row.unit_price),
  discount: num(row.discount),
  discountType: (str(row.discount_type, 'fixed') as SaleItem['discountType']),
  gstRate: num(row.gst_rate),
  taxAmount: num(row.tax_amount),
  totalAmount: num(row.total_amount),
});

// ============================================================
// INVOICES (items come from the parent sale)
// ============================================================

export const invoiceToDb = (i: Invoice, businessId: string): DbRow => ({
  id: i.id,
  business_id: businessId,
  invoice_number: i.invoiceNumber,
  sale_id: i.saleId || null,
  customer_id: i.customerId || null,
  customer_name: i.customerName,
  customer_phone: i.customerPhone,
  customer_address: strOrNull(i.customerAddress),
  customer_gstin: strOrNull(i.customerGstin),
  date: iso(i.date),
  due_date: i.dueDate ? iso(i.dueDate) : null,
  subtotal: i.subtotal ?? 0,
  total_discount: i.totalDiscount ?? 0,
  total_tax: i.totalTax ?? 0,
  round_off: i.roundOff ?? 0,
  grand_total: i.grandTotal ?? 0,
  amount_paid: i.amountPaid ?? 0,
  balance_due: i.balanceDue ?? 0,
  payment_status: i.paymentStatus || 'Pending',
  is_zero_gst: i.isZeroGst ?? false,
  is_inter_state: i.isInterState ?? false,
  terms: strOrNull(i.terms),
  created_at: iso(i.createdAt),
});

export const invoiceFromDb = (row: DbRow, items: SaleItem[]): Invoice => ({
  id: str(row.id),
  invoiceNumber: str(row.invoice_number),
  saleId: str(row.sale_id),
  customerId: str(row.customer_id),
  customerName: str(row.customer_name),
  customerPhone: str(row.customer_phone),
  customerAddress: str(row.customer_address ?? ''),
  customerGstin: row.customer_gstin ?? undefined,
  date: iso(row.date),
  dueDate: row.due_date ? iso(row.due_date) : new Date().toISOString(),
  items: items || [],
  subtotal: num(row.subtotal),
  totalDiscount: num(row.total_discount),
  totalTax: num(row.total_tax),
  roundOff: num(row.round_off),
  grandTotal: num(row.grand_total),
  amountPaid: num(row.amount_paid),
  balanceDue: num(row.balance_due),
  paymentStatus: (str(row.payment_status, 'Pending') as Invoice['paymentStatus']),
  isZeroGst: bool(row.is_zero_gst),
  isInterState: bool(row.is_inter_state),
  terms: str(row.terms),
  createdAt: iso(row.created_at),
});

// ============================================================
// PAYMENTS
// ============================================================

export const paymentToDb = (p: Payment, businessId: string): DbRow => ({
  id: p.id,
  business_id: businessId,
  payment_number: p.paymentNumber,
  invoice_id: p.invoiceId || null,
  invoice_number: strOrNull(p.invoiceNumber),
  sale_id: p.saleId || null,
  customer_id: p.customerId || null,
  customer_name: p.customerName,
  amount: p.amount,
  payment_date: iso(p.paymentDate),
  payment_method: p.paymentMethod || 'Cash',
  reference_no: strOrNull(p.referenceNo),
  cheque_number: strOrNull(p.chequeNumber),
  bank_name: strOrNull(p.bankName),
  notes: strOrNull(p.notes),
  recorded_by: p.recordedBy,
  created_at: iso(p.createdAt),
});

export const paymentFromDb = (row: DbRow): Payment => ({
  id: str(row.id),
  paymentNumber: str(row.payment_number),
  invoiceId: row.invoice_id ?? undefined,
  invoiceNumber: row.invoice_number ?? undefined,
  saleId: row.sale_id ?? undefined,
  customerId: str(row.customer_id),
  customerName: str(row.customer_name),
  amount: num(row.amount),
  paymentDate: iso(row.payment_date),
  paymentMethod: (str(row.payment_method, 'Cash') as Payment['paymentMethod']),
  referenceNo: row.reference_no ?? undefined,
  chequeNumber: row.cheque_number ?? undefined,
  bankName: row.bank_name ?? undefined,
  notes: row.notes ?? undefined,
  recordedBy: str(row.recorded_by),
  createdAt: iso(row.created_at),
});

// ============================================================
// PURCHASES + PURCHASE ITEMS
// ============================================================

export const purchaseToDb = (p: Purchase, businessId: string): DbRow => ({
  id: p.id,
  business_id: businessId,
  purchase_number: p.purchaseNumber,
  vendor_invoice_no: p.vendorInvoiceNo,
  supplier_name: p.supplierName,
  supplier_phone: strOrNull(p.supplierPhone),
  supplier_gstin: strOrNull(p.supplierGstin),
  date: iso(p.date),
  credit_days: p.creditDays ?? null,
  due_date: p.dueDate ? iso(p.dueDate) : null,
  total_amount: p.totalAmount ?? 0,
  amount_paid: p.amountPaid ?? 0,
  payment_status: p.paymentStatus || 'Pending',
  scheme_details: null,
  notes: strOrNull(p.notes),
  recorded_by: p.recordedBy,
  created_at: iso(p.createdAt),
});

export const purchaseItemToDb = (item: PurchaseItem, purchaseId: string): DbRow => ({
  id: item.id,
  purchase_id: purchaseId,
  product_id: item.productId || null,
  product_name: item.productName,
  unit: item.unit || 'Pieces',
  quantity: item.quantity,
  purchase_price: item.purchasePrice,
  gst_rate: item.gstRate ?? 0,
  total_amount: item.totalAmount ?? 0,
});

export const purchaseFromDb = (row: DbRow, items: DbRow[]): Purchase => ({
  id: str(row.id),
  purchaseNumber: str(row.purchase_number),
  vendorInvoiceNo: str(row.vendor_invoice_no),
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
  date: iso(r.date),
  total_refund_amount: r.totalRefundAmount ?? 0,
  restock_inventory: r.restockInventory ?? false,
  refund_method: r.refundMethod || 'Cash',
  reason: r.reason,
  processed_by: r.processedBy,
  created_at: iso(r.createdAt),
});

export const salesReturnItemToDb = (item: SalesReturnItem, returnId: string): DbRow => ({
  id: item.id || `sri-${returnId}-${Math.random().toString(36).slice(2, 10)}`,
  sales_return_id: returnId,
  product_id: item.productId || null,
  product_name: item.productName,
  unit: item.unit || 'Pieces',
  quantity: item.quantity,
  unit_price: item.unitPrice,
  refund_amount: item.refundAmount ?? 0,
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

export const salesReturnItemFromDb = (row: DbRow): SalesReturnItem => ({
  id: str(row.id),
  productId: str(row.product_id),
  productName: str(row.product_name),
  unit: str(row.unit, 'Pieces'),
  quantity: num(row.quantity),
  unitPrice: num(row.unit_price),
  refundAmount: num(row.refund_amount),
});

// ============================================================
// PRICE HISTORIES
// ============================================================

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
  notes: strOrNull(c.notes),
  created_by: c.createdBy,
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
  deliveryStatus: (str(row.delivery_status, 'Dispatched') as DeliveryChallan['deliveryStatus']),
  deliveredAt: row.delivered_at ? iso(row.delivered_at) : undefined,
  receivedBy: row.received_by ?? undefined,
  notes: row.notes ?? undefined,
  createdBy: str(row.created_by),
  createdAt: iso(row.created_at),
  items: (items || []).map(challanItemFromDb),
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
