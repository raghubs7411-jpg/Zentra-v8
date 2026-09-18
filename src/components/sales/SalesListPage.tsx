import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  Printer,
  Share2,
  DollarSign,
  Calendar,
  ChevronDown,
  RotateCcw,
  Ban,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentStatus, PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { generateInvoiceWhatsAppUrl } from '../../utils/whatsapp';
import { useConfirm } from '../ui/ConfirmDialog';
import { toast } from 'sonner';

interface SalesListPageProps {
  onNavigateNewSale: () => void;
  onViewSaleDetail: (saleId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onRecordPayment: (customerId: string, invoiceId: string) => void;
  onOpenSalesReturn: (saleId: string) => void;
  onOpenCancelSale: (saleId: string) => void;
}

export const SalesListPage: React.FC<SalesListPageProps> = ({
  onNavigateNewSale,
  onViewSaleDetail,
  onViewInvoice,
  onRecordPayment,
  onOpenSalesReturn,
  onOpenCancelSale,
}) => {
  const { sales, invoices, business, hasPermission, deleteSale } = useApp();
  const confirmDialog = useConfirm();
  const canDeleteSales = hasPermission('canDeleteSales');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY'
  >('ALL');

  // Filter computation
  const filteredSales = sales.filter((sale) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        sale.invoiceNumber.toLowerCase().includes(q) ||
        sale.customerName.toLowerCase().includes(q) ||
        sale.customerPhone.includes(q) ||
        sale.employeeName.toLowerCase().includes(q) ||
        sale.items.some((it) => it.productName.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL' && sale.paymentStatus !== statusFilter) {
      return false;
    }

    // 3. Payment Method Filter
    if (methodFilter !== 'ALL' && sale.paymentMethod !== methodFilter) {
      return false;
    }

    // 4. Period Filter
    if (periodFilter !== 'ALL') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const saleDateStr = sale.date.slice(0, 10);

      if (periodFilter === 'TODAY' && saleDateStr !== todayStr) return false;

      if (periodFilter === 'YESTERDAY') {
        const yest = new Date();
        yest.setDate(now.getDate() - 1);
        if (saleDateStr !== yest.toISOString().slice(0, 10)) return false;
      }

      if (periodFilter === 'THIS_MONTH') {
        if (sale.date.slice(0, 7) !== todayStr.slice(0, 7)) return false;
      }

      if (periodFilter === 'LAST_MONTH') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = lastMonth.toISOString().slice(0, 7);
        if (sale.date.slice(0, 7) !== lastMonthStr) return false;
      }

      if (periodFilter === 'THIS_FY') {
        // Indian FY: Apr 1 to Mar 31
        const year = now.getFullYear();
        const fyStart = now.getMonth() >= 3 ? `${year}-04-01` : `${year - 1}-04-01`;
        if (saleDateStr < fyStart) return false;
      }
    }

    return true;
  });

  // Filtered totals
  const totalFilteredSales = filteredSales
    .filter((s) => s.paymentStatus !== 'Cancelled')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const totalFilteredPaid = filteredSales
    .filter((s) => s.paymentStatus !== 'Cancelled')
    .reduce((sum, s) => sum + s.amountPaid, 0);

  const totalFilteredBalance = filteredSales
    .filter((s) => s.paymentStatus !== 'Cancelled')
    .reduce((sum, s) => sum + s.balanceDue, 0);

  const handleExportCsv = () => {
    const data = filteredSales.map((s) => ({
      'Invoice No': s.invoiceNumber,
      Date: formatDate(s.date),
      Customer: s.customerName,
      Phone: s.customerPhone,
      Items: s.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join('; '),
      'Grand Total': s.grandTotal,
      'Amount Paid': s.amountPaid,
      'Balance Due': s.balanceDue,
      'Payment Status': s.paymentStatus,
      'Payment Mode': s.paymentMethod,
      'Employee': s.employeeName,
    }));
    exportToCsvFile(data, 'Sales_Report');
  };

  const handleDeleteSale = async (sale: Sale) => {
    const ok = await confirmDialog({
      title: 'Delete Bill',
      message: `Permanently delete invoice ${sale.invoiceNumber} for ${sale.customerName}? Stock will be reversed and linked payments removed. This cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      deleteSale(sale.id);
      toast.success(`Bill ${sale.invoiceNumber} deleted.`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Sales History & Management</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Complete transaction registry with period filtering, returns, and invoice actions.
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
            onClick={onNavigateNewSale}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Sale</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all text-xs">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer, item name, employee..."
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Date Period Filter — Cir-Tabs Pill Design */}
          <div className="cir-tabs">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'THIS_FY', label: 'This FY' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as any)}
                className={`cir-tabs__t ${periodFilter === p.id ? 'is-active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters: Status and Payment Method */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Filter By:</span>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending / Khata</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Method filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
            <option value="Credit">Credit / Khata</option>
          </select>

          {/* Active selection count */}
          <span className="text-slate-400 ml-auto font-mono text-[11px]">
            Showing {filteredSales.length} of {sales.length} transactions
          </span>
        </div>
      </div>

      {/* Summary KPI Strip for Filtered Results */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900 text-white rounded-2xl shadow-sm text-xs">
        <div className="px-3 border-r border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Filtered Billed Total</span>
          <p className="text-base md:text-lg font-black text-white mt-0.5">{formatCurrency(totalFilteredSales)}</p>
        </div>
        <div className="px-3 border-r border-slate-800">
          <span className="text-emerald-400 text-[10px] uppercase font-bold">Collected Amount</span>
          <p className="text-base md:text-lg font-black text-emerald-400 mt-0.5">{formatCurrency(totalFilteredPaid)}</p>
        </div>
        <div className="px-3">
          <span className="text-amber-400 text-[10px] uppercase font-bold">Pending Outstanding</span>
          <p className="text-base md:text-lg font-black text-amber-400 mt-0.5">{formatCurrency(totalFilteredBalance)}</p>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Items Count</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const matchedInv = invoices.find((i) => i.saleId === sale.id || i.invoiceNumber === sale.invoiceNumber);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sale.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500">
                        <p>{formatDate(sale.date)}</p>
                        <p className="text-[10px] text-slate-400">{sale.employeeName}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{sale.customerName}</p>
                        <p className="text-[11px] text-slate-400">📞 {sale.customerPhone}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold">{sale.items.length} items</span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {sale.items.map((i) => i.productName).join(', ')}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(sale.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        {formatCurrency(sale.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${sale.balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {formatCurrency(sale.balanceDue)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
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
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onViewSaleDetail(sale.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewInvoice(matchedInv?.id || sale.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {sale.balanceDue > 0 && (
                            <button
                              onClick={() => onRecordPayment(sale.customerId, matchedInv?.id || sale.id)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-[11px] transition-colors"
                            >
                              Collect
                            </button>
                          )}
                          {canDeleteSales && sale.paymentStatus !== 'Cancelled' && (
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No sales matching the current filters.
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
