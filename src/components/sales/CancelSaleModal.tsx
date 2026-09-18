import React, { useState } from 'react';
import { X, Ban, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

interface CancelSaleModalProps {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaleCancelled: () => void;
}

export const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  saleId,
  isOpen,
  onClose,
  onSaleCancelled,
}) => {
  const { sales, cancelSale } = useApp();
  const [reason, setReason] = useState('');

  if (!isOpen || !saleId) return null;

  const sale = sales.find((s) => s.id === saleId);
  if (!sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please enter a cancellation reason.');
      return;
    }

    const success = cancelSale(sale.id, reason.trim());
    if (success) {
      onSaleCancelled();
      onClose();
    } else {
      toast.error('Failed to cancel sale.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs md:text-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/50">
          <div className="flex items-center space-x-2 text-rose-700">
            <Ban className="w-5 h-5" />
            <h3 className="font-bold text-base">Cancel Invoice {sale.invoiceNumber}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Cancellation Impact:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-800">
                  <li>Invoice will be marked as <strong>Cancelled</strong>.</li>
                  <li>Product inventory quantities will be automatically restored.</li>
                  <li>Customer outstanding balance will be reduced by {formatCurrency(sale.balanceDue)}.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate entry by mistake, customer cancelled order before dispatch..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all"
            >
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
