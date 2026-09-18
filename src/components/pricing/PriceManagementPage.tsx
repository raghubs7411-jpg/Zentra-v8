import React, { useState } from 'react';
import {
  Tags,
  Search,
  History,
  TrendingUp,
  Edit2,
  DollarSign,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  PlusCircle,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, PriceHistory } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { ProductFormModal } from '../inventory/ProductFormModal';
import { toast } from 'sonner';

export const PriceManagementPage: React.FC = () => {
  const { products, priceHistories, updateProduct, currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'history'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick edit modal state
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [newRetailPrice, setNewRetailPrice] = useState<number>(0);
  const [newWholesalePrice, setNewWholesalePrice] = useState<number>(0);
  const [newDealerPrice, setNewDealerPrice] = useState<number>(0);
  const [changeReason, setChangeReason] = useState<string>('');

  const handleOpenQuickPrice = (prod: Product) => {
    setQuickPriceProduct(prod);
    setNewRetailPrice(prod.sellingPrice);
    setNewWholesalePrice(prod.wholesalePrice);
    setNewDealerPrice(prod.dealerPrice);
    setChangeReason('');
  };

  const handleSaveQuickPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceProduct) return;
    if (newRetailPrice <= 0) {
      toast.error('Retail price must be greater than 0.');
      return;
    }

    updateProduct(
      quickPriceProduct.id,
      {
        sellingPrice: Number(newRetailPrice),
        wholesalePrice: Number(newWholesalePrice),
        dealerPrice: Number(newDealerPrice),
      },
      changeReason || 'Price updated in Price Management'
    );

    setQuickPriceProduct(null);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = priceHistories.filter(
    (h) =>
      h.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.changedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.reason && h.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportHistoryCsv = () => {
    const data = filteredHistory.map((h) => ({
      Date: formatDateTime(h.changedAt),
      Product: h.productName,
      'Price Type': h.priceType,
      'Old Price (₹)': h.oldPrice,
      'New Price (₹)': h.newPrice,
      'Changed By': h.changedBy,
      Reason: h.reason || '',
    }));
    exportToCsvFile(data, 'Price_Change_Audit_Log');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Tags className="w-6 h-6 text-blue-600" />
            <span>Price Management & Price History</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Control multi-tier wholesale, retail, and dealer prices with complete date-stamped audit trails.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeSubTab === 'history' && (
            <button
              onClick={handleExportHistoryCsv}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export History CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Tier Pricing vs Price History */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'catalog'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Product Pricing Tiers ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Price Change History Log ({priceHistories.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center px-2.5 py-1 mb-2 border border-slate-200 rounded-lg bg-slate-50 text-xs w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product..."
            className="w-full bg-transparent focus:outline-hidden text-slate-800"
          />
        </div>
      </div>

      {/* SUB-TAB 1: PRODUCT PRICING TIERS */}
      {activeSubTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                  <th className="py-3 px-4 text-right">Retail Price (₹)</th>
                  <th className="py-3 px-4 text-right">Wholesale Price (₹)</th>
                  <th className="py-3 px-4 text-right">Dealer Price (₹)</th>
                  <th className="py-3 px-4 text-center">GST Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const profitMargin = p.sellingPrice - p.purchasePrice;
                  const marginPct = p.sellingPrice > 0 ? (profitMargin / p.sellingPrice) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">{p.unit}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(p.purchasePrice)}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700 font-mono text-sm">
                        {formatCurrency(p.sellingPrice)}
                        <span className="text-[10px] text-emerald-600 font-normal block">
                          +{marginPct.toFixed(0)}% margin
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrency(p.wholesalePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                        {formatCurrency(p.dealerPrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{p.gstRate}%</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenQuickPrice(p)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-colors inline-flex items-center space-x-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Update Price</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRICE HISTORY AUDIT LOG */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs md:text-sm">Price Change Audit History</h4>
                <p className="text-[11px] text-slate-500">Every price adjustment is permanently logged with timestamps.</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-mono font-semibold">{filteredHistory.length} total logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Tier / Type</th>
                  <th className="py-3 px-4 text-right">Old Price</th>
                  <th className="py-3 px-4 text-center w-8">➔</th>
                  <th className="py-3 px-4 text-right">New Price</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((log) => {
                    const priceDiff = log.newPrice - log.oldPrice;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.changedAt)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.productName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {log.priceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(log.oldPrice)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">➔</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          <span className={priceDiff > 0 ? 'text-blue-700' : 'text-emerald-700'}>
                            {formatCurrency(log.newPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)})
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{log.changedBy}</td>
                        <td className="py-3 px-4 text-slate-600 italic">{log.reason || 'Price adjustment'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No price changes recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Price Update Modal */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Update Prices</h3>
                <p className="text-xs text-slate-500">{quickPriceProduct.name}</p>
              </div>
              <button onClick={() => setQuickPriceProduct(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPrice} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                <div>
                  <span className="text-slate-400">Current Cost:</span>
                  <p className="font-bold text-slate-800">{formatCurrency(quickPriceProduct.purchasePrice)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Current Retail:</span>
                  <p className="font-bold text-blue-600">{formatCurrency(quickPriceProduct.sellingPrice)}</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-blue-700 mb-1">
                  New Retail Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={newRetailPrice}
                  onChange={(e) => setNewRetailPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-400 rounded-xl font-black text-blue-900 text-base focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wholesale Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newWholesalePrice}
                    onChange={(e) => setNewWholesalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dealer Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newDealerPrice}
                    onChange={(e) => setNewDealerPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Price Revision (Logged to History) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="e.g. Factory price increase, commodity market change"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
                >
                  Save & Log to History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
