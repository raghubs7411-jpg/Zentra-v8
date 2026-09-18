import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  DollarSign,
  Building,
  RotateCcw,
  FileText,
  Smartphone,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, Sale } from '../../types';
import { formatCurrency, formatDate, formatDateTime, numberToWords, formatPhone } from '../../utils/formatters';
import { generateInvoiceWhatsAppUrl } from '../../utils/whatsapp';

interface InvoiceViewModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordPayment?: (customerId: string, invoiceId: string) => void;
  onOpenSalesReturn?: (saleId: string) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
  onOpenRecordPayment,
  onOpenSalesReturn,
}) => {
  const { invoices, sales, business } = useApp();
  const [template, setTemplate] = useState<'gst' | 'classic' | 'thermal'>('gst');

  if (!isOpen || !invoiceId) return null;

  // Invoice could be referenced by invoice id or sale id
  const invoice =
    invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId) ||
    invoices.find((i) => i.saleId === invoiceId);

  if (!invoice) return null;

  const sale = sales.find((s) => s.id === invoice.saleId || s.invoiceNumber === invoice.invoiceNumber);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const url = generateInvoiceWhatsAppUrl(invoice.customerPhone, business, invoice);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Action & Template Toolbar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2 no-print">
          <div className="cir-tabs">
              <button
                onClick={() => setTemplate('gst')}
                className={`cir-tabs__t ${template === 'gst' ? 'is-active' : ''}`}
              >
                GST Tax A4
              </button>
              <button
                onClick={() => setTemplate('classic')}
                className={`cir-tabs__t ${template === 'classic' ? 'is-active' : ''}`}
              >
                Classic
              </button>
              <button
                onClick={() => setTemplate('thermal')}
                className={`cir-tabs__t ${template === 'thermal' ? 'is-active' : ''}`}
              >
                Thermal POS (80mm)
              </button>
          </div>

          <div className="flex items-center space-x-2">
            {invoice.balanceDue > 0 && onOpenRecordPayment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRecordPayment(invoice.customerId, invoice.id);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            {sale && onOpenSalesReturn && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSalesReturn(sale.id);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return</span>
              </button>
            )}

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-100">
          <div
            id="printable-area"
            className={`bg-white shadow-md border border-slate-200 text-slate-900 transition-all ${
              template === 'thermal' ? 'w-[360px] p-4 text-xs font-mono' : 'w-full max-w-[800px] p-6 sm:p-8 rounded-xl'
            }`}
          >
            {/* ---------------------------------------------------- */}
            {/* TEMPLATE 1: GST TAX INVOICE (A4)                    */}
            {/* ---------------------------------------------------- */}
            {template === 'gst' && (
              <div className="space-y-4 text-xs">
                {/* Header Title Banner */}
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    {business.logoUrl && (
                      <img src={business.logoUrl} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
                    )}
                    <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      {invoice.isZeroGst || invoice.totalTax === 0
                        ? 'Bill of Supply / Commercial Invoice'
                        : 'Tax Invoice (Original for Recipient)'}
                    </span>
                    <h1 className="text-xl font-black text-slate-900">{business.name}</h1>
                    <p className="text-[11px] text-slate-600">{business.tagline}</p>
                    <p className="text-[11px] text-slate-600 mt-1">{business.address}, {business.city}, {business.state} - {business.pincode}</p>
                    <p className="text-[11px] text-slate-600 font-semibold">
                      Ph: {business.phone} • Email: {business.email}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 font-mono text-[11px]">
                      <span><strong>GSTIN:</strong> {business.gstin}</span>
                      <span><strong>State Code:</strong> {business.stateCode}</span>
                      <span><strong>PAN:</strong> {business.pan}</span>
                    </div>
                  </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-block text-white px-3 py-1 text-xs font-bold rounded ${
                        invoice.isZeroGst || invoice.totalTax === 0 ? 'bg-emerald-800' : 'bg-slate-900'
                      }`}
                    >
                      {invoice.isZeroGst || invoice.totalTax === 0 ? 'BILL OF SUPPLY' : 'TAX INVOICE'}
                    </div>
                    <p className="font-mono text-sm font-black mt-2 text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-500">Date: {formatDate(invoice.date)}</p>
                    <p className="text-[11px] text-slate-500">Due: {formatDate(invoice.dueDate)}</p>
                  </div>
                </div>

                {/* Bill To / Ship To Grid */}
                <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Billed To (Customer):</p>
                    <p className="font-bold text-slate-900 text-sm">{invoice.customerName}</p>
                    <p className="text-[11px] text-slate-600">{invoice.customerAddress || 'Address not specified'}</p>
                    <p className="text-[11px] text-slate-600">Ph: {formatPhone(invoice.customerPhone)}</p>
                    {invoice.customerGstin && (
                      <p className="text-[11px] font-mono text-slate-700 font-semibold mt-0.5">
                        GSTIN: {invoice.customerGstin}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Payment Status:</p>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full mt-1 ${
                        invoice.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : invoice.paymentStatus === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {invoice.paymentStatus.toUpperCase()}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Amount Paid: <strong>{formatCurrency(invoice.amountPaid)}</strong>
                    </p>
                    <p className="text-[11px] text-slate-700">
                      Balance Due: <strong className="text-rose-600">{formatCurrency(invoice.balanceDue)}</strong>
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2">Item Description</th>
                        <th className="py-2 px-2 text-center">HSN/SKU</th>
                        <th className="py-2 px-2 text-center">Qty / Unit</th>
                        <th className="py-2 px-2 text-right">Rate (₹)</th>
                        <th className="py-2 px-2 text-right">Disc</th>
                        <th className="py-2 px-2 text-right">Taxable</th>
                        <th className="py-2 px-2 text-center">GST</th>
                        <th className="py-2 px-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoice.items.map((item, idx) => {
                        const discountAmt =
                          item.discountType === 'percentage'
                            ? (item.unitPrice * item.quantity * item.discount) / 100
                            : item.discount;
                        const taxable = item.unitPrice * item.quantity - discountAmt;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-2">
                              <p className="font-bold text-slate-900">{item.productName}</p>
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">{item.sku}</td>
                            <td className="py-2 px-2 text-center font-semibold">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unitPrice, false)}</td>
                            <td className="py-2 px-2 text-right text-slate-500">
                              {discountAmt > 0 ? formatCurrency(discountAmt, false) : '-'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">{formatCurrency(taxable, false)}</td>
                            <td className="py-2 px-2 text-center font-mono">{item.gstRate}%</td>
                            <td className="py-2 px-2 text-right font-bold font-mono">
                              {formatCurrency(item.totalAmount, false)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Financials & Bank Details Grid */}
                <div className="grid grid-cols-12 gap-4 pt-2">
                  {/* Bank & Payment Info (7 Cols) */}
                  <div className="col-span-7 space-y-3">
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Bank Details for Direct Payment:
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 font-mono">
                        <div>Bank: <strong>{business.bankDetails.bankName}</strong></div>
                        <div>A/C: <strong>{business.bankDetails.accountNo}</strong></div>
                        <div>IFSC: <strong>{business.bankDetails.ifscCode}</strong></div>
                        <div>UPI ID: <strong>{business.bankDetails.upiId}</strong></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Total in Words:</p>
                      <p className="text-[11px] font-bold text-slate-800 italic">
                        {numberToWords(invoice.grandTotal)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Terms & Conditions:</p>
                      <p className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
                        {business.invoiceTerms}
                      </p>
                    </div>
                  </div>

                  {/* Calculations Summary (5 Cols) */}
                  <div className="col-span-5 border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50/50">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.totalDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Total Discount:</span>
                        <span className="font-mono">-{formatCurrency(invoice.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (Central Tax):</span>
                      <span className="font-mono">{formatCurrency(invoice.totalTax / 2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (State Tax):</span>
                      <span className="font-mono">{formatCurrency(invoice.totalTax / 2)}</span>
                    </div>
                    {invoice.roundOff !== 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Round Off:</span>
                        <span className="font-mono">{formatCurrency(invoice.roundOff)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-blue-600 font-mono">{formatCurrency(invoice.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 pt-1 text-xs">
                      <span>Amount Received:</span>
                      <span className="font-bold text-emerald-600 font-mono">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 text-xs">
                      <span>Balance Outstanding:</span>
                      <span className="font-black text-rose-600 font-mono">{formatCurrency(invoice.balanceDue)}</span>
                    </div>

                    <div className="pt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 mt-4">
                      <p className="font-bold text-slate-800">For {business.name}</p>
                      <p className="mt-6">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TEMPLATE 2: CLASSIC BILL                            */}
            {/* ---------------------------------------------------- */}
            {template === 'classic' && (
              <div className="space-y-4 text-xs">
                <div className="text-center border-b border-slate-300 pb-3">
                  {business.logoUrl && (
                    <img src={business.logoUrl} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />
                  )}
                  <h2 className="text-xl font-bold text-slate-900">{business.name}</h2>
                  <p className="text-slate-600">{business.address}, {business.city} • Ph: {business.phone}</p>
                  <h3 className="text-sm font-bold uppercase tracking-widest mt-2">Retail Invoice / Cash Bill</h3>
                </div>

                <div className="flex justify-between text-xs py-2 border-b border-slate-200">
                  <div>
                    <p><strong>Customer:</strong> {invoice.customerName}</p>
                    <p><strong>Phone:</strong> {invoice.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Bill No:</strong> {invoice.invoiceNumber}</p>
                    <p><strong>Date:</strong> {formatDate(invoice.date)}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold">
                      <th className="py-2">Item</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2">{item.productName}</td>
                        <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                        <td className="py-2 text-right">{formatCurrency(item.unitPrice, false)}</td>
                        <td className="py-2 text-right font-bold">{formatCurrency(item.totalAmount, false)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t-2 border-slate-800 pt-2 text-right space-y-1">
                  <p className="text-sm font-black">Total: {formatCurrency(invoice.grandTotal)}</p>
                  <p>Paid: {formatCurrency(invoice.amountPaid)}</p>
                  <p className="font-bold text-rose-600">Balance: {formatCurrency(invoice.balanceDue)}</p>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TEMPLATE 3: THERMAL POS SLIP (80mm)                 */}
            {/* ---------------------------------------------------- */}
            {template === 'thermal' && (
              <div className="space-y-2 text-center text-xs">
                {business.logoUrl && (
                  <img src={business.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto" />
                )}
                <p className="font-black text-sm">{business.name}</p>
                <p className="text-[10px] text-slate-600">{business.address}, {business.city}</p>
                <p className="text-[10px] text-slate-600">Ph: {business.phone} | GSTIN: {business.gstin}</p>
                <div className="border-t border-b border-dashed border-slate-400 py-1 text-[11px] text-left">
                  <p>Inv #: {invoice.invoiceNumber}</p>
                  <p>Date: {formatDateTime(invoice.date)}</p>
                  <p>Cust: {invoice.customerName} ({invoice.customerPhone})</p>
                </div>

                <div className="text-left space-y-1 pt-1">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-[11px]">
                      <div className="truncate max-w-[200px]">
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.quantity} {item.unit} x {item.unitPrice}
                        </p>
                      </div>
                      <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1 text-right text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Tax (GST):</span>
                    <span>{formatCurrency(invoice.totalTax)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-900">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>Balance:</span>
                    <span>{formatCurrency(invoice.balanceDue)}</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 border-t border-dashed border-slate-300">
                  <p>UPI: {business.bankDetails.upiId}</p>
                  <p className="mt-1 font-bold">*** Thank You! Visit Again ***</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
