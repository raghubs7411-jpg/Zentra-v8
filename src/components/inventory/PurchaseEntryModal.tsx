import React, { useState } from 'react';
import { X, Truck, Plus, Trash2, Search, DollarSign } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, PurchaseItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, createPurchase } = useApp();

  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [creditDays, setCreditDays] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Dropdown product selection
  const [selectedProdId, setSelectedProdId] = useState('');

  if (!isOpen) return null;

  const handleAddProductItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const existingIdx = items.findIndex((i) => i.productId === prod.id);
    if (existingIdx >= 0) {
      toast.error('Product already added to purchase list.');
      return;
    }

    const newItem: PurchaseItem = {
      id: `pi-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      quantity: 10,
      purchasePrice: prod.purchasePrice,
      gstRate: prod.gstRate,
      totalAmount: 10 * prod.purchasePrice * (1 + prod.gstRate / 100),
    };

    setItems([...items, newItem]);
    setSelectedProdId('');
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'purchasePrice' | 'gstRate',
    val: number
  ) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    const base = item.quantity * item.purchasePrice;
    item.totalAmount = base + (base * item.gstRate) / 100;
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalBillAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !vendorInvoiceNo.trim()) {
      toast.error('Please enter supplier name and vendor invoice number.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product item to the purchase bill.');
      return;
    }

    const paymentStatus: 'Paid' | 'Partially Paid' | 'Pending' =
      amountPaid >= totalBillAmount
        ? 'Paid'
        : amountPaid > 0
        ? 'Partially Paid'
        : 'Pending';

    // Calculate due date from credit days
    const purchaseDateObj = new Date(purchaseDate);
    const dueDate = creditDays > 0
      ? new Date(purchaseDateObj.getTime() + creditDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    createPurchase({
      vendorInvoiceNo: vendorInvoiceNo.trim(),
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || 'N/A',
      supplierGstin: supplierGstin.trim() || undefined,
      date: new Date(purchaseDate).toISOString(),
      creditDays: creditDays > 0 ? creditDays : undefined,
      dueDate,
      items,
      totalAmount: totalBillAmount,
      amountPaid: Number(amountPaid) || 0,
      paymentStatus,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Record Purchase Bill & Stock-In</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier / Vendor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. UltraTech Cement Ltd"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Bill / Invoice # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. UTC-BLR-8912"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Bill Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier Phone</label>
              <input
                type="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="Vendor phone"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
              <input
                type="text"
                value={supplierGstin}
                onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                placeholder="29AAACU0123A1Z1"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor Credit Days</label>
              <input
                type="number"
                min="0"
                value={creditDays}
                onChange={(e) => setCreditDays(Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Days vendor allows before payment is due (e.g. 15 = 15 days credit)</p>
            </div>
          </div>

          {/* Add Product Items to Bill */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">Add Items Received into Warehouse</span>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden font-medium"
              >
                <option value="">-- Select Product from Catalog --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Current Stock: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProductItem}
                disabled={!selectedProdId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all"
              >
                + Add Item
              </button>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-3">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Qty Received</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost (₹)</th>
                      <th className="py-2.5 px-3 text-center">GST %</th>
                      <th className="py-2.5 px-3 text-right">Total Bill (₹)</th>
                      <th className="py-2.5 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.purchasePrice}
                            onChange={(e) => handleUpdateItem(idx, 'purchasePrice', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold focus:outline-hidden"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(idx, 'gstRate', Number(e.target.value))}
                            className="px-1.5 py-1 border border-slate-300 rounded-lg text-[11px] bg-white focus:outline-hidden"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                          {formatCurrency(item.totalAmount)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
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

          {/* Grand Total Strip */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-emerald-900">Total Purchase Value:</span>
              <p className="text-xl font-black text-emerald-800">{formatCurrency(totalBillAmount)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-700">Inventory Increase:</span>
              <p className="font-bold text-emerald-900">
                +{items.reduce((s, i) => s + i.quantity, 0)} Units to Stock
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={items.length === 0}
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all"
            >
              Record Purchase & Increase Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
