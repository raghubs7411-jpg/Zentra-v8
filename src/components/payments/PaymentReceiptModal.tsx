import React from 'react';
import { X, Printer, Download, Share2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment } from '../../types';
import { formatCurrency, formatDate, formatDateTime, numberToWords } from '../../utils/formatters';

interface PaymentReceiptModalProps {
  paymentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const { payments, business } = useApp();

  if (!isOpen || !paymentId) return null;

  const payment = payments.find((p) => p.id === paymentId || p.paymentNumber === paymentId);
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Payment Receipt Voucher</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Voucher */}
        <div className="p-6 overflow-y-auto flex justify-center bg-slate-100">
          <div
            id="printable-area"
            className="w-full max-w-lg bg-white p-6 rounded-xl border border-slate-300 shadow-xs space-y-4 text-xs"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h2 className="text-lg font-black text-slate-900">{business.name}</h2>
              <p className="text-[11px] text-slate-600">{business.address}, {business.city}</p>
              <p className="text-[11px] text-slate-600">Ph: {business.phone} • GSTIN: {business.gstin}</p>
              <div className="mt-2 inline-block bg-slate-900 text-white px-3 py-0.5 font-bold uppercase tracking-wider text-[10px] rounded">
                Official Money Receipt Voucher
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <div>
                <p><strong>Receipt No:</strong> <span className="font-mono">{payment.paymentNumber}</span></p>
                <p><strong>Date:</strong> {formatDateTime(payment.paymentDate)}</p>
              </div>
              <div className="text-right">
                {payment.invoiceNumber && (
                  <p><strong>Invoice Ref:</strong> <span className="font-mono">{payment.invoiceNumber}</span></p>
                )}
                <p><strong>Payment Mode:</strong> {payment.paymentMethod}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="text-slate-700">
                Received with thanks from: <strong className="text-slate-900 text-sm">{payment.customerName}</strong>
              </p>
              <p className="text-slate-700">
                The sum of Rupees: <strong className="italic text-slate-900">{numberToWords(payment.amount)}</strong>
              </p>
              <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                <span className="text-xs font-bold text-slate-600">Amount Received:</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            </div>

            {/* Details & Signature */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="text-slate-500 text-[11px] space-y-1">
                {payment.referenceNo && <p><strong>Ref / UTR:</strong> {payment.referenceNo}</p>}
                {payment.chequeNumber && <p><strong>Cheque #:</strong> {payment.chequeNumber} ({payment.bankName})</p>}
                {payment.notes && <p><strong>Notes:</strong> {payment.notes}</p>}
                <p><strong>Recorded By:</strong> {payment.recordedBy}</p>
              </div>

              <div className="text-right text-[11px] space-y-8">
                <p className="font-bold text-slate-800">For {business.name}</p>
                <p className="text-slate-500 border-t border-slate-300 pt-1 inline-block min-w-[120px]">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
