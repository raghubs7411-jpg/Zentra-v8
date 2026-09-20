import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AppProvider, useApp } from './context/AppContext';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { LoginPage } from './components/auth/LoginPage';
import { OverviewTab } from './components/dashboard/OverviewTab';
import { NewSalePage } from './components/pos/NewSalePage';
import { SalesListPage } from './components/sales/SalesListPage';
import { QuotationsPage } from './components/quotes/QuotationsPage';
import { CustomersListPage } from './components/customers/CustomersListPage';
import { InventoryListPage } from './components/inventory/InventoryListPage';
import { PurchasesListPage } from './components/purchases/PurchasesListPage';
import { PaymentsListPage } from './components/payments/PaymentsListPage';
import { InvoicesListPage } from './components/invoices/InvoicesListPage';

// Lazy-loaded heavy pages (code-split for faster initial load)
const ReportsPage = lazy(() => import('./components/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const PriceManagementPage = lazy(() => import('./components/pricing/PriceManagementPage').then(m => ({ default: m.PriceManagementPage })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AuditTrailPage = lazy(() => import('./components/audit/AuditTrailPage').then(m => ({ default: m.AuditTrailPage })));

// Modals
import { InvoiceViewModal } from './components/invoices/InvoiceViewModal';
import { SaleDetailModal } from './components/sales/SaleDetailModal';
import { SalesReturnModal } from './components/sales/SalesReturnModal';
import { CancelSaleModal } from './components/sales/CancelSaleModal';
import { CustomerProfileModal } from './components/customers/CustomerProfileModal';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { ProductFormModal } from './components/inventory/ProductFormModal';
import { StockAdjustModal } from './components/inventory/StockAdjustModal';
import { PurchaseEntryModal } from './components/inventory/PurchaseEntryModal';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';
import { PaymentReceiptModal } from './components/payments/PaymentReceiptModal';
import { Customer, Product } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, hasModuleAccess, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Modals state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activeSaleDetailId, setActiveSaleDetailId] = useState<string | null>(null);
  const [activeReturnSaleId, setActiveReturnSaleId] = useState<string | null>(null);
  const [activeCancelSaleId, setActiveCancelSaleId] = useState<string | null>(null);
  const [customersSortOutstanding, setCustomersSortOutstanding] = useState(false);

  const [activeCustomerProfileId, setActiveCustomerProfileId] = useState<string | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [activeStockAdjustProductId, setActiveStockAdjustProductId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetCustomerId, setPaymentTargetCustomerId] = useState<string | null>(null);
  const [paymentTargetInvoiceId, setPaymentTargetInvoiceId] = useState<string | null>(null);
  const [activeReceiptPaymentId, setActiveReceiptPaymentId] = useState<string | null>(null);

  // Global Ctrl+K / Cmd+K Keyboard Shortcut Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Auto-switch to first accessible tab if activeTab is not permitted for the user's role
  useEffect(() => {
    if (!hasModuleAccess(activeTab)) {
      const fallbackTabs = [
        'overview',
        'new-sale',
        'sales',
        'quotes',
        'customers',
        'inventory',
        'payments',
        'invoices',
        'purchases',
        'reports',
        'settings',
      ];
      const firstAllowed = fallbackTabs.find((t) => hasModuleAccess(t));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser, activeTab, hasModuleAccess]);

  // If not signed in, display Login Screen
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  // Quick Action Handlers
  const handleOpenRecordPayment = (customerId?: string, invoiceId?: string) => {
    setPaymentTargetCustomerId(customerId || null);
    setPaymentTargetInvoiceId(invoiceId || null);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenCustomerForm = (cust?: Customer | null) => {
    setCustomerToEdit(cust || null);
    setIsCustomerFormOpen(true);
  };

  const handleOpenProductForm = (prod?: Product | null) => {
    setProductToEdit(prod || null);
    setIsProductFormOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

        {/* Main Content View Container */}
        <main className="flex-1 overflow-y-auto min-w-0 pb-12">
          {activeTab === 'overview' && (
            <OverviewTab
              onNavigateTab={(tab, options) => {
                setActiveTab(tab);
                if (options && options.sortOutstandingFirst) {
                  setCustomersSortOutstanding(true);
                }
              }}
              onOpenSaleDetail={(id) => setActiveSaleDetailId(id)}
              onOpenRecordPayment={() => handleOpenRecordPayment()}
              onOpenAddCustomer={() => handleOpenCustomerForm(null)}
              onOpenQuickStockIn={() => setIsPurchaseModalOpen(true)}
            />
          )}

          {activeTab === 'new-sale' && (
            <NewSalePage
              onSaleCompleted={(saleId, action) => {
                if (action === 'print' || action === 'whatsapp' || action === 'view') {
                  setActiveInvoiceId(saleId);
                }
              }}
              onViewSaleDetail={(saleId) => setActiveSaleDetailId(saleId)}
            />
          )}

          {activeTab === 'sales' && (
            <SalesListPage
              onNavigateNewSale={() => setActiveTab('new-sale')}
              onViewSaleDetail={(id) => setActiveSaleDetailId(id)}
              onViewInvoice={(id) => setActiveInvoiceId(id)}
              onRecordPayment={(cId, iId) => handleOpenRecordPayment(cId, iId)}
              onOpenSalesReturn={(id) => setActiveReturnSaleId(id)}
              onOpenCancelSale={(id) => setActiveCancelSaleId(id)}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotationsPage
              onViewInvoice={(invoiceId) => setActiveInvoiceId(invoiceId)}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersListPage
              onOpenCustomerProfile={(id) => setActiveCustomerProfileId(id)}
              onOpenCustomerForm={(c) => handleOpenCustomerForm(c)}
              onOpenRecordPayment={(cId) => handleOpenRecordPayment(cId)}
              onOpenNewSaleForCustomer={(cId) => {
                setActiveTab('new-sale');
              }}
              sortOutstandingFirst={customersSortOutstanding}
              onSortApplied={() => setCustomersSortOutstanding(false)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryListPage
              onOpenProductForm={(p) => handleOpenProductForm(p)}
              onOpenStockAdjust={(id) => setActiveStockAdjustProductId(id)}
              onOpenQuickPurchase={() => setIsPurchaseModalOpen(true)}
              onOpenPriceHistory={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesListPage
              onOpenNewPurchase={() => setIsPurchaseModalOpen(true)}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsListPage
              onOpenRecordPayment={(cId, iId) => handleOpenRecordPayment(cId, iId)}
              onViewReceipt={(id) => setActiveReceiptPaymentId(id)}
              onViewInvoice={(id) => setActiveInvoiceId(id)}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesListPage
              onViewInvoice={(id) => setActiveInvoiceId(id)}
              onRecordPayment={(cId, iId) => handleOpenRecordPayment(cId, iId)}
            />
          )}

          {activeTab === 'reports' && <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading reports…</div>}><ReportsPage /></Suspense>}

          {activeTab === 'pricing' && <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading…</div>}><PriceManagementPage /></Suspense>}

          {activeTab === 'audit' && <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading…</div>}><AuditTrailPage /></Suspense>}

          {activeTab === 'settings' && <Suspense fallback={<div className="p-6 text-slate-400 text-sm">Loading settings…</div>}><SettingsPage /></Suspense>}
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* GLOBAL MODALS                                        */}
      {/* ---------------------------------------------------- */}

      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectCustomer={(id) => setActiveCustomerProfileId(id)}
        onSelectInvoice={(id) => setActiveInvoiceId(id)}
        onSelectProduct={(id) => {
          setActiveTab('inventory');
        }}
      />

      {/* Invoice Viewer / Print Preview (GST, Classic, Thermal) */}
      <InvoiceViewModal
        invoiceId={activeInvoiceId}
        isOpen={Boolean(activeInvoiceId)}
        onClose={() => setActiveInvoiceId(null)}
        onOpenRecordPayment={(cId, iId) => handleOpenRecordPayment(cId, iId)}
        onOpenSalesReturn={(sId) => setActiveReturnSaleId(sId)}
      />

      {/* Sale Detail Breakdown */}
      <SaleDetailModal
        saleId={activeSaleDetailId}
        isOpen={Boolean(activeSaleDetailId)}
        onClose={() => setActiveSaleDetailId(null)}
        onViewInvoice={(iId) => setActiveInvoiceId(iId)}
        onOpenRecordPayment={(cId, iId) => handleOpenRecordPayment(cId, iId)}
        onOpenSalesReturn={(sId) => setActiveReturnSaleId(sId)}
        onOpenCancelSale={(sId) => setActiveCancelSaleId(sId)}
      />

      {/* Sales Return Modal */}
      <SalesReturnModal
        saleId={activeReturnSaleId}
        isOpen={Boolean(activeReturnSaleId)}
        onClose={() => setActiveReturnSaleId(null)}
        onReturnProcessed={() => {}}
      />

      {/* Cancel Sale Modal */}
      <CancelSaleModal
        saleId={activeCancelSaleId}
        isOpen={Boolean(activeCancelSaleId)}
        onClose={() => setActiveCancelSaleId(null)}
        onSaleCancelled={() => {}}
      />

      {/* Customer 360 Profile */}
      <CustomerProfileModal
        customerId={activeCustomerProfileId}
        isOpen={Boolean(activeCustomerProfileId)}
        onClose={() => setActiveCustomerProfileId(null)}
        onNewSaleForCustomer={(cId) => {
          setActiveCustomerProfileId(null);
          setActiveTab('new-sale');
        }}
        onRecordPayment={(cId) => handleOpenRecordPayment(cId)}
        onViewInvoice={(iId) => setActiveInvoiceId(iId)}
      />

      {/* Customer Add/Edit Form */}
      <CustomerFormModal
        isOpen={isCustomerFormOpen}
        onClose={() => {
          setIsCustomerFormOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
      />

      {/* Product Add/Edit Form */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        productId={activeStockAdjustProductId}
        isOpen={Boolean(activeStockAdjustProductId)}
        onClose={() => setActiveStockAdjustProductId(null)}
      />

      {/* Purchase Entry Modal */}
      <PurchaseEntryModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setPaymentTargetCustomerId(null);
          setPaymentTargetInvoiceId(null);
        }}
        defaultCustomerId={paymentTargetCustomerId}
        defaultInvoiceId={paymentTargetInvoiceId}
        onPaymentRecorded={(paymentId) => {
          setActiveReceiptPaymentId(paymentId);
        }}
      />

      {/* Payment Receipt Voucher */}
      <PaymentReceiptModal
        paymentId={activeReceiptPaymentId}
        isOpen={Boolean(activeReceiptPaymentId)}
        onClose={() => setActiveReceiptPaymentId(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ConfirmProvider>
        <AppContent />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'inherit',
              fontSize: '13px',
            },
          }}
        />
      </ConfirmProvider>
    </AppProvider>
  );
}
