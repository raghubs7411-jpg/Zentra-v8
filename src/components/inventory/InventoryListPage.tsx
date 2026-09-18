import React, { useState } from 'react';
import {
  Package,
  Search,
  PlusCircle,
  AlertTriangle,
  SlidersHorizontal,
  Edit2,
  Download,
  DollarSign,
  Truck,
  TrendingUp,
  Tag,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { useConfirm } from '../ui/ConfirmDialog';
import { toast } from 'sonner';

interface InventoryListPageProps {
  onOpenProductForm: (productToEdit?: Product | null) => void;
  onOpenStockAdjust: (productId: string) => void;
  onOpenQuickPurchase: () => void;
  onOpenPriceHistory: (productId?: string) => void;
}

export const InventoryListPage: React.FC<InventoryListPageProps> = ({
  onOpenProductForm,
  onOpenStockAdjust,
  onOpenQuickPurchase,
  onOpenPriceHistory,
}) => {
  const { products, currentUser, hasPermission, deleteProduct } = useApp();
  const confirmDialog = useConfirm();
  const canDelete = hasPermission('canDeleteProducts');
  const canModifyStock = hasPermission('canModifyStock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Filter products
  const filteredProducts = products.filter((prod) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        (prod.barcode && prod.barcode.includes(q)) ||
        prod.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (categoryFilter !== 'ALL' && prod.category !== categoryFilter) {
      return false;
    }

    if (onlyLowStock && prod.currentStock > prod.minStockLevel) {
      return false;
    }

    return true;
  });

  const lowStockItems = products.filter((p) => p.currentStock <= p.minStockLevel);
  const totalCostValuation = products.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
  const totalRetailValuation = products.reduce((sum, p) => sum + p.sellingPrice * p.currentStock, 0);

  const handleExportCsv = () => {
    const data = filteredProducts.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category,
      Unit: p.unit,
      'Cost Price': p.purchasePrice,
      'Retail Price': p.sellingPrice,
      'Wholesale Price': p.wholesalePrice,
      'Dealer Price': p.dealerPrice,
      'Current Stock': p.currentStock,
      'Min Level': p.minStockLevel,
      'GST %': p.gstRate,
      HSN: p.hsnCode || '',
    }));
    exportToCsvFile(data, 'Products_Inventory_Report');
  };

  const handleDeleteProduct = async (prod: Product) => {
    const ok = await confirmDialog({
      title: 'Delete Product',
      message: `Are you sure you want to permanently delete "${prod.name}" (SKU: ${prod.sku})? This cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      deleteProduct(prod.id);
      toast.success(`Product "${prod.name}" deleted.`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Products & Inventory Management</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Multi-unit catalog, stock alerts, purchase cost, and valuation tracking.
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
            onClick={onOpenQuickPurchase}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Truck className="w-4 h-4" />
            <span>+ Stock In (Purchase)</span>
          </button>
          <button
            onClick={() => onOpenProductForm(null)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Products</span>
          <p className="text-xl font-black text-slate-900 mt-1">{products.length} SKUs</p>
          <p className="text-xs text-slate-400 mt-0.5">{categories.length} categories</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Low Stock Items</span>
          <p className={`text-xl font-black mt-1 ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {lowStockItems.length} Products
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Need immediate replenishment</p>
        </div>

        {/* Cost & Retail Valuation (Visible for Managers & Admins) */}
        {currentUser.role !== 'Sales' ? (
          <>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost Valuation</span>
              <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalCostValuation)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total stock at purchase price</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retail Valuation</span>
              <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totalRetailValuation)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Projected revenue potential</p>
            </div>
          </>
        ) : (
          <div className="col-span-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-200 flex items-center justify-between text-xs text-blue-900">
            <div>
              <p className="font-bold">Catalog Ready for Billing</p>
              <p className="text-blue-700 mt-0.5">All product retail rates and stock levels are active.</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, product name, barcode, category..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Low Stock toggle button */}
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              onlyLowStock
                ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{onlyLowStock ? '✓ Low Stock Only' : 'Low Stock Warning'}</span>
          </button>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Unit</th>
                {currentUser.role !== 'Sales' && <th className="py-3 px-4 text-right">Cost Price</th>}
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-right">Wholesale</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isLow = prod.currentStock <= prod.minStockLevel;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{prod.sku}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{prod.name}</p>
                        {prod.hsnCode && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            HSN: {prod.hsnCode} • GST: {prod.gstRate}%
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {prod.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">{prod.unit}</td>
                      {currentUser.role !== 'Sales' && (
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(prod.purchasePrice)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-bold text-blue-700 font-mono">
                        {formatCurrency(prod.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(prod.wholesalePrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-black px-2 py-0.5 rounded-md text-xs ${
                              isLow ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {prod.currentStock} {prod.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Min: {prod.minStockLevel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onOpenStockAdjust(prod.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Adjust / Stock In"
                            disabled={!canModifyStock}
                          >
                            <SlidersHorizontal className={`w-4 h-4 ${!canModifyStock ? 'opacity-30 cursor-not-allowed' : ''}`} />
                          </button>
                          <button
                            onClick={() => onOpenProductForm(prod)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product & Prices"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
