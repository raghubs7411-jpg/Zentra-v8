import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  PlusCircle,
  FileText,
  DollarSign,
  Share2,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '../../utils/formatters';
import { generatePaymentReminderWhatsAppUrl } from '../../utils/whatsapp';
import { exportToCsvFile } from '../../utils/storage';
import { calculateLoyalty, calculateAgeingBuckets } from '../../utils/loyalty';

interface CustomerProfileModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSaleForCustomer: (customerId: string) => void;
  onRecordPayment: (customerId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onNewSaleForCustomer,
  onRecordPayment,
  onViewInvoice,
}) => {
  const { customers, sales, invoices, payments, salesReturns, business } = useApp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'ledger'>('invoices');

  if (!isOpen || !customerId) return null;

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return null;

  const customerSales = sales.filter((s) => s.customerId === customer.id);
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const customerReturns = salesReturns.filter((r) => r.customerId === customer.id);

  const loyalty = calculateLoyalty(sales, customer.id);
  const ageingBuckets = calculateAgeingBuckets(invoices, customer.id);

  // Unpaid/pending invoices
  const pendingInvoices = customerInvoices.filter(
    (i) => i.paymentStatus === 'Pending' || i.paymentStatus === 'Partially Paid'
  );

  const handleWhatsAppReminder = () => {
    const pendingInvNumbers = pendingInvoices.map((i) => i.invoiceNumber);
    const url = generatePaymentReminderWhatsAppUrl(
      customer.phone,
      customer.name,
      business,
      customer.outstandingBalance,
      pendingInvNumbers
    );
    window.open(url, '_blank');
  };

  const handleExportStatement = () => {
    // Generate statement rows
    const statementRows = [
      ...customerInvoices.map((inv) => ({
        Date: formatDate(inv.date),
        Type: 'INVOICE',
        Reference: inv.invoiceNumber,
        Debit: inv.grandTotal,
        Credit: 0,
        Details: `${inv.items.length} items billed`,
      })),
      ...customerPayments.map((pay) => ({
        Date: formatDate(pay.paymentDate),
        Type: 'PAYMENT',
        Reference: pay.paymentNumber,
        Debit: 0,
        Credit: pay.amount,
        Details: `Payment via ${pay.paymentMethod}${pay.referenceNo ? ` (${pay.referenceNo})` : ''}`,
      })),
    ].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

    exportToCsvFile(statementRows, `Customer_Statement_${customer.name.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150 text-xs md:text-sm">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-lg font-black shrink-0">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg md:text-xl font-black text-white">{customer.name}</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-blue-300 rounded-full border border-slate-700">
                  {customer.customerType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{formatPhone(customer.phone)}</span>
                </span>
                {customer.email && (
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{customer.email}</span>
                  </span>
                )}
                {customer.gstin && <span className="font-mono text-slate-300">GSTIN: {customer.gstin}</span>}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {customer.outstandingBalance > 0 && (
              <button
                onClick={handleWhatsAppReminder}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                title="Send WhatsApp payment reminder"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Reminder</span>
              </button>
            )}

            {customer.outstandingBalance > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(customer.id);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Collect Payment</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onNewSaleForCustomer(customer.id);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Sale</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          {/* Loyalty Card */}
          <div className={`p-3 rounded-xl border shadow-2xs ${loyalty.tierBg} border-slate-200`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Loyalty</span>
            <p className={`text-sm md:text-base font-black mt-0.5 ${loyalty.tierColor}`}>
              {loyalty.tierIcon} {loyalty.tier}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {loyalty.visitCount} {loyalty.visitCount === 1 ? 'purchase' : 'purchases'} • Avg: {formatCurrency(loyalty.avgBillValue)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Billed</span>
            <p className="text-sm md:text-base font-black text-slate-900 mt-0.5">{formatCurrency(customer.totalPurchases)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{customerInvoices.length} invoices</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span>
            <p className="text-sm md:text-base font-black text-emerald-600 mt-0.5">{formatCurrency(customer.totalPaid)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{customerPayments.length} receipts</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Net Outstanding (Khata)</span>
            <p className={`text-sm md:text-base font-black mt-0.5 ${customer.outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {formatCurrency(customer.outstandingBalance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{pendingInvoices.length} unpaid bills</p>
          </div>
        </div>

        {/* Ageing Buckets Row */}
        {customer.outstandingBalance > 0 && (
          <div className="px-4 pt-3 bg-white">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Outstanding Ageing Analysis</p>
            <div className="grid grid-cols-4 gap-2 pb-3">
              {ageingBuckets.map((bucket) => (
                <div key={bucket.label} className={`p-2.5 rounded-lg border ${bucket.bg}`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">{bucket.label}</span>
                  <p className={`text-xs font-black ${bucket.color} mt-0.5`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{bucket.invoiceCount} {bucket.invoiceCount === 1 ? 'bill' : 'bills'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation & Statement Export */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-200 bg-white">
          <div className="cir-tabs">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`cir-tabs__t ${activeTab === 'invoices' ? 'is-active' : ''}`}
            >
              Invoices ({customerInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`cir-tabs__t ${activeTab === 'payments' ? 'is-active' : ''}`}
            >
              Payments ({customerPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`cir-tabs__t ${activeTab === 'ledger' ? 'is-active' : ''}`}
            >
              Khata Ledger
            </button>
          </div>

          <button
            onClick={handleExportStatement}
            className="flex items-center space-x-1 pb-3 text-xs font-semibold text-slate-600 hover:text-blue-600"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Statement (CSV)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.length > 0 ? (
                    customerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">
                          {formatCurrency(inv.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                          {formatCurrency(inv.balanceDue)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              inv.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : inv.paymentStatus === 'Partially Paid'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              onClose();
                              onViewInvoice(inv.id);
                            }}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            View Bill →
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No invoices found for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Payment Date</th>
                    <th className="py-2.5 px-3">Invoice Ref</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerPayments.length > 0 ? (
                    customerPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{pay.paymentNumber}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatDate(pay.paymentDate)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{pay.invoiceNumber || 'Account Settlement'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{pay.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-500">{pay.referenceNo || pay.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                          {formatCurrency(pay.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No payments recorded yet for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: STATEMENT / KHATA LEDGER */}
          {activeTab === 'ledger' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm">Account Ledger Statement</h4>
                  <p className="text-[11px] text-slate-500">Chronological transaction record</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Closing Balance:</span>
                  <span className="font-black text-amber-600 ml-1.5">{formatCurrency(customer.outstandingBalance)}</span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3 text-right">Debit (Sale ₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(inv.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">Sales Invoice</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                    </tr>
                  ))}
                  {customerPayments.map((pay) => (
                    <tr key={pay.id} className="bg-emerald-50/30">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(pay.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">Payment Received</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{pay.paymentNumber}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(pay.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
