import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Printer,
  Share2,
  DollarSign,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, PaymentStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { generateInvoiceWhatsAppUrl } from '../../utils/whatsapp';

interface InvoicesListPageProps {
  onViewInvoice: (invoiceId: string) => void;
  onRecordPayment: (customerId: string, invoiceId: string) => void;
}

export const InvoicesListPage: React.FC<InvoicesListPageProps> = ({
  onViewInvoice,
  onRecordPayment,
}) => {
  const { invoices, business } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');

  // Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q) ||
        (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL' && inv.paymentStatus !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const today = new Date().toISOString().slice(0, 10);
      const invDate = inv.date.slice(0, 10);

      if (dateFilter === 'TODAY' && invDate !== today) return false;
      if (dateFilter === 'THIS_MONTH' && inv.date.slice(0, 7) !== today.slice(0, 7)) return false;
    }

    return true;
  });

  const handleExportCsv = () => {
    const data = filteredInvoices.map((inv) => ({
      'Invoice No': inv.invoiceNumber,
      Date: formatDate(inv.date),
      Customer: inv.customerName,
      Phone: inv.customerPhone,
      GSTIN: inv.customerGstin || '',
      Subtotal: inv.subtotal,
      Tax: inv.totalTax,
      'Grand Total': inv.grandTotal,
      'Amount Paid': inv.amountPaid,
      'Balance Due': inv.balanceDue,
      Status: inv.paymentStatus,
    }));
    exportToCsvFile(data, 'Invoices_Register');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Invoices Management</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            View, print, export and manage customer tax invoices.
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
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-72 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, customer, mobile..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {(['ALL', 'Paid', 'Partially Paid', 'Pending', 'Cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl border transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status === 'ALL' ? 'All Invoices' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(inv.date)}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{inv.customerName}</p>
                      <p className="text-[11px] text-slate-400">{inv.customerPhone}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      {formatCurrency(inv.amountPaid)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${inv.balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {formatCurrency(inv.balanceDue)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-700'
                            : inv.paymentStatus === 'Cancelled'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const url = generateInvoiceWhatsAppUrl(inv.customerPhone, business, inv);
                            window.open(url, '_blank');
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => onRecordPayment(inv.customerId, inv.id)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-[11px] transition-colors"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No invoices matching the selected filters.
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
