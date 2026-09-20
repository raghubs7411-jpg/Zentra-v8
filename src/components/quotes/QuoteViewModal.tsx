import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Quote } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateQuoteWhatsAppUrl } from '../../utils/whatsapp';
import { useConfirm } from '../ui/ConfirmDialog';
import { toast } from 'sonner';

interface QuoteViewModalProps {
  quoteId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (quote: Quote) => void;
  onConvert: (quote: Quote) => void;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Sent: 'bg-blue-50 text-blue-700 border-blue-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  Expired: 'bg-amber-50 text-amber-700 border-amber-200',
  Converted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const QuoteViewModal: React.FC<QuoteViewModalProps> = ({ quoteId, isOpen, onClose, onEdit, onConvert }) => {
  const { quotes, business, updateQuote, deleteQuote } = useApp();
  const confirmDialog = useConfirm();
  const [busy] = useState(false);

  if (!isOpen || !quoteId) return null;

  const quote = (quotes ?? []).find((q) => q.id === quoteId);
  if (!quote) return null;

  const isExpired =
    (quote.status === 'Sent' || quote.status === 'Draft') &&
    new Date(quote.validUntil) < new Date();

  const effectiveStatus = isExpired ? 'Expired' : quote.status;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const url = generateQuoteWhatsAppUrl(quote.customerPhone, business, quote);
    window.open(url, '_blank');
  };

  const handleMarkStatus = (status: 'Accepted' | 'Rejected' | 'Expired') => {
    updateQuote(quote.id, { status });
    toast.success(`Quote ${quote.quoteNumber} marked as ${status}.`);
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete Quotation',
      message: `Delete quote ${quote.quoteNumber} for ${quote.customerName}? This cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      deleteQuote(quote.id);
      toast.success(`Quote ${quote.quoteNumber} deleted.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Action Toolbar (hidden on print) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2 no-print">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${STATUS_STYLES[effectiveStatus] || STATUS_STYLES.Draft}`}>
              {effectiveStatus}
            </span>
            <span className="text-xs font-mono text-slate-500">{quote.quoteNumber}</span>
          </div>

          <div className="flex items-center space-x-2">
            {(quote.status === 'Sent' || quote.status === 'Draft') && (
              <>
                <button
                  onClick={() => handleMarkStatus('Accepted')}
                  disabled={busy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Accepted</span>
                </button>
                <button
                  onClick={() => handleMarkStatus('Rejected')}
                  disabled={busy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}
            {quote.status !== 'Converted' && quote.status !== 'Rejected' && (
              <button
                onClick={() => onConvert(quote)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Convert to Sale</span>
              </button>
            )}
            {quote.status === 'Draft' && (
              <button
                onClick={() => onEdit(quote)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete quote"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-100">
          <div id="printable-area" className="bg-white shadow-md border border-slate-200 text-slate-900 w-full max-w-[800px] p-6 sm:p-8 rounded-xl">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
              <div className="flex items-start gap-3">
                {business.logoUrl && (
                  <img src={business.logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 block">
                    Quotation / Estimate — Not a Tax Invoice
                  </span>
                  <h1 className="text-xl font-black text-slate-900">{business.name}</h1>
                  <p className="text-[11px] text-slate-600">{business.tagline}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{business.address}, {business.city}, {business.state} - {business.pincode}</p>
                  <p className="text-[11px] text-slate-600 font-semibold">Ph: {business.phone}</p>
                  {business.gstin && (
                    <p className="text-[11px] text-slate-600 font-mono mt-1"><strong>GSTIN:</strong> {business.gstin}</p>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="inline-block bg-indigo-600 text-white px-3 py-1 text-xs font-bold rounded">
                  QUOTATION
                </div>
                <p className="text-[11px] font-mono"><strong>Quote No:</strong> {quote.quoteNumber}</p>
                <p className="text-[11px]"><strong>Date:</strong> {formatDate(quote.date)}</p>
                <p className={`text-[11px] font-bold ${isExpired ? 'text-rose-600' : ''}`}>
                  <strong>Valid Until:</strong> {formatDate(quote.validUntil)}
                </p>
                {quote.status === 'Converted' && (
                  <p className="text-[11px] text-indigo-600 font-bold">✔ Converted to Sale</p>
                )}
              </div>
            </div>

            {/* Customer Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quotation For</p>
                <p className="font-bold text-slate-900">{quote.customerName}</p>
                {quote.customerAddress && <p className="text-slate-600">{quote.customerAddress}</p>}
                <p className="text-slate-600">Ph: {quote.customerPhone}</p>
                {quote.customerGstin && <p className="text-slate-600 font-mono">GSTIN: {quote.customerGstin}</p>}
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Supply Type</p>
                <p className="text-slate-700 font-semibold">
                  {quote.isZeroGst ? 'Bill of Supply (0% GST)' : quote.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                </p>
                <p className="text-slate-500 mt-1">Prepared by: {quote.createdBy}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Product / SKU</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Disc</th>
                  <th className="py-2 px-2 text-center">GST%</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quote.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <p className="font-bold text-slate-800">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </td>
                    <td className="py-2 px-2 text-center font-bold">{item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span></td>
                    <td className="py-2 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 px-2 text-right">{item.discount > 0 ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)) : '-'}</td>
                    <td className="py-2 px-2 text-center font-mono">{item.gstRate}%</td>
                    <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end py-3">
              <div className="w-full sm:w-72 space-y-1 text-xs">
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.totalDiscount > 0 && (
                  <div className="flex justify-between py-0.5 text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(quote.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>{quote.isZeroGst ? 'Tax (0% GST)' : quote.isInterState ? 'IGST:' : 'CGST + SGST:'}</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(quote.totalTax)}</span>
                </div>
                {quote.roundOff !== 0 && (
                  <div className="flex justify-between py-0.5 text-slate-500">
                    <span>Round Off:</span>
                    <span className="font-mono">{formatCurrency(quote.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-sm font-black text-slate-900 border-t-2 border-slate-900">
                  <span>Quoted Total:</span>
                  <span className="text-indigo-600">{formatCurrency(quote.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {quote.notes && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                <p className="text-slate-600">{quote.notes}</p>
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
              <p>1. Rates quoted are valid only until {formatDate(quote.validUntil)} and are subject to stock availability.</p>
              <p>2. This is a rate quotation, not a tax invoice. GST will be applicable at the time of billing.</p>
              <p>3. Delivery charges, if any, will be informed separately at the time of order confirmation.</p>
            </div>

            {/* Signature */}
            <div className="mt-8 flex justify-between items-end text-xs">
              <p className="text-slate-400">Generated by Zentra Suite</p>
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 pt-1 text-slate-600 font-semibold">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
