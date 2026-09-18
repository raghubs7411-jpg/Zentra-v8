import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  User,
  Plus,
  Trash2,
  Search,
  DollarSign,
  Receipt,
  Printer,
  Share2,
  CreditCard,
  Check,
  AlertCircle,
  Package,
  Phone,
  RefreshCw,
  QrCode,
  Tag,
  Percent,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Product, SaleItem, PaymentMethod } from '../../types';
import { calculateLineItem, calculateSaleTotals } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { QuickCustomerModal } from './QuickCustomerModal';
import { toast } from 'sonner';
import { useConfirm } from '../ui/ConfirmDialog';
import { calculateLoyalty } from '../../utils/loyalty';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface NewSalePageProps {
  onSaleCompleted: (saleId: string, action?: 'view' | 'print' | 'whatsapp') => void;
  onViewSaleDetail?: (saleId: string) => void;
}

export const NewSalePage: React.FC<NewSalePageProps> = ({ onSaleCompleted, onViewSaleDetail }) => {
  const { customers, products, business, createSale, sales } = useApp();
  const confirmDialog = useConfirm();


  // Selected Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);

  // 0% GST / Non-GST Bill Toggle
  const [isZeroGstBill, setIsZeroGstBill] = useState(false);

  // Line items
  const [items, setItems] = useState<SaleItem[]>([]);

  // Product search for adding
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Payment capture
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('Cash');
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'credit'>('full');
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [saleNotes, setSaleNotes] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Toggle 0% GST for all current items
  const handleToggleZeroGst = () => {
    const nextState = !isZeroGstBill;
    setIsZeroGstBill(nextState);

    // Update all existing items in cart
    const updated = items.map((item) => {
      const matchedProd = products.find((p) => p.id === item.productId);
      const effectiveGstRate = nextState ? 0 : matchedProd?.gstRate || 18;
      const line = calculateLineItem(
        item.unitPrice,
        item.quantity,
        item.discount,
        item.discountType,
        effectiveGstRate
      );
      return {
        ...item,
        gstRate: effectiveGstRate,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
      };
    });
    setItems(updated);
  };

  // Auto-calculated totals
  const totals = calculateSaleTotals(items);

  // Computed amount paid
  let calculatedAmountPaid = totals.grandTotal;
  if (paymentType === 'credit') {
    calculatedAmountPaid = 0;
  } else if (paymentType === 'partial') {
    calculatedAmountPaid = Math.min(totals.grandTotal, Math.max(0, customPaidAmount));
  }
  const balanceDue = Math.max(0, totals.grandTotal - calculatedAmountPaid);

  // Handle adding product to cart
  const handleAddProduct = (product: Product) => {
    let initialPrice = product.sellingPrice;
    if (selectedCustomer?.customerType === 'Wholesale' && product.wholesalePrice > 0) {
      initialPrice = product.wholesalePrice;
    } else if (selectedCustomer?.customerType === 'Dealer' && product.dealerPrice > 0) {
      initialPrice = product.dealerPrice;
    }

    const effectiveGstRate = isZeroGstBill ? 0 : product.gstRate || 18;

    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + 1;
      const line = calculateLineItem(
        current.unitPrice,
        newQty,
        current.discount,
        current.discountType,
        effectiveGstRate
      );
      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        gstRate: effectiveGstRate,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
      };
      setItems(updated);
    } else {
      const line = calculateLineItem(initialPrice, 1, 0, 'fixed', effectiveGstRate);
      const newItem: SaleItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        purchasePrice: product.purchasePrice,
        unitPrice: initialPrice,
        discount: 0,
        discountType: 'fixed',
        gstRate: effectiveGstRate,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
      };
      setItems([...items, newItem]);
    }

    setProductSearchQuery('');
    setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const line = calculateLineItem(
      Number(item.unitPrice) || 0,
      Number(item.quantity) || 0,
      Number(item.discount) || 0,
      item.discountType,
      Number(item.gstRate) || 0
    );

    item.taxAmount = line.taxAmount;
    item.totalAmount = line.totalAmount;
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const filteredCustomers = customerSearchQuery.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
          c.phone.includes(customerSearchQuery)
      )
    : customers.slice(0, 8);

  const filteredProducts = productSearchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          (p.barcode && p.barcode.includes(productSearchQuery)) ||
          p.category.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          (p.hsnCode && p.hsnCode.includes(productSearchQuery))
      )
    : products.slice(0, 10);

  const handleCompleteSale = (actionType: 'view' | 'print' | 'whatsapp' = 'view') => {
    if (!selectedCustomerId) {
      toast.error('Please select or create a customer before finalizing the sale.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product to the sale.');
      return;
    }

    try {
      const { sale } = createSale({
        customerId: selectedCustomerId,
        items,
        amountPaid: calculatedAmountPaid,
        paymentMethod: paymentType === 'credit' ? 'Credit' : paymentMode,
        isZeroGst: isZeroGstBill,
        notes: saleNotes.trim() || undefined,
      });

      toast.success(`Sale completed — Invoice ${sale.invoiceNumber}`, {
        description: `Grand Total: ${formatCurrency(totals.grandTotal)}`,
      });

      setItems([]);
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setPaymentType('full');
      setCustomPaidAmount(0);
      setSaleNotes('');

      onSaleCompleted(sale.id, actionType);
    } catch (err: any) {
      toast.error(`Error creating sale: ${err.message}`);
    }
  };

  // Ctrl+S keyboard shortcut to complete sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleCompleteSale('view');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedCustomerId, paymentType, paymentMode, customPaidAmount, isZeroGstBill, saleNotes]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header & 0% GST Option Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span>New Sale (POS Billing Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rapid checkout with connected inventory deduction and customer ledger sync.
          </p>
        </div>

        {/* 0% GST / Non-GST Bill Toggle Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleZeroGst}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border font-bold text-xs md:text-sm transition-all shadow-xs ${
              isZeroGstBill
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isZeroGstBill ? (
              <ToggleRight className="w-5 h-5 text-white" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
            <span>
              {isZeroGstBill ? '✓ 0% GST (Bill of Supply)' : '0% GST / Non-GST Bill'}
            </span>
          </button>

          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-200 font-bold">
            Invoice #: {business.invoicePrefix}{business.nextInvoiceNumber}
          </span>

          {items.length > 0 && (
            <button
              onClick={async () => {
                const ok = await confirmDialog({
                  title: 'Clear Sale',
                  message: 'Clear all items from current sale?',
                  variant: 'warning',
                  confirmText: 'Clear',
                });
                if (ok) {
                  setItems([]);
                }
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Clear Sale"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer & Items (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section 1: Customer Selection & Khata Summary */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Details</span>
              </span>
              <button
                onClick={() => setIsQuickCustomerModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Customer</span>
              </button>
            </div>

            {/* Customer Search & Select Box */}
            <div className="relative">
              <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  placeholder="Search customer by name, mobile number, or GSTIN..."
                  className="w-full bg-transparent text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Customer Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => {
                      const loyalty = calculateLoyalty(sales, c.id);
                      return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearchQuery(`${c.name} (${c.phone})`);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div>
                          <p className="text-xs md:text-sm font-bold text-slate-900">
                            {c.name}
                            {loyalty.isRepeatCustomer && (
                              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${loyalty.tierBg} ${loyalty.tierColor}`}>
                                {loyalty.tierIcon} {loyalty.visitCount}× {loyalty.tier}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center space-x-2">
                            <span>📞 {c.phone}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-medium">
                              {c.customerType}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-bold ${
                              c.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            Bal: {formatCurrency(c.outstandingBalance)}
                          </p>
                          <p className="text-[10px] text-slate-400">Limit: {formatCurrency(c.creditLimit)}</p>
                        </div>
                      </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-500">No matching customer found.</p>
                      <button
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setIsQuickCustomerModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        + Create "{customerSearchQuery}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Snapshot Card */}
            {selectedCustomer && (
              (() => {
                const loyalty = calculateLoyalty(sales, selectedCustomer.id);
                return (
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    {selectedCustomer.name}
                    {loyalty.isRepeatCustomer ? (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${loyalty.tierBg} ${loyalty.tierColor}`}>
                        {loyalty.tierIcon} {loyalty.tier} — {loyalty.visitCount} purchases
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                        First-time customer
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {selectedCustomer.address ? `${selectedCustomer.address}, ` : ''}{selectedCustomer.city}
                    {selectedCustomer.gstin ? ` • GSTIN: ${selectedCustomer.gstin}` : ''}
                  </p>
                  {loyalty.isRepeatCustomer && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Avg bill: {formatCurrency(loyalty.avgBillValue)} • Last visit: {loyalty.daysSinceLastPurchase === 0 ? 'Today' : `${loyalty.daysSinceLastPurchase} days ago`}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Outstanding Khata</span>
                    <span
                      className={`font-black ${
                        selectedCustomer.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(selectedCustomer.outstandingBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Credit Terms</span>
                    <span className="font-bold text-slate-700">{selectedCustomer.paymentTermsDays || 0} Days</span>
                  </div>
                </div>
              </div>
                );
              })()
            )}
          </div>

          {/* Section 2: Product Search & Add to Cart */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Line Items ({items.length})</span>
              </span>
              {isZeroGstBill && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ⚡ 0% Tax Mode Active
                </span>
              )}
            </div>

            {/* Product Autocomplete Input */}
            <div className="relative">
              <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={productSearchQuery}
                  onFocus={() => setShowProductDropdown(true)}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  placeholder="Scan barcode or type product name (e.g. Cement, TMT Rebar, Wire)..."
                  className="w-full bg-transparent text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Product Dropdown Results */}
              {showProductDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => handleAddProduct(prod)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <p className="text-xs md:text-sm font-bold text-slate-900">{prod.name}</p>
                        <p className="text-[11px] text-slate-500">
                          SKU: <span className="font-mono">{prod.sku}</span> • HSN: <span className="font-mono">{prod.hsnCode || '-'}</span> • {prod.category} • GST: {isZeroGstBill ? '0% (Exempt)' : `${prod.gstRate}%`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs md:text-sm font-bold text-slate-900">{formatCurrency(prod.sellingPrice)}</p>
                        <p
                          className={`text-[10px] ${
                            prod.currentStock <= prod.minStockLevel ? 'text-rose-600 font-bold' : 'text-slate-500'
                          }`}
                        >
                          Stock: {prod.currentStock} {prod.unit}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No items added to sale yet</p>
                <p className="text-xs mt-0.5">Use the search bar above to add products</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-2 px-1">#</th>
                      <th className="py-2 px-2 min-w-[160px]">Product / SKU</th>
                      <th className="py-2 px-2 min-w-[90px]">Unit</th>
                      <th className="py-2 px-2 min-w-[70px]">Qty</th>
                      <th className="py-2 px-2 min-w-[90px]">Price (₹)</th>
                      <th className="py-2 px-2 min-w-[80px]">Disc</th>
                      <th className="py-2 px-2 min-w-[60px]">GST</th>
                      <th className="py-2 px-2 text-right min-w-[90px]">Total (₹)</th>
                      <th className="py-2 px-1 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-1 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <p className="font-bold text-slate-800 truncate max-w-[200px]">{item.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                        </td>
                        {/* Unit Selector */}
                        <td className="py-2 px-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
                          >
                            <option value="Pieces">Pieces</option>
                            <option value="Bags">Bags</option>
                            <option value="Kg">Kg</option>
                            <option value="Grams">Grams</option>
                            <option value="Litres">Litres</option>
                            <option value="Boxes">Boxes</option>
                            <option value="Metres">Metres</option>
                            <option value="Hours">Hours</option>
                            <option value="Packets">Packets</option>
                          </select>
                        </td>
                        {/* Quantity */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-16 px-1.5 py-1 border border-slate-300 rounded-lg text-xs text-center font-bold focus:outline-hidden"
                          />
                        </td>
                        {/* Unit Price */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))}
                            className="w-20 px-1.5 py-1 border border-slate-300 rounded-lg text-xs font-bold text-right focus:outline-hidden"
                          />
                        </td>
                        {/* Discount */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                            className="w-14 px-1.5 py-1 border border-slate-300 rounded-lg text-xs text-right focus:outline-hidden"
                          />
                        </td>
                        {/* GST Rate (Disabled or toggleable with 0% option) */}
                        <td className="py-2 px-2">
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(idx, 'gstRate', Number(e.target.value))}
                            className="w-16 px-1 py-1 border border-slate-300 rounded-lg text-[11px] bg-white focus:outline-hidden font-mono"
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        {/* Total */}
                        <td className="py-2 px-2 text-right font-black text-slate-900">
                          {formatCurrency(item.totalAmount)}
                        </td>
                        {/* Remove */}
                        <td className="py-2 px-1 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout & Billing Totals (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Bill Calculation Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment & Invoice Summary</h3>
              {isZeroGstBill && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Non-GST Bill
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal (Base Value):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-semibold">-{formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(totals.taxableTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>GST Tax (CGST + SGST):</span>
                <span className={`font-semibold ${isZeroGstBill ? 'text-emerald-600 font-bold' : 'text-slate-800'}`}>
                  {isZeroGstBill ? '₹0.00 (0% GST)' : formatCurrency(totals.totalTax)}
                </span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between py-1 text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{formatCurrency(totals.roundOff)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 text-base md:text-lg font-black text-slate-900 border-t-2 border-slate-900">
                <span>Grand Total:</span>
                <span className="text-blue-600">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Collection Selector */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700">Payment Collection</label>
              
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`py-1.5 rounded-lg transition-all ${
                    paymentType === 'full' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('partial');
                    if (customPaidAmount === 0) setCustomPaidAmount(Math.round(totals.grandTotal / 2));
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    paymentType === 'partial' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Partial
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('credit')}
                  className={`py-1.5 rounded-lg transition-all ${
                    paymentType === 'credit' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  100% Khata
                </button>
              </div>

              {/* Partial Amount Input */}
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Amount Received Now (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totals.grandTotal}
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Payment Method Selector */}
              {paymentType !== 'credit' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'] as PaymentMethod[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                          paymentMode === mode
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Balance Summary Box */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Collected Now:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(calculatedAmountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Added to Khata (Balance):</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>

              {/* Sale Notes / Delivery info */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Order Notes (Optional)</label>
                <input
                  type="text"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="e.g. Delivery site, vehicle KA02E4412"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Action Buttons: 1-Click Generate & Print */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleCompleteSale('view')}
                disabled={items.length === 0 || !selectedCustomerId}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Receipt className="w-4 h-4" />
                <span>Generate {isZeroGstBill ? 'Bill of Supply' : 'Invoice'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCompleteSale('print')}
                  disabled={items.length === 0 || !selectedCustomerId}
                  className="flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Save & Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteSale('whatsapp')}
                  disabled={items.length === 0 || !selectedCustomerId}
                  className="flex items-center justify-center space-x-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Save & WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent 5 Sales Quick Access */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Last 5 Sales</h3>
            <span className="text-[10px] text-slate-400">Click to view or edit</span>
          </div>
        </div>
        <div className="space-y-2">
          {sales.slice(0, 5).map((s) => {
            const cust = customers.find((c) => c.id === s.customerId);
            const statusColor = s.paymentStatus === "Paid" ? "text-emerald-600" : s.paymentStatus === "Partially Paid" ? "text-amber-600" : "text-rose-600";
            return (
              <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors border border-slate-200 hover:border-blue-300" onClick={() => onViewSaleDetail && onViewSaleDetail(s.id)}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{s.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500">{cust ? cust.name : "Walk-in"} - {formatDateTime(s.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrency(s.grandTotal)}</p>
                  <p className={"text-[10px] font-semibold " + statusColor}>{s.paymentStatus}</p>
                </div>
              </div>
            );
          })}
          {sales.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No sales yet. Create your first sale!</p>
          )}
        </div>
      </div>

      {/* Quick Customer Modal */}
      <QuickCustomerModal
        isOpen={isQuickCustomerModalOpen}
        onClose={() => setIsQuickCustomerModalOpen(false)}
        defaultPhone={customerSearchQuery.replace(/\D/g, '')}
        onCustomerCreated={(custId) => {
          setSelectedCustomerId(custId);
          const created = customers.find((c) => c.id === custId);
          if (created) {
            setCustomerSearchQuery(`${created.name} (${created.phone})`);
          }
        }}
      />
    </div>
  );
};
