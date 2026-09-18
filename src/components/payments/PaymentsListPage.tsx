import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  PlusCircle,
  Download,
  Eye,
  Printer,
  DollarSign,
  Calendar,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';

interface PaymentsListPageProps {
  onOpenRecordPayment: (customerId?: string, invoiceId?: string) => void;
  onViewReceipt: (paymentId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const PaymentsListPage: React.FC<PaymentsListPageProps> = ({
  onOpenRecordPayment,
  onViewReceipt,
  onViewInvoice,
}) => {
  const { payments, customers } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');

  const filteredPayments = payments.filter((pay) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        pay.paymentNumber.toLowerCase().includes(q) ||
        pay.customerName.toLowerCase().includes(q) ||
        (pay.invoiceNumber && pay.invoiceNumber.toLowerCase().includes(q)) ||
        (pay.referenceNo && pay.referenceNo.toLowerCase().includes(q)) ||
        (pay.chequeNumber && pay.chequeNumber.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (methodFilter !== 'ALL' && pay.paymentMethod !== methodFilter) {
      return false;
    }

    return true;
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const upiCollected = payments.filter((p) => p.paymentMethod === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = payments.filter((p) => p.paymentMethod === 'Cash').reduce((sum, p) => sum + p.amount, 0);
  const bankCollected = payments.filter((p) => p.paymentMethod === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);

  const handleExportCsv = () => {
    const data = filteredPayments.map((p) => ({
      'Receipt #': p.paymentNumber,
      Date: formatDate(p.paymentDate),
      Customer: p.customerName,
      'Invoice Ref': p.invoiceNumber || 'General Khata',
      'Payment Mode': p.paymentMethod,
      'Amount (₹)': p.amount,
      'Reference / UTR': p.referenceNo || p.chequeNumber || '',
      'Recorded By': p.recordedBy,
    }));
    exportToCsvFile(data, 'Payments_Receipts_Register');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>Payments Register & Khata Receipts</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Track customer collections, payment receipts, and settlement vouchers.
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
            onClick={() => onOpenRecordPayment()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Lifetime Collected</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{payments.length} total receipts issued</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">UPI Collections</span>
          <p className="text-xl font-black text-blue-600 mt-1">{formatCurrency(upiCollected)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Instant QR / App payments</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Cash Collections</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(cashCollected)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Counter cash received</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Bank / NEFT / Cheque</span>
          <p className="text-xl font-black text-purple-600 mt-1">{formatCurrency(bankCollected)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Direct bank settlements</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt #, customer, UTR ref, invoice #..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {(['ALL', 'UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMethodFilter(mode)}
              className={`px-3 py-1.5 rounded-xl border transition-all ${
                methodFilter === mode
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {mode === 'ALL' ? 'All Modes' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice Reference</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Reference / UTR / Cheque</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Receipt Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{pay.paymentNumber}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <p>{formatDate(pay.paymentDate)}</p>
                      <p className="text-[10px] text-slate-400">By: {pay.recordedBy}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{pay.customerName}</td>
                    <td className="py-3 px-4">
                      {pay.invoiceNumber ? (
                        <button
                          onClick={() => onViewInvoice(pay.invoiceId || pay.invoiceNumber!)}
                          className="font-mono text-blue-600 font-bold hover:underline"
                        >
                          {pay.invoiceNumber}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">General Settlement</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {pay.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {pay.referenceNo || pay.chequeNumber ? (
                        <span>{pay.referenceNo || `Cheque #${pay.chequeNumber}`}</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 font-mono text-sm">
                      {formatCurrency(pay.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewReceipt(pay.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-[11px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No payment receipts found matching your search.
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
