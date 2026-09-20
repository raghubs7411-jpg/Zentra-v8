import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  AppState,
  BusinessProfile,
  Customer,
  Product,
  Sale,
  Invoice,
  Payment,
  Purchase,
  StockMovement,
  SalesReturn,
  PriceHistory,
  Quote,
  QuoteItem,
  AuditLog,
  User,
  RolePermission,
  SaleItem,
  PaymentMethod,
  SplitPaymentDetail,
  StockMovementType,
} from '../types';
import { getInitialState, initialRoles } from '../data/mockData';
import { loadStateFromStorage, saveStateToStorage } from '../utils/storage';
import { calculateSaleTotals } from '../utils/calculations';
import { generateId } from '../utils/id';
import { setCurrencySymbol } from '../utils/formatters';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  CloudSession,
  SyncStatus,
  cloudSignIn,
  cloudSignUp,
  cloudSignOut,
  restoreCloudSession,
  pullCloudState,
  pushEntities,
  buildSnapshot,
  detectChangedKeys,
} from '../services/sync/cloudSync';
import { mergePulledState, pulledSnapshot } from '../services/sync/merge';
import { sendPasswordResetEmail, completePasswordReset } from '../services/sync/passwordReset';

interface AppContextType extends AppState {
  // Sale & Invoice Actions
  createSale: (params: {
    customerId: string;
    items: SaleItem[];
    amountPaid: number;
    paymentMethod: PaymentMethod;
    splitPayments?: SplitPaymentDetail[];
    isZeroGst?: boolean;
    notes?: string;
  }) => { sale: Sale; invoice: Invoice };

  cancelSale: (saleId: string, reason: string) => boolean;

  deleteSale: (saleId: string) => boolean;

  deletePayment: (paymentId: string) => boolean;

  processSalesReturn: (params: {
    saleId: string;
    items: { productId: string; productName: string; quantity: number; unit: string; unitPrice: number; refundAmount: number }[];
    totalRefundAmount: number;
    restockInventory: boolean;
    refundMethod: 'Cash' | 'Credit Note' | 'Bank Transfer' | 'Adjust Balance';
    reason: string;
  }) => SalesReturn | null;

  // Quotation Actions (non-posting rate quotes)
  createQuote: (params: {
    customerId: string;
    items: QuoteItem[];
    validUntil: string;
    notes?: string;
    status?: 'Draft' | 'Sent';
    isZeroGst?: boolean;
  }) => Quote;
  updateQuote: (id: string, quoteData: Partial<Quote>) => void;
  deleteQuote: (id: string) => boolean;
  convertQuoteToSale: (
    quoteId: string,
    params: { amountPaid: number; paymentMethod: PaymentMethod }
  ) => { sale: Sale; invoice: Invoice } | null;

  // Customer Actions
  addCustomer: (customerData: Omit<Customer, 'id' | 'totalPurchases' | 'totalPaid' | 'outstandingBalance' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => void;
  deleteCustomer: (id: string) => boolean;

  // Product & Inventory Actions
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, productData: Partial<Product>, priceChangeReason?: string) => void;
  deleteProduct: (id: string) => boolean;
  adjustStock: (productId: string, quantityChange: number, type: StockMovementType, reason: string) => void;

  // Purchases Actions
  createPurchase: (purchaseData: Omit<Purchase, 'id' | 'purchaseNumber' | 'createdAt' | 'recordedBy'>) => Purchase;
  updatePurchasePayment: (purchaseId: string, amountPaid: number) => void;

  // Payment Actions
  recordPayment: (params: {
    customerId: string;
    invoiceId?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    referenceNo?: string;
    chequeNumber?: string;
    bankName?: string;
    notes?: string;
  }) => Payment;

  // User & Role Management & Auth
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;

  // Cloud sync (Supabase) — owner account login + background entity sync
  cloudSession: CloudSession | null;
  isCloudMode: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  cloudError: string | null;
  cloudLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  cloudSignup: (email: string, password: string, ownerName: string) => Promise<{ success: boolean; error?: string }>;
  cloudSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  cloudCompletePasswordReset: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  syncNow: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => boolean;
  toggleUserStatus: (id: string) => void;
  addRole: (roleData: Omit<RolePermission, 'id'>) => RolePermission;
  updateRole: (id: string, roleData: Partial<RolePermission>) => void;
  deleteRole: (id: string) => boolean;
  hasModuleAccess: (moduleId: string, user?: User) => boolean;
  hasPermission: (permissionKey: keyof RolePermission, user?: User) => boolean;

  // Business & System Settings
  updateBusiness: (businessData: Partial<BusinessProfile>) => void;
  setCurrentUser: (user: User) => void;
  resetToDemoData: () => void;
  importBackupData: (importedState: AppState) => void;

  // Helpers / Queries
  getCustomerById: (id: string) => Customer | undefined;
  getProductById: (id: string) => Product | undefined;
  getSaleById: (id: string) => Sale | undefined;
  getInvoiceById: (id: string) => Invoice | undefined;
  getInvoicesByCustomer: (customerId: string) => Invoice[];
  getPaymentsByCustomer: (customerId: string) => Payment[];
  getSalesByCustomer: (customerId: string) => Sale[];
  getLowStockProducts: () => Product[];

  // Delivery Challan
  createDeliveryChallan: (params: {
    saleId: string;
    vehicleNumber: string;
    driverName: string;
    transportName: string;
    notes?: string;
  }) => any;
  updateChallanStatus: (challanId: string, status: 'Delivered' | 'Returned', receivedBy?: string) => void;
  deliveryChallans: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Ensure backward-compatible defaults for new BusinessProfile fields. */
const migrateBusinessProfile = (biz: BusinessProfile): BusinessProfile => ({
  ...biz,
  nextPaymentNumber: biz.nextPaymentNumber ?? 1,
  nextPurchaseNumber: biz.nextPurchaseNumber ?? 1,
  nextReturnNumber: biz.nextReturnNumber ?? 1,
  nextQuoteNumber: biz.nextQuoteNumber ?? 1,
  businessStateCode: biz.businessStateCode ?? biz.gstin?.substring(0, 2) ?? '27',
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = loadStateFromStorage();
    if (saved && saved.business && saved.products && saved.customers) {
      if (!saved.roles || saved.roles.length === 0) {
        saved.roles = initialRoles;
      }
      // Migrate old roles to include new permission fields
      saved.roles = saved.roles.map((r) => ({
        ...r,
        canDeleteProducts: r.canDeleteProducts ?? false,
        canDeleteSales: r.canDeleteSales ?? false,
        canModifyStock: r.canModifyStock ?? false,
      }));
      // Give any role that already has Sales access the new Quotations module
      saved.roles = saved.roles.map((r) =>
        r.accessibleModules.includes('quotes') || !r.accessibleModules.includes('sales')
          ? r
          : { ...r, accessibleModules: [...r.accessibleModules, 'quotes'] }
      );
      // Give admin all new permissions
      const adminRole = saved.roles.find((r) => r.id === 'role-admin' || r.name.toLowerCase().includes('admin'));
      if (adminRole) {
        adminRole.canDeleteProducts = true;
        adminRole.canDeleteSales = true;
        adminRole.canModifyStock = true;
      }
      saved.business = migrateBusinessProfile(saved.business);
      return saved;
    }
    return getInitialState();
  });

