import React, { useState } from 'react';
import { Truck, PlusCircle, Search, Download, Calendar, Edit2, Clock, AlertCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { toast } from 'sonner';
import { Purchase } from '../../types';

interface PurchasesListPageProps {
  onOpenNewPurchase: () => void;
}

export const PurchasesListPage: React.FC<PurchasesListPageProps> = ({ onOpenNewPurchase }) => {
  const { purchases, updatePurchasePayment } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editAmount, setEditAmount] = useState(0);

  const filteredPurchases = purchases.filter((pur) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        pur.purchaseNumber.toLowerCase().includes(q) ||
        pur.vendorInvoiceNo.toLowerCase().includes(q) ||
        pur.supplierName.toLowerCase().includes(q) ||
        pur.items.some((it) => it.productName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalUnpaid = purchases.reduce((sum, p) => sum + (p.totalAmount - p.amountPaid), 0);

  const handleExportCsv = () => {
    const data = filteredPurchases.map((p) => ({
      'Purchase #': p.purchaseNumber,
      'Vendor Inv #': p.vendorInvoiceNo,
      Supplier: p.supplierName,
      Phone: p.supplierPhone,
      Date: formatDate(p.date),
      'Credit Days': p.creditDays || 0,
      'Due Date': p.dueDate ? formatDate(p.dueDate) : 'N/A',
      Items: p.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join('; '),
      'Total Bill': p.totalAmount,
      'Paid': p.amountPaid,
      Status: p.paymentStatus,
    }));
    exportToCsvFile(data, 'Purchases_Inward_Register');
  };

  const handleEditPayment = (pur: Purchase) => {
    setEditingPurchase(pur);
    setEditAmount(pur.amountPaid);
  };

  const handleSavePayment = () => {
    if (!editingPurchase) return;
    if (editAmount < 0) {
      toast.error('Amount cannot be negative.');
      return;
    }
    if (editAmount > editingPurchase.totalAmount) {
      toast.error('Amount paid cannot exceed total bill amount.');
      return;
    }
    updatePurchasePayment(editingPurchase.id, editAmount);
    toast.success('Payment updated successfully.');
    setEditingPurchase(null);
  };

  // Check if a purchase payment is overdue
  const isOverdue = (pur: Purchase) => {
    if (pur.paymentStatus === 'Paid') return false;
    if (!pur.dueDate) return false;
    return new Date(pur.dueDate) < new Date();
  };

  const daysUntilDue = (pur: Purchase) => {
    if (!pur.dueDate) return null;
    const diff = new Date(pur.dueDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Purchases & Stock-In Bills</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Vendor purchases that automatically increase warehouse product inventory.
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
            onClick={onOpenNewPurchase}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Purchase</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase Bills</span>
          <p className="text-xl font-black text-slate-900 mt-1">{purchases.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Recorded vendor receipts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Inventory Inflow</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(totalPurchasesAmount)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total stock purchase value</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Outstanding to Vendors</span>
          <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(totalUnpaid)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Pending vendor payments</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Workflow Sync</span>
          <p className="text-sm font-bold text-slate-800 mt-1">Purchase to Stock Increase</p>
          <p className="text-xs text-slate-400 mt-0.5">Automated inventory update active</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, invoice #, product..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-4">Vendor Bill #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Items Received</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((pur) => {
                  const overdue = isOverdue(pur);
                  const days = daysUntilDue(pur);
                  return (
                    <tr key={pur.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{pur.purchaseNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{pur.vendorInvoiceNo}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{pur.supplierName}</p>
                        {pur.supplierGstin && <p className="text-[10px] text-slate-400 font-mono">GSTIN: {pur.supplierGstin}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(pur.date)}</td>
                      <td className="py-3 px-4">
                        {pur.dueDate ? (
                          <div>
                            <p className={overdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                              {formatDate(pur.dueDate)}
                            </p>
                            {pur.creditDays && (
                              <p className="text-[10px] text-slate-400">{pur.creditDays} days credit</p>
                            )}
                            {overdue && (
                              <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </p>
                            )}
                            {!overdue && days !== null && days <= 3 && days >= 0 && (
                              <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> Due in {days}d
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{pur.items.length} items</span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {pur.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(pur.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(pur.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            pur.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : pur.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {pur.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pur.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleEditPayment(pur)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                            title="Update Payment"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Pay</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    No purchase records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Update Vendor Payment</h3>
              </div>
              <button onClick={() => setEditingPurchase(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-bold text-slate-800">{editingPurchase.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase #:</span>
                  <span className="font-mono font-bold text-slate-800">{editingPurchase.purchaseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(editingPurchase.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance Due:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(editingPurchase.totalAmount - editAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Amount Paid (Total paid to vendor so far)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  min={0}
                  max={editingPurchase.totalAmount}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the total amount paid. Balance will be recalculated automatically.
                </p>
              </div>

              {/* Quick full payment button */}
              {editAmount < editingPurchase.totalAmount && (
                <button
                  onClick={() => setEditAmount(editingPurchase.totalAmount)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors border border-emerald-200"
                >
                  Mark as Fully Paid ({formatCurrency(editingPurchase.totalAmount)})
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setEditingPurchase(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
