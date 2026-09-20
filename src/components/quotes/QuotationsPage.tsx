import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  Eye,
  PlusCircle,
  Trash2,
  User,
  Package,
  Plus,
  ToggleLeft,
  ToggleRight,
  ShoppingCart,
  ArrowLeft,
  Printer,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Customer, Product, QuoteItem, Quote, PaymentMethod } from '../../types';
import { calculateLineItem, calculateSaleTotals } from '../../utils/calculations';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateQuoteWhatsAppUrl } from '../../utils/whatsapp';
import { exportToCsvFile } from '../../utils/storage';
import { useConfirm } from '../ui/ConfirmDialog';
import { QuoteViewModal } from './QuoteViewModal';
import { toast } from 'sonner';

interface QuotationsPageProps {
  onViewInvoice: (invoiceId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Sent: 'bg-blue-100 text-blue-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Expired: 'bg-amber-100 text-amber-700',
  Converted: 'bg-indigo-100 text-indigo-700',
};

const effectiveStatus = (q: Quote): string => {
  if ((q.status === 'Sent' || q.status === 'Draft') && new Date(q.validUntil) < new Date()) {
    return 'Expired';
  }
  return q.status;
};

export const QuotationsPage: React.FC<QuotationsPageProps> = ({ onViewInvoice }) => {
  const {
    quotes,
    customers,
    products,
    business,
    createQuote,
    updateQuote,
    deleteQuote,
    convertQuoteToSale,
  } = useApp();
  const confirmDialog = useConfirm();

  const allQuotes = quotes ?? [];

  // Page mode
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewQuoteId, setViewQuoteId] = useState<string | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form state (mirrors NewSalePage)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isZeroGstQuote, setIsZeroGstQuote] = useState(false);

  // Convert dialog state
  const [convertPaymentType, setConvertPaymentType] = useState<'full' | 'partial' | 'credit'>('full');
  const [convertPaymentMode, setConvertPaymentMode] = useState<PaymentMethod>('Cash');
  const [convertCustomAmount, setConvertCustomAmount] = useState<number>(0);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const isInterState = selectedCustomer
    ? Boolean(
        (selectedCustomer.gstin && selectedCustomer.gstin.length >= 2
          ? selectedCustomer.gstin.substring(0, 2) !== business.businessStateCode
          : false) ||
        (!selectedCustomer.gstin &&
          selectedCustomer.state &&
          selectedCustomer.state.toLowerCase() !== business.state.toLowerCase())
      )
    : false;

  const totals = calculateSaleTotals(items, isInterState);

  // ---------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------
  const startNewQuote = () => {
    setEditingQuote(null);
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setItems([]);
    setProductSearchQuery('');
    setValidUntil(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
    setQuoteNotes('');
    setIsZeroGstQuote(false);
    setMode('form');
  };

  const startEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setSelectedCustomerId(quote.customerId);
    setCustomerSearchQuery(`${quote.customerName} (${quote.customerPhone})`);
    setItems(quote.items.map((it) => ({ ...it })));
    setValidUntil(quote.validUntil.slice(0, 10));
    setQuoteNotes(quote.notes || '');
    setIsZeroGstQuote(Boolean(quote.isZeroGst));
    setViewQuoteId(null);
    setMode('form');
  };

  const handleAddProduct = (product: Product) => {
    let initialPrice = product.sellingPrice;
    if (selectedCustomer?.customerType === 'Wholesale' && product.wholesalePrice > 0) {
      initialPrice = product.wholesalePrice;
    } else if (selectedCustomer?.customerType === 'Dealer' && product.dealerPrice > 0) {
      initialPrice = product.dealerPrice;
    }

    const effectiveGstRate = isZeroGstQuote ? 0 : product.gstRate || 18;

    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + 1;
      const line = calculateLineItem(current.unitPrice, newQty, current.discount, current.discountType, effectiveGstRate);
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
      const newItem: QuoteItem = {
        id: `qitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  const handleUpdateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
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

  const handleToggleZeroGst = () => {
    const nextState = !isZeroGstQuote;
    setIsZeroGstQuote(nextState);
    const updated = items.map((item) => {
      const effectiveGstRate = nextState ? 0 : products.find((p) => p.id === item.productId)?.gstRate || 18;
      const line = calculateLineItem(item.unitPrice, item.quantity, item.discount, item.discountType, effectiveGstRate);
      return {
        ...item,
        gstRate: effectiveGstRate,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
      };
    });
    setItems(updated);
  };

  const handleSaveQuote = (status: 'Draft' | 'Sent') => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer for this quotation.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product to the quote.');
      return;
    }
    if (!validUntil) {
      toast.error('Please set a valid-until date.');
      return;
    }

    const validUntilIso = new Date(`${validUntil}T23:59:59`).toISOString();

    try {
      if (editingQuote) {
        updateQuote(editingQuote.id, {
          items: items.map((it) => ({ ...it })),
          validUntil: validUntilIso,
          notes: quoteNotes.trim() || undefined,
          isZeroGst: isZeroGstQuote,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          totalTax: totals.totalTax,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          isInterState,
          status: editingQuote.status === 'Draft' ? status : editingQuote.status,
        });
        toast.success(`Quote ${editingQuote.quoteNumber} updated.`);
      } else {
        const quote = createQuote({
          customerId: selectedCustomerId,
          items,
          validUntil: validUntilIso,
          notes: quoteNotes.trim() || undefined,
          status,
          isZeroGst: isZeroGstQuote,
        });
        toast.success(`Quotation ${quote.quoteNumber} created${status === 'Sent' ? ' and marked Sent' : ' as draft'}.`, {
          description: `Total: ${formatCurrency(quote.grandTotal)}`,
        });
      }
      setMode('list');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save quotation.');
    }
  };

  // ---------------------------------------------------------
  // CONVERT QUOTE -> SALE
  // ---------------------------------------------------------
  const openConvertDialog = (quote: Quote) => {
    setConvertingQuote(quote);
    setConvertPaymentType('full');
    setConvertPaymentMode('Cash');
    setConvertCustomAmount(Math.round(quote.grandTotal / 2));
    setViewQuoteId(null);
  };

  const convertAmountPaid =
    convertingQuote == null
      ? 0
      : convertPaymentType === 'credit'
        ? 0
        : convertPaymentType === 'partial'
          ? Math.min(Math.max(0, convertCustomAmount), convertingQuote.grandTotal)
          : convertingQuote.grandTotal;

  const handleConfirmConvert = () => {
    if (!convertingQuote) return;
    try {
      const result = convertQuoteToSale(convertingQuote.id, {
        amountPaid: convertAmountPaid,
        paymentMethod: convertPaymentType === 'credit' ? 'Credit' : convertPaymentMode,
      });
      if (!result) {
        toast.error('This quote could not be converted (already converted?).');
        return;
      }
      toast.success(`Invoice ${result.sale.invoiceNumber} created from ${convertingQuote.quoteNumber}.`, {
        description: `Grand Total: ${formatCurrency(result.sale.grandTotal)}`,
      });
      setConvertingQuote(null);
      onViewInvoice(result.invoice.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed.');
    }
  };

  // ---------------------------------------------------------
  // LIST HELPERS
  // ---------------------------------------------------------
  const filteredQuotes = allQuotes.filter((q) => {
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      const match =
        q.quoteNumber.toLowerCase().includes(s) ||
        q.customerName.toLowerCase().includes(s) ||
        q.customerPhone.includes(s) ||
        q.items.some((it) => it.productName.toLowerCase().includes(s) || it.sku.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (statusFilter !== 'ALL' && effectiveStatus(q) !== statusFilter) return false;
    return true;
  });

  const openQuotes = allQuotes.filter((q) => {
    const st = effectiveStatus(q);
    return st === 'Sent' || st === 'Draft';
  });
  const acceptedValue = allQuotes
    .filter((q) => q.status === 'Accepted')
    .reduce((sum, q) => sum + q.grandTotal, 0);
  const convertedCount = allQuotes.filter((q) => q.status === 'Converted').length;

  const handleExportCsv = () => {
    const data = filteredQuotes.map((q) => ({
      'Quote No': q.quoteNumber,
      Date: formatDate(q.date),
      Customer: q.customerName,
      Phone: q.customerPhone,
      Items: q.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join('; '),
      'Quoted Total': q.grandTotal,
      'Valid Until': formatDate(q.validUntil),
      Status: effectiveStatus(q),
      'Created By': q.createdBy,
    }));
    exportToCsvFile(data, 'Quotations_Report');
  };

  const handleDeleteQuote = async (quote: Quote) => {
    const ok = await confirmDialog({
      title: 'Delete Quotation',
      message: `Delete quote ${quote.quoteNumber} for ${quote.customerName}? This cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      deleteQuote(quote.id);
      toast.success(`Quote ${quote.quoteNumber} deleted.`);
    }
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
          p.category.toLowerCase().includes(productSearchQuery.toLowerCase())
      )
    : products.slice(0, 10);

  // =========================================================
  // RENDER: QUOTE FORM (new / edit)
  // =========================================================
  if (mode === 'form') {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <span>{editingQuote ? `Edit Quotation ${editingQuote.quoteNumber}` : 'New Quotation (Rate Quote)'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quotes never touch stock or khata — they become a real sale only when you convert them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleZeroGst}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border font-bold text-xs md:text-sm transition-all shadow-xs ${
                isZeroGstQuote
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isZeroGstQuote ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              <span>{isZeroGstQuote ? '✓ 0% GST Quote' : '0% GST / Non-GST Quote'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('list')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to List</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Customer selection */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer Details</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}
                </span>
              </div>

              <div className="relative">
                <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Search customer by name or mobile number..."
                    className="w-full bg-transparent text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearchQuery(`${c.name} (${c.phone})`);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-indigo-50 transition-colors"
                        >
                          <div>
                            <p className="text-xs md:text-sm font-bold text-slate-900">{c.name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center space-x-2">
                              <span>📞 {c.phone}</span>
                              <span>•</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-medium">{c.customerType}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-bold ${c.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              Bal: {formatCurrency(c.outstandingBalance)}
                            </p>
                            <p className="text-[10px] text-slate-400">Limit: {formatCurrency(c.creditLimit)}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-500">No matching customer found. Add the customer first from the Customers page.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                    <p className="text-slate-600 text-[11px]">
                      {selectedCustomer.address ? `${selectedCustomer.address}, ` : ''}{selectedCustomer.city}
                      {selectedCustomer.gstin ? ` • GSTIN: ${selectedCustomer.gstin}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Outstanding Khata</span>
                      <span className={`font-black ${selectedCustomer.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(selectedCustomer.outstandingBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Credit Terms</span>
                      <span className="font-bold text-slate-700">{selectedCustomer.paymentTermsDays || 0} Days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product search + items table */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quoted Items ({items.length})</span>
                </span>
                {isZeroGstQuote && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ⚡ 0% Tax Mode Active
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onFocus={() => setShowProductDropdown(true)}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    placeholder="Type product name or SKU to add to quote..."
                    className="w-full bg-transparent text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                {showProductDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => handleAddProduct(prod)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-indigo-50 transition-colors"
                      >
                        <div>
                          <p className="text-xs md:text-sm font-bold text-slate-900">{prod.name}</p>
                          <p className="text-[11px] text-slate-500">
                            SKU: <span className="font-mono">{prod.sku}</span> • HSN: <span className="font-mono">{prod.hsnCode || '-'}</span> • GST: {isZeroGstQuote ? '0% (Exempt)' : `${prod.gstRate}%`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-bold text-slate-900">{formatCurrency(prod.sellingPrice)}</p>
                          <p className={`text-[10px] ${prod.currentStock <= prod.minStockLevel ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            Stock: {prod.currentStock} {prod.unit}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No items added to quote yet</p>
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
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                              className="w-14 px-1.5 py-1 border border-slate-300 rounded-lg text-xs text-right focus:outline-hidden"
                            />
                          </td>
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
                          <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrency(item.totalAmount)}</td>
                          <td className="py-2 px-1 text-center">
                            <button
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
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

          {/* Right column: quote meta + totals */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Summary</h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">Customer sees: rates valid until this date.</p>
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
                  <span>{isInterState ? 'IGST:' : 'GST (CGST + SGST):'}</span>
                  <span className={`font-semibold ${isZeroGstQuote ? 'text-emerald-600 font-bold' : 'text-slate-800'}`}>
                    {isZeroGstQuote ? '₹0.00 (0% GST)' : formatCurrency(totals.totalTax)}
                  </span>
                </div>
                {totals.roundOff !== 0 && (
                  <div className="flex justify-between py-1 text-slate-500">
                    <span>Round Off:</span>
                    <span className="font-mono">{formatCurrency(totals.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 text-base md:text-lg font-black text-slate-900 border-t-2 border-slate-900">
                  <span>Quoted Total:</span>
                  <span className="text-indigo-600">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Rates for Site work, delivery extra"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuote('Sent')}
                  disabled={items.length === 0 || !selectedCustomerId}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{editingQuote ? 'Update & Mark Sent' : 'Save & Mark Sent'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuote('Draft')}
                  disabled={items.length === 0 || !selectedCustomerId}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  <span>Save as Draft</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: QUOTES LIST
  // =========================================================
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Quotations</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Rate quotes for customers — convert to a sale when they confirm. Never touches stock or khata.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={startNewQuote}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Quotes</p>
          <p className="text-xl font-black text-indigo-600 mt-1">{openQuotes.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">drafts + sent, not expired</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accepted Value</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(acceptedValue)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">waiting to be converted</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Converted</p>
          <p className="text-xl font-black text-slate-700 mt-1">{convertedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">became sales</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Quoted</p>
          <p className="text-xl font-black text-slate-700 mt-1">{formatCurrency(allQuotes.reduce((s, q) => s + q.grandTotal, 0))}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{allQuotes.length} quotations</p>
        </div>
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-slate-100">
          <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all flex-1">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quote no, customer, phone, or product..."
              className="w-full bg-transparent text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
            <option value="Converted">Converted</option>
          </select>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No quotations yet</p>
            <p className="text-xs mt-1">When a customer asks for rates, create a quote here — it stays out of your sales.</p>
            <button
              onClick={startNewQuote}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Quotation</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Quote No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Quoted Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => {
                  const st = effectiveStatus(q);
                  const expired = st === 'Expired';
                  return (
                    <tr key={q.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{q.quoteNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{q.customerName}</p>
                        <p className="text-[10px] text-slate-400">{q.customerPhone}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(q.date)}</td>
                      <td className={`py-3 px-4 ${expired ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        {formatDate(q.validUntil)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">{q.items.length}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(q.grandTotal)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${STATUS_STYLES[st] || STATUS_STYLES.Draft}`}>
                          {st}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setViewQuoteId(q.id)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View / Print"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {q.status === 'Draft' && (
                            <button
                              onClick={() => startEditQuote(q)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={generateQuoteWhatsAppUrl(q.customerPhone, business, q)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteQuote(q)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View / Print modal */}
      <QuoteViewModal
        quoteId={viewQuoteId}
        isOpen={Boolean(viewQuoteId)}
        onClose={() => setViewQuoteId(null)}
        onEdit={startEditQuote}
        onConvert={openConvertDialog}
      />

      {/* Convert to Sale dialog */}
      <Dialog open={convertingQuote !== null} onClose={() => setConvertingQuote(null)} className="relative z-[110]">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-bold text-slate-900">Convert Quote to Sale</DialogTitle>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Create a real invoice from <span className="font-semibold text-slate-700">{convertingQuote?.quoteNumber}</span> for{' '}
                    <span className="font-semibold text-slate-700">{convertingQuote?.customerName}</span>. Stock will be deducted and khata updated.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm overflow-hidden">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Quoted total</span>
                  <span className="font-bold text-slate-800">{formatCurrency(convertingQuote?.grandTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 bg-blue-50">
                  <span className="text-slate-600 font-semibold">Amount collected now</span>
                  <span className="font-black text-blue-600">{formatCurrency(convertAmountPaid)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-slate-500">Added to khata</span>
                  <span className="font-bold text-amber-600">{formatCurrency((convertingQuote?.grandTotal ?? 0) - convertAmountPaid)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Payment Collection</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setConvertPaymentType('full')}
                    className={`py-1.5 rounded-lg transition-all ${convertPaymentType === 'full' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Full Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertPaymentType('partial')}
                    className={`py-1.5 rounded-lg transition-all ${convertPaymentType === 'partial' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertPaymentType('credit')}
                    className={`py-1.5 rounded-lg transition-all ${convertPaymentType === 'credit' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    100% Khata
                  </button>
                </div>
              </div>

              {convertPaymentType === 'partial' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount Received Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={convertingQuote?.grandTotal ?? 0}
                    value={convertCustomAmount}
                    onChange={(e) => setConvertCustomAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {convertPaymentType !== 'credit' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'] as PaymentMethod[]).map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setConvertPaymentMode(pm)}
                        className={`px-2 py-1.5 rounded-lg border text-center font-medium transition-all ${
                          convertPaymentMode === pm
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConvertingQuote(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConvert}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Create Invoice</span>
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};
