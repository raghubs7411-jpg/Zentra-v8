import React from 'react';
import {
  X,
  Printer,
  RotateCcw,
  Ban,
  FileText,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  Building,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '../../utils/formatters';

interface SaleDetailModalProps {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onOpenRecordPayment: (customerId: string, invoiceId: string) => void;
  onOpenSalesReturn: (saleId: string) => void;
  onOpenCancelSale: (saleId: string) => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  saleId,
  isOpen,
  onClose,
  onViewInvoice,
  onOpenRecordPayment,
  onOpenSalesReturn,
  onOpenCancelSale,
}) => {
  const { sales, invoices, currentUser } = useApp();

  if (!isOpen || !saleId) return null;

  const sale = sales.find((s) => s.id === saleId || s.invoiceNumber === saleId);
  if (!sale) return null;

  const matchedInvoice = invoices.find((inv) => inv.saleId === sale.id || inv.invoiceNumber === sale.invoiceNumber);

  // Profit calculation for Managers & Admins
  const totalCost = sale.items.reduce((sum, it) => sum + (it.purchasePrice || 0) * it.quantity, 0);
  const grossProfit = Math.max(0, sale.grandTotal - totalCost);
  const marginPercent = sale.grandTotal > 0 ? (grossProfit / sale.grandTotal) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-xs md:text-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-slate-900 text-base">{sale.invoiceNumber}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  sale.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : sale.paymentStatus === 'Partially Paid'
                    ? 'bg-amber-100 text-amber-700'
                    : sale.paymentStatus === 'Cancelled'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {sale.paymentStatus}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Recorded on {formatDateTime(sale.date)} by {sale.employeeName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Customer Snapshot */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Customer</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{sale.customerName}</p>
              <p className="text-slate-600 text-xs">📞 {formatPhone(sale.customerPhone)}</p>
              {sale.customerAddress && <p className="text-slate-500 text-xs">{sale.customerAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Payment Mode</p>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{sale.paymentMethod}</p>
              {sale.notes && <p className="text-slate-500 text-xs italic mt-1 max-w-[200px] truncate">"{sale.notes}"</p>}
            </div>
          </div>

          {/* Cancellation Banner if cancelled */}
          {sale.paymentStatus === 'Cancelled' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <p className="font-bold">This transaction was cancelled.</p>
              {sale.cancellationReason && <p className="mt-0.5">Reason: {sale.cancellationReason}</p>}
            </div>
          )}

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item / SKU</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Disc</th>
                  <th className="py-2.5 px-3 text-center">GST</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.gstRate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Profit margin view for Managers/Admins */}
            {currentUser.role !== 'Sales' ? (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-emerald-800 flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Profit & Margin Intelligence</span>
                </span>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Cost of Goods (COGS):</span>
                  <span className="font-mono">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Gross Profit:</span>
                  <span className="font-mono">+{formatCurrency(grossProfit)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-600 font-semibold">
                  <span>Margin:</span>
                  <span>{marginPercent.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Totals */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Tax (GST):</span>
                <span>{formatCurrency(sale.totalTax)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-blue-600">{formatCurrency(sale.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Amount Paid:</span>
                <span>{formatCurrency(sale.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span>{formatCurrency(sale.balanceDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {sale.paymentStatus !== 'Cancelled' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCancelSale(sale.id);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Sale</span>
              </button>
            )}

            {sale.paymentStatus !== 'Cancelled' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSalesReturn(sale.id);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return Items</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {sale.balanceDue > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRecordPayment(sale.customerId, matchedInvoice?.id || sale.id);
                }}
                className="flex items-center space-x-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Collect Balance</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onViewInvoice(matchedInvoice?.id || sale.id);
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
