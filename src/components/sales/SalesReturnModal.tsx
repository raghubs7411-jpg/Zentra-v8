import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

interface SalesReturnModalProps {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnProcessed: () => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  saleId,
  isOpen,
  onClose,
  onReturnProcessed,
}) => {
  const { sales, processSalesReturn } = useApp();
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restockInventory, setRestockInventory] = useState(true);
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Credit Note' | 'Bank Transfer' | 'Adjust Balance'>('Adjust Balance');
  const [returnReason, setReturnReason] = useState('');

  if (!isOpen || !saleId) return null;

  const sale = sales.find((s) => s.id === saleId);
  if (!sale) return null;

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const cleanVal = Math.min(maxQty, Math.max(0, val));
    setReturnQuantities((prev) => ({ ...prev, [itemId]: cleanVal }));
  };

  // Calculate return total
  const returnItems = sale.items
    .map((item) => {
      const returnQty = returnQuantities[item.id] || 0;
      if (returnQty <= 0) return null;
      const rate = item.unitPrice;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: returnQty,
        unit: item.unit,
        unitPrice: rate,
        refundAmount: returnQty * rate,
      };
    })
    .filter(Boolean) as { productId: string; productName: string; quantity: number; unit: string; unitPrice: number; refundAmount: number }[];

  const totalRefund = returnItems.reduce((sum, it) => sum + it.refundAmount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnItems.length === 0) {
      toast.error('Please select at least one item and quantity to return.');
      return;
    }
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return.');
      return;
    }

    processSalesReturn({
      saleId: sale.id,
      items: returnItems,
      totalRefundAmount: totalRefund,
      restockInventory,
      refundMethod,
      reason: returnReason.trim(),
    });

    onReturnProcessed();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Process Sales Return ({sale.invoiceNumber})</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <p className="text-slate-500 text-xs">
            Select items and quantities returned by <strong>{sale.customerName}</strong>. Inventory and customer balance will update automatically.
          </p>

          {/* Items return selector */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-bold text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3 text-center">Billed Qty</th>
                  <th className="py-2.5 px-3 text-center">Return Qty</th>
                  <th className="py-2.5 px-3 text-right">Refund (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item) => {
                  const qty = returnQuantities[item.id] || 0;
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">Rate: {formatCurrency(item.unitPrice)}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={qty || ''}
                          placeholder="0"
                          onChange={(e) => handleQtyChange(item.id, item.quantity, Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(qty * item.unitPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Return Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Refund / Settlement Mode</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Adjust Balance">Adjust Customer Khata Balance</option>
                <option value="Cash">Cash Refund</option>
                <option value="Bank Transfer">Bank Transfer / UPI</option>
                <option value="Credit Note">Issue Credit Note</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="restockCheck"
                checked={restockInventory}
                onChange={(e) => setRestockInventory(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="restockCheck" className="font-semibold text-slate-700 cursor-pointer">
                Restock returned items to Inventory
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Return <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Excess bags left over, wrong item purchased, damaged package"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Refund Summary Banner */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center">
            <span className="font-bold text-indigo-900">Total Refund Amount:</span>
            <span className="text-base font-black text-indigo-700">{formatCurrency(totalRefund)}</span>
          </div>

          {/* Footer Actions */}
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
              disabled={returnItems.length === 0}
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all"
            >
              Confirm Sales Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
