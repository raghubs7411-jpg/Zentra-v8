import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, Package, Phone, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectInvoice: (invoiceId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onSelectInvoice,
  onSelectProduct,
}) => {
  const { customers, sales, products } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Escape and Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered from parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  const matchedCustomers = cleanQuery
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.phone.includes(cleanQuery) ||
          (c.altPhone && c.altPhone.includes(cleanQuery)) ||
          (c.gstin && c.gstin.toLowerCase().includes(cleanQuery))
      )
    : [];

  const matchedSales = cleanQuery
    ? sales.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(cleanQuery) ||
          s.customerName.toLowerCase().includes(cleanQuery) ||
          s.customerPhone.includes(cleanQuery)
      )
    : [];

  const matchedProducts = cleanQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.sku.toLowerCase().includes(cleanQuery) ||
          (p.barcode && p.barcode.includes(cleanQuery)) ||
          p.category.toLowerCase().includes(cleanQuery)
      )
    : [];

  const hasResults =
    matchedCustomers.length > 0 || matchedSales.length > 0 || matchedProducts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type customer name, phone number, invoice #, product SKU..."
            className="w-full bg-transparent text-sm md:text-base text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-200/80 hover:bg-slate-300 rounded-md transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-100">
          {!cleanQuery && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm font-medium">Quick Global Search</p>
              <p className="text-xs mt-1">
                Try searching <span className="text-blue-600 font-mono">9880112233</span>, <span className="text-blue-600 font-mono">INV-2026-1041</span>, or <span className="text-blue-600 font-mono">Cement</span>
              </p>
            </div>
          )}

          {cleanQuery && !hasResults && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Check the spelling or try a different phone number/SKU</p>
            </div>
          )}

          {/* Customer Results */}
          {matchedCustomers.length > 0 && (
            <div className="pt-2 first:pt-0">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Customers ({matchedCustomers.length})</span>
              </div>
              <div className="space-y-1">
                {matchedCustomers.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 text-left transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{c.name}</p>
                        <p className="text-xs text-slate-500 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">{c.customerType}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${c.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        Bal: {formatCurrency(c.outstandingBalance)}
                      </p>
                      <span className="text-[11px] text-blue-600 font-medium flex items-center justify-end space-x-0.5 group-hover:underline">
                        <span>View Profile</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Invoice / Sale Results */}
          {matchedSales.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Invoices & Sales ({matchedSales.length})</span>
              </div>
              <div className="space-y-1">
                {matchedSales.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectInvoice(s.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-200 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono group-hover:text-indigo-700">{s.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">
                        {s.customerName} • {formatDate(s.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(s.grandTotal)}</p>
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          s.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : s.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Results */}
          {matchedProducts.length > 0 && (
            <div className="pt-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                <span>Products / Catalog ({matchedProducts.length})</span>
              </div>
              <div className="space-y-1">
                {matchedProducts.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        SKU: <span className="font-mono">{p.sku}</span> • {p.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</p>
                      <p className="text-xs text-slate-500">
                        Stock: <span className={p.currentStock <= p.minStockLevel ? 'text-amber-600 font-bold' : 'text-slate-700'}>{p.currentStock} {p.unit}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
