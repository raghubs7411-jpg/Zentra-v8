export interface RolePermission {
  id: string;
  name: string;
  description: string;
  isSystemRole?: boolean;
  accessibleModules: string[]; // ['overview', 'new-sale', 'sales', 'customers', 'inventory', 'purchases', 'payments', 'invoices', 'reports', 'pricing', 'audit', 'settings']
  canViewCostPrice: boolean;
  canViewProfit: boolean;
  canEditPrices: boolean;
  canCancelInvoices: boolean;
  canProcessReturns: boolean;
  canDeleteProducts: boolean;
  canDeleteSales: boolean;
  canModifyStock: boolean;
  canExportData: boolean;
  canManageSettings: boolean;
}

export type UserRole = string;

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  roleId: string;
  status: 'Active' | 'Disabled';
  password?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface BankDetails {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
  upiId: string;
  accountHolderName: string;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  logoUrl?: string;
  phone: string;
  altPhone?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  stateCode: string;
  bankDetails: BankDetails;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  nextPaymentNumber: number;
  nextPurchaseNumber: number;
  nextReturnNumber: number;
  invoiceTerms: string;
  currencySymbol: string;
  enableGst: boolean;
  defaultGstRate: number;
  businessStateCode: string;
}

export type CustomerType = 'Retail' | 'Wholesale' | 'Contractor' | 'Dealer' | 'Other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  gstin?: string;
  customerType: CustomerType;
  creditLimit: number;
  paymentTermsDays: number;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  openingBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type UnitType = 'Pieces' | 'Kg' | 'Grams' | 'Litres' | 'Boxes' | 'Bags' | 'Metres' | 'Hours' | 'Packets' | 'Units' | string;

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  unit: UnitType;
  purchasePrice: number;
  sellingPrice: number; // Retail price
  wholesalePrice: number;
  dealerPrice: number;
  minStockLevel: number;
  currentStock: number;
  gstRate: number; // 0, 5, 12, 18, 28
  hsnCode?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  priceType: 'retail' | 'wholesale' | 'dealer' | 'purchase';
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitType;
  quantity: number;
  purchasePrice: number; // For profit calculations
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  gstRate: number;
  taxAmount: number;
  totalAmount: number;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Cancelled' | 'Refunded';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Credit' | 'Split';

export interface SplitPaymentDetail {
  method: PaymentMethod;
  amount: number;
  referenceNo?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGstin?: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentDetail[];
  isZeroGst?: boolean;
  isInterState?: boolean;
  employeeName: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  saleId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin?: string;
  date: string;
  dueDate: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  isZeroGst?: boolean;
  isInterState?: boolean;
  terms: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  saleId?: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  chequeNumber?: string;
  bankName?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  totalAmount: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  vendorInvoiceNo: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin?: string;
  date: string;
  creditDays?: number;
  dueDate?: string;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Pending';
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export type StockMovementType = 'Sale' | 'Purchase' | 'Return' | 'Damage' | 'Adjustment' | 'Audit';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesReturnItem {
  id?: string;
  productId: string;
  productName: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  restockInventory: boolean;
  refundMethod: 'Cash' | 'Credit Note' | 'Bank Transfer' | 'Adjust Balance';
  reason: string;
  processedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'Product' | 'Sale' | 'Invoice' | 'Payment' | 'Customer' | 'Price' | 'Inventory' | 'Purchase' | 'Settings' | 'User' | 'Role';
  entityId: string;
  details: string;
  performedBy: string;
  timestamp: string;
}

export interface AppState {
  business: BusinessProfile;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  invoices: Invoice[];
  payments: Payment[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  salesReturns: SalesReturn[];
  priceHistories: PriceHistory[];
  auditLogs: AuditLog[];
  roles: RolePermission[];
  users: User[];
  currentUser: User;
  deliveryChallans?: DeliveryChallan[];
  notifications?: AppNotification[];
}

// ============================================================
// DELIVERY CHALLAN (Dispatch tracking)
// ============================================================

export interface DeliveryChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  vehicleNumber: string;
  driverName: string;
  transportName: string;
  dispatchDate: string;
  deliveryStatus: 'Dispatched' | 'Delivered' | 'Returned';
  deliveredAt?: string;
  receivedBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  items: DeliveryChallanItem[];
}

// ============================================================
// NOTIFICATIONS (Push alert system)
// ============================================================

export type NotificationType =
  | 'payment_overdue'
  | 'low_stock'
  | 'sale_completed'
  | 'daily_summary'
  | 'payment_received'
  | 'delivery_confirmed';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// PRODUCT BATCH (Expiry & FIFO tracking)
// ============================================================

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  manufactureDate?: string;
  expiryDate?: string;
  purchasePrice: number;
  createdAt: string;
}