  // Ref to the latest state, so async callbacks can read current values
  const stateRef = useRef(state);
  stateRef.current = state;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('zentra_auth') === 'true';
  });

  // ----------------------------------------------------
  // CLOUD SYNC STATE (Supabase)
  // ----------------------------------------------------
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(() => {
    try {
      const raw = localStorage.getItem('zentra_cloud_session');
      return raw ? (JSON.parse(raw) as CloudSession) : null;
    } catch {
      return null;
    }
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  // Entity references at the time of the last successful cloud sync
  const syncSnapshotRef = useRef<Partial<AppState>>({});
  const pushTimerRef = useRef<number | null>(null);
  const pushBusyRef = useRef(false);
  const isCloudMode = Boolean(isSupabaseConfigured && cloudSession);

  // Sync currency symbol whenever business profile changes
  useEffect(() => {
    setCurrencySymbol(state.business.currencySymbol || '₹');
  }, [state.business.currencySymbol]);

  // Save to localStorage on state changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Listen for localStorage quota-exceeded events
  useEffect(() => {
    const handler = () => {
      toast.error(
        'Storage limit reached! Your recent changes may not be saved. Please export a backup and clear old data.',
        { duration: 10000 }
      );
    };
    window.addEventListener('storage-quota-exceeded', handler);
    return () => window.removeEventListener('storage-quota-exceeded', handler);
  }, []);

  // Restore a previous cloud session silently on load (background pull)
  useEffect(() => {
    if (!isSupabaseConfigured || !cloudSession || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        setSyncStatus('syncing');
        const restored = await restoreCloudSession(cloudSession.ownerEmail);
        if (!restored) {
          if (!cancelled) setSyncStatus('offline');
          return;
        }
        const pulled = await pullCloudState(restored.businessId);
        if (cancelled) return;
        applyPulledState(pulled, restored.ownerEmail);
        setSyncStatus('connected');
        setLastSyncedAt(new Date().toISOString());
        setCloudError(null);
      } catch (e) {
        if (!cancelled) {
          setSyncStatus('error');
          setCloudError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced cloud push: upload only the entities whose array/object changed
  useEffect(() => {
    if (!isSupabaseConfigured || !cloudSession || !isAuthenticated) return;
    const changed = detectChangedKeys(state, syncSnapshotRef.current);
    if (changed.length === 0) return;
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      void runPush();
    }, 2500);
    return () => {
      if (pushTimerRef.current) {
        window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, cloudSession, isAuthenticated]);

  // ----------------------------------------------------
  // AUTH (Fixed: require non-empty password)
  // ----------------------------------------------------
  const login = (identifier: string, password?: string): { success: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both your identifier and password.' };
    }

    const matchedUser = stateRef.current.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.phone && u.phone.includes(identifier.trim())) ||
        u.name.toLowerCase() === cleanId ||
        u.id.toLowerCase() === cleanId
    );

    if (!matchedUser) {
      return { success: false, error: 'User account not found. Please verify your email or mobile number.' };
    }

    if (matchedUser.status === 'Disabled') {
      return {
        success: false,
        error: 'Access Denied: This user account has been disabled by the administrator.',
      };
    }

    // Password is now required — empty password never succeeds
    if (!matchedUser.password || matchedUser.password !== cleanPass) {
      return { success: false, error: 'Incorrect password or security PIN.' };
    }

    setState((prev) => ({ ...prev, currentUser: matchedUser }));
    setIsAuthenticated(true);
    localStorage.setItem('zentra_auth', 'true');
    return { success: true };
  };

  const logout = () => {
    if (cloudSession) {
      void cloudSignOut();
      localStorage.removeItem('zentra_cloud_session');
      setCloudSession(null);
      setSyncStatus('offline');
      setLastSyncedAt(null);
    }
    setIsAuthenticated(false);
    localStorage.removeItem('zentra_auth');
  };

  // ----------------------------------------------------
  // CLOUD SYNC — login, signup, pull, diff push
  // ----------------------------------------------------
  /** Merge pulled cloud data into app state (and remember the synced snapshot). */
  const applyPulledState = (pulled: Partial<AppState>, ownerEmail: string) => {
    // Three-way merge: cloud rows win on conflicts, local-only rows survive
    // (and are pushed up on the next sync), and rows that vanished from the
    // cloud since the last snapshot count as deletions from another device.
    // A pull can therefore never wipe local data that the cloud lacks.
    const merged = mergePulledState(pulled, stateRef.current, syncSnapshotRef.current);
    const users = merged.users || [];
    const ownerUser =
      users.find((u) => u.email.toLowerCase() === ownerEmail.toLowerCase()) ||
      users.find((u) => u.role.toLowerCase().includes('admin')) ||
      users[0] ||
      merged.currentUser;
    merged.currentUser = ownerUser;
    // Snapshot = what the cloud knows, so local-only rows kept above are
    // detected as changes and pushed on the next (debounced) sync.
    syncSnapshotRef.current = pulledSnapshot(pulled);
    setState(merged);
  };

  const cloudLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud sync is not configured on this device (missing .env).' };
    }
    try {
      setSyncStatus('syncing');
      const cleanEmail = email.trim();
      const businessId = await cloudSignIn(cleanEmail, password);
      const pulled = await pullCloudState(businessId);
      applyPulledState(pulled, cleanEmail);
      const session: CloudSession = { businessId, ownerEmail: cleanEmail.toLowerCase() };
      setCloudSession(session);
      localStorage.setItem('zentra_cloud_session', JSON.stringify(session));
      setIsAuthenticated(true);
      localStorage.setItem('zentra_auth', 'true');
      setSyncStatus('connected');
      setLastSyncedAt(new Date().toISOString());
      setCloudError(null);
      return { success: true };
    } catch (e) {
      setSyncStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setCloudError(msg);
      return { success: false, error: msg };
    }
  };

  /** Create the owner cloud account and upload this device's data. */
  const cloudSignup = async (email: string, password: string, ownerName: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud sync is not configured on this device (missing .env).' };
    }
    try {
      setSyncStatus('syncing');
      const cleanEmail = email.trim();
      const session = await cloudSignUp(cleanEmail, password, ownerName.trim(), stateRef.current);
      const pulled = await pullCloudState(session.businessId);
      applyPulledState(pulled, cleanEmail);
      setCloudSession(session);
      localStorage.setItem('zentra_cloud_session', JSON.stringify(session));
      setIsAuthenticated(true);
      localStorage.setItem('zentra_auth', 'true');
      setSyncStatus('connected');
      setLastSyncedAt(new Date().toISOString());
      setCloudError(null);
      return { success: true };
    } catch (e) {
      setSyncStatus('error');
      let msg = e instanceof Error ? e.message : String(e);
      if (msg === 'EMAIL_CONFIRMATION_REQUIRED') {
        msg = 'Check your inbox and confirm your email first, then sign in here.';
      }
      setCloudError(msg);
      return { success: false, error: msg };
    }
  };

  /** Send the cloud-account password reset email. */
  const cloudSendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud sync is not configured on this device (missing .env).' };
    }
    try {
      await sendPasswordResetEmail(email);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  /** Finish password recovery: set the new password, then sign in and pull. */
  const cloudCompletePasswordReset = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Cloud sync is not configured on this device (missing .env).' };
    }
    try {
      setSyncStatus('syncing');
      const session = await completePasswordReset(newPassword);
      const pulled = await pullCloudState(session.businessId);
      applyPulledState(pulled, session.ownerEmail);
      setCloudSession(session);
      localStorage.setItem('zentra_cloud_session', JSON.stringify(session));
      setIsAuthenticated(true);
      localStorage.setItem('zentra_auth', 'true');
      setSyncStatus('connected');
      setLastSyncedAt(new Date().toISOString());
      setCloudError(null);
      return { success: true };
    } catch (e) {
      setSyncStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setCloudError(msg);
      return { success: false, error: msg };
    }
  };

  /** Push whatever changed since the last successful sync. */
  const runPush = async (): Promise<void> => {
    if (!isSupabaseConfigured || !cloudSession || pushBusyRef.current) return;
    pushBusyRef.current = true;
    setSyncStatus('syncing');
    try {
      const stateAtPush = stateRef.current;
      const changed = detectChangedKeys(stateAtPush, syncSnapshotRef.current);
      if (changed.length > 0) {
        await pushEntities(stateAtPush, changed, syncSnapshotRef.current, cloudSession.businessId);
        syncSnapshotRef.current = buildSnapshot(stateAtPush);
      }
      setSyncStatus('connected');
      setLastSyncedAt(new Date().toISOString());
      setCloudError(null);
    } catch (e) {
      setSyncStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setCloudError(msg);
      toast.error('Cloud sync failed — your changes are safe on this device and will retry.');
    } finally {
      pushBusyRef.current = false;
    }
  };

  /** Manual full pull (download cloud data over local data). */
  const pullFromCloud = async (): Promise<void> => {
    if (!cloudSession) return;
    setSyncStatus('syncing');
    try {
      const pulled = await pullCloudState(cloudSession.businessId);
      applyPulledState(pulled, cloudSession.ownerEmail);
      setSyncStatus('connected');
      setLastSyncedAt(new Date().toISOString());
      setCloudError(null);
    } catch (e) {
      setSyncStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      setCloudError(msg);
    }
  };

  const addAuditLog = (
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: generateId('log'),
      action,
      entityType,
      entityId,
      details,
      performedBy: `${stateRef.current.currentUser.name} (${stateRef.current.currentUser.role})`,
      timestamp: new Date().toISOString(),
    };
    return newLog;
  };

  // ----------------------------------------------------
  // PERMISSION & ROLE ACCESS HELPERS
  // ----------------------------------------------------
  const getRoleForUser = (user?: User): RolePermission | undefined => {
    const targetUser = user || stateRef.current.currentUser;
    let matched = stateRef.current.roles.find((r) => r.id === targetUser.roleId);
    if (matched) return matched;

    matched = stateRef.current.roles.find((r) => r.name.toLowerCase() === (targetUser.role || '').toLowerCase());
    if (matched) return matched;

    matched = stateRef.current.roles.find(
      (r) =>
        r.name.toLowerCase().includes((targetUser.role || '').toLowerCase()) ||
        (targetUser.role || '').toLowerCase().includes(r.name.toLowerCase())
    );

    return matched || stateRef.current.roles[0];
  };

  const hasModuleAccess = (moduleId: string, user?: User): boolean => {
    const targetUser = user || stateRef.current.currentUser;
    if (targetUser.status === 'Disabled') return false;
    const role = getRoleForUser(targetUser);
    if (!role) return false;
    return role.accessibleModules.includes(moduleId);
  };

  const hasPermission = (permissionKey: keyof RolePermission, user?: User): boolean => {
    const targetUser = user || stateRef.current.currentUser;
    if (targetUser.status === 'Disabled') return false;
    const role = getRoleForUser(targetUser);
    if (!role) return false;
    return Boolean(role[permissionKey]);
  };

  /** Detect inter-state supply for GST type (IGST vs CGST+SGST). */
  const detectInterState = (customer: Customer): boolean => {
    const biz = stateRef.current.business;
    // Compare GSTIN state codes (first 2 digits)
    if (customer.gstin && customer.gstin.length >= 2) {
      return customer.gstin.substring(0, 2) !== biz.businessStateCode;
    }
    // Fallback: compare state names
    if (customer.state && biz.state) {
      return customer.state.toLowerCase() !== biz.state.toLowerCase();
    }
    return false;
  };

  // ----------------------------------------------------
  // 1. CREATE SALE (Fixed: stock validation, inter-state, prev-based updates, generateId)
  // ----------------------------------------------------
  const createSale = (params: {
    customerId: string;
    items: SaleItem[];
    amountPaid: number;
    paymentMethod: PaymentMethod;
    splitPayments?: SplitPaymentDetail[];
    isZeroGst?: boolean;
    notes?: string;
  }) => {
    const customer = stateRef.current.customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Customer not found');

    // --- Stock validation: prevent overselling ---
    for (const item of params.items) {
      const product = stateRef.current.products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product not found: ${item.productName}`);
      if (product.currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.currentStock} ${product.unit}, Requested: ${item.quantity} ${product.unit}`
        );
      }
    }

    const isInterState = detectInterState(customer);
    const totals = calculateSaleTotals(params.items, isInterState);
    const invoiceNum = `${stateRef.current.business.invoicePrefix}${stateRef.current.business.nextInvoiceNumber}`;
    const saleId = generateId('sale');
    const nowIso = new Date().toISOString();

    const balanceDue = Math.max(0, totals.grandTotal - params.amountPaid);
    let paymentStatus: Sale['paymentStatus'] = 'Pending';
    if (params.amountPaid >= totals.grandTotal) {
      paymentStatus = 'Paid';
    } else if (params.amountPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    const newSale: Sale = {
      id: saleId,
      invoiceNumber: invoiceNum,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address ? `${customer.address}, ${customer.city}` : '',
      customerGstin: customer.gstin,
      date: nowIso,
      items: params.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      amountPaid: params.amountPaid,
      balanceDue,
      paymentStatus,
      paymentMethod: params.paymentMethod,
      splitPayments: params.splitPayments,
      isZeroGst: Boolean(params.isZeroGst),
      isInterState,
      employeeName: stateRef.current.currentUser.name,
      notes: params.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newInvoice: Invoice = {
      id: generateId('inv'),
      invoiceNumber: invoiceNum,
      saleId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address ? `${customer.address}, ${customer.city}` : '',
      customerGstin: customer.gstin,
      date: nowIso,
      dueDate: new Date(Date.now() + (customer.paymentTermsDays || 15) * 86400000).toISOString(),
      items: params.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      amountPaid: params.amountPaid,
      balanceDue,
      paymentStatus,
      isZeroGst: Boolean(params.isZeroGst),
      isInterState,
      terms: stateRef.current.business.invoiceTerms,
      createdAt: nowIso,
    };

    const auditLog = addAuditLog(
      'SALE_CREATED',
      'Sale',
      invoiceNum,
      `Generated Invoice ${invoiceNum} for ${totals.grandTotal}${params.isZeroGst ? ' (0% GST)' : ''} to ${customer.name}`
    );

    // Compute all updates inside setState(prev => ...) to avoid stale state
    setState((prev) => {
      // Update product stocks & generate stock movements
      const newStockMovements: StockMovement[] = [];
      const updatedProducts = prev.products.map((prod) => {
        const soldItem = params.items.find((it) => it.productId === prod.id);
        if (!soldItem) return prod;

        const previousStock = prod.currentStock;
        const newStock = Math.max(0, prod.currentStock - soldItem.quantity);

        newStockMovements.push({
          id: generateId('sm'),
          productId: prod.id,
          productName: prod.name,
          type: 'Sale' as const,
          quantity: -soldItem.quantity,
          previousStock,
          newStock,
          referenceId: invoiceNum,
          reason: `Sale to ${customer.name}`,
          createdBy: prev.currentUser.name,
          createdAt: nowIso,
        });

        return { ...prod, currentStock: newStock, updatedAt: nowIso };
      });

      // Update customer CRM figures
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== customer.id) return c;
        return {
          ...c,
          totalPurchases: c.totalPurchases + totals.grandTotal,
          totalPaid: c.totalPaid + params.amountPaid,
          outstandingBalance: c.outstandingBalance + balanceDue,
          updatedAt: nowIso,
        };
      });

      // Create payment record if money was collected
      const newPayments = [...prev.payments];
      if (params.amountPaid > 0) {
        newPayments.unshift({
          id: generateId('pay'),
          paymentNumber: `RCP-${new Date().getFullYear()}-${String(prev.business.nextPaymentNumber).padStart(3, '0')}`,
          invoiceId: newInvoice.id,
          invoiceNumber: invoiceNum,
          saleId,
          customerId: customer.id,
          customerName: customer.name,
          amount: params.amountPaid,
          paymentDate: nowIso,
          paymentMethod: params.paymentMethod,
          referenceNo: params.notes || 'POS Checkout Payment',
          recordedBy: prev.currentUser.name,
          createdAt: nowIso,
        });
      }

      return {
        ...prev,
        business: {
          ...prev.business,
          nextInvoiceNumber: prev.business.nextInvoiceNumber + 1,
          nextPaymentNumber: params.amountPaid > 0 ? prev.business.nextPaymentNumber + 1 : prev.business.nextPaymentNumber,
        },
        sales: [newSale, ...prev.sales],
        invoices: [newInvoice, ...prev.invoices],
        products: updatedProducts,
        customers: updatedCustomers,
        payments: newPayments,
        stockMovements: [...newStockMovements, ...prev.stockMovements],
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    return { sale: newSale, invoice: newInvoice };
  };

  // ----------------------------------------------------
  // 2. CANCEL SALE (Fixed: prev-based updates, generateId)
  // ----------------------------------------------------
  const cancelSale = (saleId: string, reason: string): boolean => {
    const sale = stateRef.current.sales.find((s) => s.id === saleId);
    if (!sale || sale.paymentStatus === 'Cancelled') return false;

    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'SALE_CANCELLED',
      'Sale',
      sale.invoiceNumber,
      `Cancelled Invoice ${sale.invoiceNumber}. Reason: ${reason}`
    );

    setState((prev) => {
      const newStockMovements: StockMovement[] = [];
      const updatedProducts = prev.products.map((prod) => {
        const item = sale.items.find((it) => it.productId === prod.id);
        if (!item) return prod;

        const previousStock = prod.currentStock;
        const newStock = prod.currentStock + item.quantity;

        newStockMovements.push({
          id: generateId('sm'),
          productId: prod.id,
          productName: prod.name,
          type: 'Adjustment' as const,
          quantity: item.quantity,
          previousStock,
          newStock,
          referenceId: sale.invoiceNumber,
          reason: `Reversal on Sale Cancellation (${sale.invoiceNumber}): ${reason}`,
          createdBy: prev.currentUser.name,
          createdAt: nowIso,
        });

        return { ...prod, currentStock: newStock, updatedAt: nowIso };
      });

      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== sale.customerId) return c;
        return {
          ...c,
          totalPurchases: Math.max(0, c.totalPurchases - sale.grandTotal),
          totalPaid: Math.max(0, c.totalPaid - sale.amountPaid),
          outstandingBalance: Math.max(0, c.outstandingBalance - sale.balanceDue),
          updatedAt: nowIso,
        };
      });

      const updatedSales = prev.sales.map((s) =>
        s.id === saleId
          ? { ...s, paymentStatus: 'Cancelled' as const, cancellationReason: reason, updatedAt: nowIso }
          : s
      );

      const updatedInvoices = prev.invoices.map((inv) =>
        inv.saleId === saleId
          ? { ...inv, paymentStatus: 'Cancelled' as const }
          : inv
      );

      return {
        ...prev,
        sales: updatedSales,
        invoices: updatedInvoices,
        products: updatedProducts,
        customers: updatedCustomers,
        stockMovements: [...newStockMovements, ...prev.stockMovements],
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    return true;
  };

  // ----------------------------------------------------
  // 2b. DELETE SALE (Permanent removal with stock reversal)
  // ----------------------------------------------------
  const deleteSale = (saleId: string): boolean => {
    const sale = stateRef.current.sales.find((s) => s.id === saleId);
    if (!sale) return false;

    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'SALE_DELETED',
      'Sale',
      sale.invoiceNumber,
      `Permanently deleted sale ${sale.invoiceNumber} for ${sale.customerName}`
    );

    setState((prev) => {
      // Revert product stocks (restock items)
      const newStockMovements: StockMovement[] = [];
      const updatedProducts = prev.products.map((prod) => {
        const item = sale.items.find((it) => it.productId === prod.id);
        if (!item) return prod;
        const previousStock = prod.currentStock;
        const newStock = prod.currentStock + item.quantity;
        newStockMovements.push({
          id: generateId('sm'),
          productId: prod.id,
          productName: prod.name,
          type: 'Adjustment' as const,
          quantity: item.quantity,
          previousStock,
          newStock,
          referenceId: sale.invoiceNumber,
          reason: `Stock reversal on sale deletion (${sale.invoiceNumber})`,
          createdBy: prev.currentUser.name,
          createdAt: nowIso,
        });
        return { ...prod, currentStock: newStock, updatedAt: nowIso };
      });

      // Revert customer balances
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== sale.customerId) return c;
        return {
          ...c,
          totalPurchases: Math.max(0, c.totalPurchases - sale.grandTotal),
          totalPaid: Math.max(0, c.totalPaid - sale.amountPaid),
          outstandingBalance: Math.max(0, c.outstandingBalance - sale.balanceDue),
          updatedAt: nowIso,
        };
      });

      // Remove the sale, its invoice, and linked payments
      const updatedSales = prev.sales.filter((s) => s.id !== saleId);
      const updatedInvoices = prev.invoices.filter((inv) => inv.saleId !== saleId);
      const updatedPayments = prev.payments.filter((p) => p.saleId !== saleId);

      return {
        ...prev,
        sales: updatedSales,
        invoices: updatedInvoices,
        payments: updatedPayments,
        products: updatedProducts,
        customers: updatedCustomers,
        stockMovements: [...newStockMovements, ...prev.stockMovements],
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    return true;
  };

  // ----------------------------------------------------
  // 2c. DELETE PAYMENT
  // ----------------------------------------------------
  const deletePayment = (paymentId: string): boolean => {
    const payment = stateRef.current.payments.find((p) => p.id === paymentId);
    if (!payment) return false;

    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'PAYMENT_DELETED',
      'Payment',
      payment.paymentNumber,
      `Deleted payment ${payment.paymentNumber} of ${payment.amount} from ${payment.customerName}`
    );

    setState((prev) => {
      // Revert customer ledger
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== payment.customerId) return c;
        return {
          ...c,
          totalPaid: Math.max(0, c.totalPaid - payment.amount),
          outstandingBalance: c.outstandingBalance + payment.amount,
          updatedAt: nowIso,
        };
      });

      // Revert linked invoice/sale balances
      let updatedInvoices = prev.invoices;
      let updatedSales = prev.sales;
      if (payment.invoiceId) {
        updatedInvoices = prev.invoices.map((inv) => {
          if (inv.id !== payment.invoiceId) return inv;
          const newPaid = Math.max(0, inv.amountPaid - payment.amount);
          const newBalance = inv.grandTotal - newPaid;
          const status = newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
          return { ...inv, amountPaid: newPaid, balanceDue: newBalance, paymentStatus: status as any };
        });
      }
      if (payment.saleId) {
        updatedSales = prev.sales.map((s) => {
          if (s.id !== payment.saleId) return s;
          const newPaid = Math.max(0, s.amountPaid - payment.amount);
          const newBalance = s.grandTotal - newPaid;
          const status = newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
          return { ...s, amountPaid: newPaid, balanceDue: newBalance, paymentStatus: status as Sale['paymentStatus'], updatedAt: nowIso };
        });
      }

      return {
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
        customers: updatedCustomers,
        invoices: updatedInvoices,
        sales: updatedSales,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });

    return true;
  };

  // ----------------------------------------------------
  // 3. PROCESS SALES RETURN (Fixed: prev-based, reconcile sale/invoice, generateId, monotonic numbering)
  // ----------------------------------------------------
  const processSalesReturn = (params: {
    saleId: string;
    items: { productId: string; productName: string; quantity: number; unit: string; unitPrice: number; refundAmount: number }[];
    totalRefundAmount: number;
    restockInventory: boolean;
    refundMethod: 'Cash' | 'Credit Note' | 'Bank Transfer' | 'Adjust Balance';
    reason: string;
  }): SalesReturn | null => {
    const sale = stateRef.current.sales.find((s) => s.id === params.saleId);
    if (!sale) return null;

    const returnId = generateId('ret');
    const nowIso = new Date().toISOString();

    const newReturn: SalesReturn = {
      id: returnId,
      returnNumber: '', // set inside setState using prev
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: nowIso,
      items: params.items,
      totalRefundAmount: params.totalRefundAmount,
      restockInventory: params.restockInventory,
      refundMethod: params.refundMethod,
      reason: params.reason,
      processedBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
    };

    const auditLog = addAuditLog(
      'SALES_RETURN',
      'Sale',
      sale.invoiceNumber,
      `Processed Sales Return for ${sale.invoiceNumber}, Refund: ${params.totalRefundAmount}`
    );

    setState((prev) => {
      const returnNumber = `RET-${new Date().getFullYear()}-${String(prev.business.nextReturnNumber).padStart(3, '0')}`;
      newReturn.returnNumber = returnNumber;

      // Restock items if requested
      const newStockMovements: StockMovement[] = [];
      let updatedProducts = prev.products;
      if (params.restockInventory) {
        updatedProducts = prev.products.map((prod) => {
          const retItem = params.items.find((it) => it.productId === prod.id);
          if (!retItem) return prod;

          const previousStock = prod.currentStock;
          const newStock = prod.currentStock + retItem.quantity;

          newStockMovements.push({
            id: generateId('sm'),
            productId: prod.id,
            productName: prod.name,
            type: 'Return' as const,
            quantity: retItem.quantity,
            previousStock,
            newStock,
            referenceId: returnNumber,
            reason: `Sales return against ${sale.invoiceNumber}: ${params.reason}`,
            createdBy: prev.currentUser.name,
            createdAt: nowIso,
          });

          return { ...prod, currentStock: newStock, updatedAt: nowIso };
        });
      }

      // Adjust customer balance for credit-note / adjust-balance refunds
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== sale.customerId) return c;
        const balanceAdjust =
          params.refundMethod === 'Credit Note' || params.refundMethod === 'Adjust Balance'
            ? params.totalRefundAmount
            : 0;
        return {
          ...c,
          outstandingBalance: Math.max(0, c.outstandingBalance - balanceAdjust),
          totalPurchases: Math.max(0, c.totalPurchases - params.totalRefundAmount),
          updatedAt: nowIso,
        };
      });

      // --- Reconcile the original sale and invoice ---
      const updatedSales = prev.sales.map((s) => {
        if (s.id !== sale.id) return s;
        const newGrandTotal = Math.max(0, s.grandTotal - params.totalRefundAmount);
        const newBalanceDue = Math.max(0, newGrandTotal - s.amountPaid);
        const newStatus: Sale['paymentStatus'] =
          newGrandTotal === 0 ? 'Refunded' : newBalanceDue === 0 ? 'Paid' : s.paymentStatus;
        return {
          ...s,
          grandTotal: newGrandTotal,
          balanceDue: newBalanceDue,
          paymentStatus: newStatus,
          updatedAt: nowIso,
        };
      });

      const updatedInvoices = prev.invoices.map((inv) => {
        if (inv.saleId !== sale.id) return inv;
        const newGrandTotal = Math.max(0, inv.grandTotal - params.totalRefundAmount);
        const newBalanceDue = Math.max(0, newGrandTotal - inv.amountPaid);
        const newStatus: Invoice['paymentStatus'] =
          newGrandTotal === 0 ? 'Refunded' : newBalanceDue === 0 ? 'Paid' : inv.paymentStatus;
        return {
          ...inv,
          grandTotal: newGrandTotal,
          balanceDue: newBalanceDue,
          paymentStatus: newStatus,
        };
      });

      return {
        ...prev,
        salesReturns: [{ ...newReturn, returnNumber }, ...prev.salesReturns],
        products: updatedProducts,
        customers: updatedCustomers,
        sales: updatedSales,
        invoices: updatedInvoices,
        stockMovements: [...newStockMovements, ...prev.stockMovements],
        auditLogs: [auditLog, ...prev.auditLogs],
        business: { ...prev.business, nextReturnNumber: prev.business.nextReturnNumber + 1 },
      };
    });

    return newReturn;
  };

  // ----------------------------------------------------
  // 3b. QUOTATIONS (non-posting rate quotes — never touch stock or khata)
  // ----------------------------------------------------
  const createQuote = (params: {
    customerId: string;
    items: QuoteItem[];
    validUntil: string;
    notes?: string;
    status?: 'Draft' | 'Sent';
    isZeroGst?: boolean;
  }): Quote => {
    const customer = stateRef.current.customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Customer not found');

    const isInterState = detectInterState(customer);
    const totals = calculateSaleTotals(params.items, isInterState);
    const quoteId = generateId('quote');
    const quoteNum = `QTN-${new Date().getFullYear()}-${String(stateRef.current.business.nextQuoteNumber ?? 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newQuote: Quote = {
      id: quoteId,
      quoteNumber: quoteNum,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address ? `${customer.address}, ${customer.city}` : '',
      customerGstin: customer.gstin,
      date: nowIso,
      validUntil: params.validUntil,
      items: params.items,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      status: params.status || 'Draft',
      isZeroGst: Boolean(params.isZeroGst),
      isInterState,
      notes: params.notes,
      createdBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const auditLog = addAuditLog(
      'QUOTE_CREATED',
      'Quote',
      quoteNum,
      `Created quotation ${quoteNum} for ${totals.grandTotal} for ${customer.name}`
    );

    setState((prev) => ({
      ...prev,
      quotes: [newQuote, ...(prev.quotes ?? [])],
      auditLogs: [auditLog, ...prev.auditLogs],
      business: { ...prev.business, nextQuoteNumber: (prev.business.nextQuoteNumber ?? 1) + 1 },
    }));

    return newQuote;
  };

  const updateQuote = (id: string, quoteData: Partial<Quote>) => {
    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'QUOTE_UPDATED',
      'Quote',
      id,
      quoteData.status
        ? `Quotation marked as ${quoteData.status}`
        : `Updated quotation details`
    );
    setState((prev) => ({
      ...prev,
      quotes: (prev.quotes ?? []).map((q) => (q.id === id ? { ...q, ...quoteData, updatedAt: nowIso } : q)),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  const deleteQuote = (id: string): boolean => {
    const quote = (stateRef.current.quotes ?? []).find((q) => q.id === id);
    if (!quote) return false;

    const auditLog = addAuditLog(
      'QUOTE_DELETED',
      'Quote',
      quote.quoteNumber,
      `Deleted quotation ${quote.quoteNumber} for ${quote.customerName}`
    );
    setState((prev) => ({
      ...prev,
      quotes: (prev.quotes ?? []).filter((q) => q.id !== id),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
    return true;
  };

  /** Turn an accepted quote into a real sale (full pipeline: stock check, invoice, khata). */
  const convertQuoteToSale = (
    quoteId: string,
    params: { amountPaid: number; paymentMethod: PaymentMethod }
  ): { sale: Sale; invoice: Invoice } | null => {
    const quote = (stateRef.current.quotes ?? []).find((q) => q.id === quoteId);
    if (!quote || quote.status === 'Converted') return null;

    // Reuse the complete sale pipeline (stock validation, invoice, payment, khata)
    const { sale, invoice } = createSale({
      customerId: quote.customerId,
      items: quote.items,
      amountPaid: params.amountPaid,
      paymentMethod: params.paymentMethod,
      isZeroGst: quote.isZeroGst,
      notes: quote.notes ? `From quote ${quote.quoteNumber}. ${quote.notes}` : `From quote ${quote.quoteNumber}`,
    });

    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'QUOTE_CONVERTED',
      'Quote',
      quote.quoteNumber,
      `Converted quote ${quote.quoteNumber} into invoice ${sale.invoiceNumber}`
    );

    setState((prev) => ({
      ...prev,
      quotes: (prev.quotes ?? []).map((q) =>
        q.id === quoteId
          ? { ...q, status: 'Converted' as const, convertedSaleId: sale.id, updatedAt: nowIso }
          : q
      ),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return { sale, invoice };
  };

  // ----------------------------------------------------
  // 4. RECORD PAYMENT (Fixed: prev-based, overpayment validation, generateId, monotonic numbering)
  // ----------------------------------------------------
  const recordPayment = (params: {
    customerId: string;
    invoiceId?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    referenceNo?: string;
    chequeNumber?: string;
    bankName?: string;
    notes?: string;
  }): Payment => {
    const customer = stateRef.current.customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Customer not found');

    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const nowIso = new Date().toISOString();

    // Determine invoice linkage
    let invNum: string | undefined;
    let saleId: string | undefined;
    let invoiceBalance = Infinity;

    if (params.invoiceId) {
      const inv = stateRef.current.invoices.find((i) => i.id === params.invoiceId);
      if (inv) {
        invNum = inv.invoiceNumber;
        saleId = inv.saleId;
        invoiceBalance = inv.balanceDue;
      }
    }

    // Cap payment at the invoice balance to prevent overpayment
    let effectiveAmount = params.amount;
    if (params.invoiceId && invoiceBalance !== Infinity && effectiveAmount > invoiceBalance) {
      effectiveAmount = invoiceBalance;
      toast.warning(
        `Payment capped at ${invoiceBalance.toFixed(2)} (invoice balance). Excess of ${(params.amount - invoiceBalance).toFixed(2)} was not applied.`,
        { duration: 6000 }
      );
    }

    const paymentId = generateId('pay');
    const auditLog = addAuditLog(
      'PAYMENT_RECORDED',
      'Payment',
      paymentId,
      `Received payment of ${effectiveAmount} from ${customer.name} via ${params.paymentMethod}${invNum ? ` for Invoice ${invNum}` : ''}`
    );

    // Build the payment record using stateRef for display fields
    const newPayment: Payment = {
      id: paymentId,
      paymentNumber: '', // set inside setState using prev
      invoiceId: params.invoiceId,
      invoiceNumber: invNum,
      saleId,
      customerId: customer.id,
      customerName: customer.name,
      amount: effectiveAmount,
      paymentDate: params.paymentDate || nowIso,
      paymentMethod: params.paymentMethod,
      referenceNo: params.referenceNo,
      chequeNumber: params.chequeNumber,
      bankName: params.bankName,
      notes: params.notes,
      recordedBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
    };

    setState((prev) => {
      const paymentNumber = `RCP-${new Date().getFullYear()}-${String(prev.business.nextPaymentNumber).padStart(3, '0')}`;
      newPayment.paymentNumber = paymentNumber;

      // Update customer ledger
      const updatedCustomers = prev.customers.map((c) => {
        if (c.id !== customer.id) return c;
        return {
          ...c,
          totalPaid: c.totalPaid + effectiveAmount,
          outstandingBalance: Math.max(0, c.outstandingBalance - effectiveAmount),
          updatedAt: nowIso,
        };
      });

      // Update linked invoice and sale
      let updatedInvoices = prev.invoices;
      let updatedSales = prev.sales;

      if (params.invoiceId) {
        updatedInvoices = prev.invoices.map((inv) => {
          if (inv.id !== params.invoiceId) return inv;
          const newPaid = inv.amountPaid + effectiveAmount;
          const newBalance = Math.max(0, inv.grandTotal - newPaid);
          const status: 'Paid' | 'Partially Paid' | 'Pending' =
            newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
          return { ...inv, amountPaid: newPaid, balanceDue: newBalance, paymentStatus: status };
        });

        if (saleId) {
          updatedSales = prev.sales.map((s) => {
            if (s.id !== saleId) return s;
            const newPaid = s.amountPaid + effectiveAmount;
            const newBalance = Math.max(0, s.grandTotal - newPaid);
            const status: Sale['paymentStatus'] =
              newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
            return { ...s, amountPaid: newPaid, balanceDue: newBalance, paymentStatus: status, updatedAt: nowIso };
          });
        }
      }

      return {
        ...prev,
        payments: [{ ...newPayment, paymentNumber }, ...prev.payments],
        customers: updatedCustomers,
        invoices: updatedInvoices,
        sales: updatedSales,
        auditLogs: [auditLog, ...prev.auditLogs],
        business: { ...prev.business, nextPaymentNumber: prev.business.nextPaymentNumber + 1 },
      };
    });

    return newPayment;
  };

  // ----------------------------------------------------
  // 5. CUSTOMER CRUD (Fixed: generateId)
  // ----------------------------------------------------
  const addCustomer = (
    customerData: Omit<Customer, 'id' | 'totalPurchases' | 'totalPaid' | 'outstandingBalance' | 'createdAt' | 'updatedAt'>
  ): Customer => {
    const newCust: Customer = {
      ...customerData,
      id: generateId('cust'),
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: customerData.openingBalance || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const auditLog = addAuditLog(
      'CUSTOMER_CREATED',
      'Customer',
      newCust.id,
      `Added customer: ${newCust.name} (${newCust.phone})`
    );

    setState((prev) => ({
      ...prev,
      customers: [newCust, ...prev.customers],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return newCust;
  };

  const updateCustomer = (id: string, customerData: Partial<Customer>) => {
    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog('CUSTOMER_UPDATED', 'Customer', id, `Updated profile for customer: ${customerData.name || id}`);
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === id ? { ...c, ...customerData, updatedAt: nowIso } : c)),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  const deleteCustomer = (id: string): boolean => {
    const customer = stateRef.current.customers.find((c) => c.id === id);
    if (!customer) return false;

    const auditLog = addAuditLog('CUSTOMER_DELETED', 'Customer', id, `Deleted customer: ${customer.name}`);
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
    return true;
  };

  // ----------------------------------------------------
  // 6. PRODUCT & INVENTORY CRUD (Fixed: generateId)
  // ----------------------------------------------------
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const nowIso = new Date().toISOString();
    const newProd: Product = {
      ...productData,
      id: generateId('prod'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const initialMovement: StockMovement | null =
      newProd.currentStock > 0
        ? {
            id: generateId('sm'),
            productId: newProd.id,
            productName: newProd.name,
            type: 'Adjustment',
            quantity: newProd.currentStock,
            previousStock: 0,
            newStock: newProd.currentStock,
            reason: 'Opening stock entry',
            createdBy: stateRef.current.currentUser.name,
            createdAt: nowIso,
          }
        : null;

    const auditLog = addAuditLog(
      'PRODUCT_CREATED',
      'Product',
      newProd.id,
      `Created product: ${newProd.name} (SKU: ${newProd.sku}, Stock: ${newProd.currentStock} ${newProd.unit})`
    );

    setState((prev) => ({
      ...prev,
      products: [newProd, ...prev.products],
      stockMovements: initialMovement ? [initialMovement, ...prev.stockMovements] : prev.stockMovements,
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return newProd;
  };

  const updateProduct = (id: string, productData: Partial<Product>, priceChangeReason?: string) => {
    const prod = stateRef.current.products.find((p) => p.id === id);
    if (!prod) return;

    const nowIso = new Date().toISOString();
    const newPriceHistories: PriceHistory[] = [];

    if (productData.sellingPrice !== undefined && productData.sellingPrice !== prod.sellingPrice) {
      newPriceHistories.push({
        id: generateId('ph'),
        productId: id,
        productName: prod.name,
        oldPrice: prod.sellingPrice,
        newPrice: productData.sellingPrice,
        priceType: 'retail',
        changedBy: stateRef.current.currentUser.name,
        changedAt: nowIso,
        reason: priceChangeReason || 'Price updated in catalog',
      });
    }
    if (productData.wholesalePrice !== undefined && productData.wholesalePrice !== prod.wholesalePrice) {
      newPriceHistories.push({
        id: generateId('ph'),
        productId: id,
        productName: prod.name,
        oldPrice: prod.wholesalePrice,
        newPrice: productData.wholesalePrice,
        priceType: 'wholesale',
        changedBy: stateRef.current.currentUser.name,
        changedAt: nowIso,
        reason: priceChangeReason || 'Wholesale tier update',
      });
    }

    const auditLog = addAuditLog(
      'PRODUCT_UPDATED',
      'Product',
      id,
      `Updated product: ${prod.name}${priceChangeReason ? ` (Note: ${priceChangeReason})` : ''}`
    );

    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...productData, updatedAt: nowIso } : p)),
      priceHistories: [...newPriceHistories, ...prev.priceHistories],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  const deleteProduct = (id: string): boolean => {
    const prod = stateRef.current.products.find((p) => p.id === id);
    if (!prod) return false;

    const auditLog = addAuditLog('PRODUCT_DELETED', 'Product', id, `Deleted product: ${prod.name}`);
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
    return true;
  };

  const adjustStock = (productId: string, quantityChange: number, type: StockMovementType, reason: string) => {
    const prod = stateRef.current.products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.currentStock;
    const newStock = Math.max(0, prod.currentStock + quantityChange);
    const nowIso = new Date().toISOString();

    const movement: StockMovement = {
      id: generateId('sm'),
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: quantityChange,
      previousStock,
      newStock,
      reason,
      createdBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
    };

    const auditLog = addAuditLog(
      'STOCK_ADJUSTMENT',
      'Inventory',
      productId,
      `Adjusted stock for ${prod.name}: ${previousStock} ➔ ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange} ${prod.unit}). Reason: ${reason}`
    );

    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? { ...p, currentStock: newStock, updatedAt: nowIso } : p)),
      stockMovements: [movement, ...prev.stockMovements],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  // ----------------------------------------------------
  // 7. PURCHASES / STOCK IN (Fixed: prev-based, generateId, monotonic numbering)
  // ----------------------------------------------------
  const createPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'purchaseNumber' | 'createdAt' | 'recordedBy'>
  ): Purchase => {
    const purchaseId = generateId('pur');
    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog(
      'PURCHASE_ENTRY',
      'Purchase',
      purchaseId,
      `Recorded purchase bill from ${purchaseData.supplierName} for ${purchaseData.totalAmount}`
    );

    const newPurchase: Purchase = {
      ...purchaseData,
      id: purchaseId,
      purchaseNumber: '', // set inside setState
      recordedBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
    };

    setState((prev) => {
      const purchaseNumber = `PUR-${new Date().getFullYear()}-${String(prev.business.nextPurchaseNumber).padStart(3, '0')}`;
      newPurchase.purchaseNumber = purchaseNumber;

      const newStockMovements: StockMovement[] = [];
      const updatedProducts = prev.products.map((prod) => {
        const purItem = purchaseData.items.find((it) => it.productId === prod.id);
        if (!purItem) return prod;

        const previousStock = prod.currentStock;
        const newStock = prod.currentStock + purItem.quantity;

        newStockMovements.push({
          id: generateId('sm'),
          productId: prod.id,
          productName: prod.name,
          type: 'Purchase' as const,
          quantity: purItem.quantity,
          previousStock,
          newStock,
          referenceId: purchaseNumber,
          reason: `Purchase from ${purchaseData.supplierName} (Vendor Inv: ${purchaseData.vendorInvoiceNo})`,
          createdBy: prev.currentUser.name,
          createdAt: nowIso,
        });

        return { ...prod, currentStock: newStock, purchasePrice: purItem.purchasePrice, updatedAt: nowIso };
      });

      return {
        ...prev,
        purchases: [{ ...newPurchase, purchaseNumber }, ...prev.purchases],
        products: updatedProducts,
        stockMovements: [...newStockMovements, ...prev.stockMovements],
        auditLogs: [auditLog, ...prev.auditLogs],
        business: { ...prev.business, nextPurchaseNumber: prev.business.nextPurchaseNumber + 1 },
      };
    });

    return newPurchase;
  };

  // Update payment for a purchase (for partially paid or pending purchases)
  const updatePurchasePayment = (purchaseId: string, amountPaid: number) => {
    setState((prev) => {
      const purchase = prev.purchases.find((p) => p.id === purchaseId);
      if (!purchase) return prev;

      const newAmountPaid = amountPaid;
      const balance = purchase.totalAmount - newAmountPaid;
      const newStatus: 'Paid' | 'Partially Paid' | 'Pending' =
        balance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partially Paid' : 'Pending';

      const auditLog = addAuditLog(
        'PAYMENT_RECORDED',
        'Purchase',
        purchaseId,
        `Updated payment for ${purchase.supplierName} - Paid: ${newAmountPaid}/${purchase.totalAmount}`
      );

      return {
        ...prev,
        purchases: prev.purchases.map((p) =>
          p.id === purchaseId
            ? { ...p, amountPaid: newAmountPaid, paymentStatus: newStatus }
            : p
        ),
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  // ----------------------------------------------------
  // 8. USER & ROLE MANAGEMENT (Fixed: generateId, toast instead of alert)
  // ----------------------------------------------------
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const newUser: User = {
      ...userData,
      id: generateId('user'),
      createdAt: new Date().toISOString(),
    };

    const auditLog = addAuditLog('USER_CREATED', 'User', newUser.id, `Created user ${newUser.name} with role ${newUser.role}`);
    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return newUser;
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    const auditLog = addAuditLog('USER_UPDATED', 'User', id, `Updated user profile: ${userData.name || id}`);
    setState((prev) => {
      const updatedUsers = prev.users.map((u) => (u.id === id ? { ...u, ...userData } : u));
      let newCurrent = prev.currentUser;
      if (prev.currentUser.id === id) {
        newCurrent = { ...prev.currentUser, ...userData };
      }
      return {
        ...prev,
        users: updatedUsers,
        currentUser: newCurrent,
        auditLogs: [auditLog, ...prev.auditLogs],
      };
    });
  };

  const deleteUser = (id: string): boolean => {
    if (stateRef.current.users.length <= 1) {
      toast.error('Cannot delete the last remaining user account.');
      return false;
    }
    const user = stateRef.current.users.find((u) => u.id === id);
    if (!user) return false;

    const auditLog = addAuditLog('USER_DELETED', 'User', id, `Deleted user account: ${user.name}`);
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
      currentUser: prev.currentUser.id === id ? prev.users.find((u) => u.id !== id)! : prev.currentUser,
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return true;
  };

  const toggleUserStatus = (id: string) => {
    const user = stateRef.current.users.find((u) => u.id === id);
    if (!user) return;
    updateUser(id, { status: user.status === 'Active' ? 'Disabled' : 'Active' });
  };

  const addRole = (roleData: Omit<RolePermission, 'id'>): RolePermission => {
    const newRole: RolePermission = { ...roleData, id: generateId('role') };
    const auditLog = addAuditLog('ROLE_CREATED', 'Role', newRole.id, `Created custom role: ${newRole.name}`);
    setState((prev) => ({
      ...prev,
      roles: [...prev.roles, newRole],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
    return newRole;
  };

  const updateRole = (id: string, roleData: Partial<RolePermission>) => {
    const auditLog = addAuditLog('ROLE_UPDATED', 'Role', id, `Updated role permissions for ${roleData.name || id}`);
    setState((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === id ? { ...r, ...roleData } : r)),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  const deleteRole = (id: string): boolean => {
    const role = stateRef.current.roles.find((r) => r.id === id);
    if (!role) return false;
    if (role.isSystemRole) {
      toast.error('System default roles cannot be deleted.');
      return false;
    }

    const auditLog = addAuditLog('ROLE_DELETED', 'Role', id, `Deleted role: ${role.name}`);
    setState((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== id),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return true;
  };

  // ----------------------------------------------------
  // 9. SETTINGS & SYSTEM ACTIONS
  // ----------------------------------------------------
  const updateBusiness = (businessData: Partial<BusinessProfile>) => {
    const auditLog = addAuditLog('SETTINGS_UPDATED', 'Settings', 'business', 'Updated business profile and settings');
    setState((prev) => ({
      ...prev,
      business: { ...prev.business, ...businessData },
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  const setCurrentUser = (user: User) => {
    setState((prev) => ({ ...prev, currentUser: user }));
  };

  const resetToDemoData = () => {
    const initial = getInitialState();
    setState(initial);
    toast.success('Demo data has been restored.');
  };

  const importBackupData = (importedState: AppState) => {
    if (importedState && importedState.business && importedState.products) {
      importedState.business = migrateBusinessProfile(importedState.business);
      if (!importedState.roles || importedState.roles.length === 0) {
        importedState.roles = initialRoles;
      }
      setState(importedState);
      toast.success('Backup data imported successfully.');
    } else {
      throw new Error('Invalid backup file format.');
    }
  };

  // ----------------------------------------------------
  // 10. QUERY HELPERS
  // ----------------------------------------------------
  const getCustomerById = (id: string) => stateRef.current.customers.find((c) => c.id === id);
  const getProductById = (id: string) => stateRef.current.products.find((p) => p.id === id);
  const getSaleById = (id: string) => stateRef.current.sales.find((s) => s.id === id);
  const getInvoiceById = (id: string) => stateRef.current.invoices.find((i) => i.id === id);
  const getInvoicesByCustomer = (customerId: string) => stateRef.current.invoices.filter((i) => i.customerId === customerId);
  const getPaymentsByCustomer = (customerId: string) => stateRef.current.payments.filter((p) => p.customerId === customerId);
  const getSalesByCustomer = (customerId: string) => stateRef.current.sales.filter((s) => s.customerId === customerId);
  const getLowStockProducts = () => stateRef.current.products.filter((p) => p.currentStock <= p.minStockLevel);

  // ----------------------------------------------------
  // 11. DELIVERY CHALLANS
  // ----------------------------------------------------
  const createDeliveryChallan = (params: {
    saleId: string;
    vehicleNumber: string;
    driverName: string;
    transportName: string;
    notes?: string;
  }) => {
    const sale = stateRef.current.sales.find((s) => s.id === params.saleId);
    if (!sale) return null;

    const nowIso = new Date().toISOString();
    const challanId = generateId('chln');
    const challanNumber = `DC-${new Date().getFullYear()}-${String((stateRef.current.deliveryChallans?.length || 0) + 1).padStart(3, '0')}`;

    const newChallan = {
      id: challanId,
      challanNumber,
      saleId: sale.id,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      customerAddress: sale.customerAddress || '',
      vehicleNumber: params.vehicleNumber,
      driverName: params.driverName,
      transportName: params.transportName,
      dispatchDate: nowIso,
      deliveryStatus: 'Dispatched' as const,
      notes: params.notes,
      createdBy: stateRef.current.currentUser.name,
      createdAt: nowIso,
      items: sale.items.map((item) => ({
        id: generateId('dci'),
        challanId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    const auditLog = addAuditLog('DELIVERY_CHALLAN_CREATED', 'Sale', challanNumber, `Created delivery challan ${challanNumber} for ${sale.invoiceNumber}`);

    setState((prev) => ({
      ...prev,
      deliveryChallans: [newChallan, ...(prev.deliveryChallans || [])],
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    return newChallan;
  };

  const updateChallanStatus = (challanId: string, status: 'Delivered' | 'Returned', receivedBy?: string) => {
    const nowIso = new Date().toISOString();
    const auditLog = addAuditLog('DELIVERY_STATUS_UPDATED', 'Sale', challanId, `Challan marked as ${status}${receivedBy ? ` (received by ${receivedBy})` : ''}`);

    setState((prev) => ({
      ...prev,
      deliveryChallans: (prev.deliveryChallans || []).map((c) =>
        c.id === challanId
          ? { ...c, deliveryStatus: status, deliveredAt: status === 'Delivered' ? nowIso : undefined, receivedBy }
          : c
      ),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        isAuthenticated,
        login,
        logout,
        cloudSession,
        isCloudMode,
        syncStatus,
        lastSyncedAt,
        cloudError,
        cloudLogin,
        cloudSignup,
        syncNow: runPush,
        pullFromCloud,
        cloudSendPasswordReset,
        cloudCompletePasswordReset,
        createSale,
        cancelSale,
        deleteSale,
        deletePayment,
        processSalesReturn,
        createQuote,
        updateQuote,
        deleteQuote,
        convertQuoteToSale,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        createPurchase,
        updatePurchasePayment,
        recordPayment,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        addRole,
        updateRole,
        deleteRole,
        hasModuleAccess,
        hasPermission,
        updateBusiness,
        setCurrentUser,
        resetToDemoData,
        importBackupData,
        getCustomerById,
        getProductById,
        getSaleById,
        getInvoiceById,
        getInvoicesByCustomer,
        getPaymentsByCustomer,
        getSalesByCustomer,
        getLowStockProducts,
        createDeliveryChallan,
        updateChallanStatus,
        deliveryChallans: state.deliveryChallans || [],
        quotes: state.quotes ?? [],
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
