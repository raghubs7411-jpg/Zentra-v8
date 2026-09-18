import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Phone,
  Eye,
  Edit2,
  DollarSign,
  Share2,
  Download,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, CustomerType } from '../../types';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { generatePaymentReminderWhatsAppUrl } from '../../utils/whatsapp';

interface CustomersListPageProps {
  onOpenCustomerProfile: (customerId: string) => void;
  onOpenCustomerForm: (customerToEdit?: Customer | null) => void;
  onOpenRecordPayment: (customerId: string) => void;
  onOpenNewSaleForCustomer: (customerId: string) => void;
  sortOutstandingFirst?: boolean;
  onSortApplied?: () => void;
}

type SortBy = 'outstanding' | 'name' | 'recent' | 'billed' | 'default';

export const CustomersListPage: React.FC<CustomersListPageProps> = ({
  onOpenCustomerProfile,
  onOpenCustomerForm,
  onOpenRecordPayment,
  onOpenNewSaleForCustomer,
  sortOutstandingFirst,
  onSortApplied,
}) => {
  const { customers, invoices, business } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'ALL'>('ALL');
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('default');

  // Apply sortOutstandingFirst when arriving from dashboard
  useEffect(() => {
    if (sortOutstandingFirst) {
      setSortBy('outstanding');
      onSortApplied && onSortApplied();
    }
  }, [sortOutstandingFirst, onSortApplied]);

  // Filter computation
  const filteredCustomers = customers.filter((cust) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        cust.name.toLowerCase().includes(q) ||
        cust.phone.includes(q) ||
        (cust.altPhone && cust.altPhone.includes(q)) ||
        (cust.gstin && cust.gstin.toLowerCase().includes(q)) ||
        cust.city.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (typeFilter !== 'ALL' && cust.customerType !== typeFilter) {
      return false;
    }

    if (onlyOutstanding && cust.outstandingBalance <= 0) {
      return false;
    }

    return true;
  });

  // Apply sorting
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'outstanding':
        return b.outstandingBalance - a.outstandingBalance;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'billed':
        return b.totalPurchases - a.totalPurchases;
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalBilled = customers.reduce((sum, c) => sum + c.totalPurchases, 0);

  const handleExportCsv = () => {
    const data = filteredCustomers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Type: c.customerType,
      GSTIN: c.gstin || '',
      Address: c.address,
      City: c.city,
      'Total Billed': c.totalPurchases,
      'Total Paid': c.totalPaid,
      'Outstanding Balance': c.outstandingBalance,
      'Credit Limit': c.creditLimit,
    }));
    exportToCsvFile(data, 'Customers_Khata_Directory');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Customers CRM & Khata Ledger</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Manage customer relationships, credit limits, khata balances, and payment reminders.
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
            onClick={() => onOpenCustomerForm(null)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</span>
          <p className="text-xl font-black text-slate-900 mt-1">{customers.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active customer profiles</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Business Billed</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalBilled)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Lifetime sales revenue</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Net Outstanding (Khata)</span>
          <p className="text-xl font-black text-amber-600 mt-1">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Pending collection</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Customers with Dues</span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {customers.filter((c) => c.outstandingBalance > 0).length} / {customers.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Accounts with balance &gt; 0</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone, name, GSTIN or city..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Customer category filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Contractor">Contractor</option>
            <option value="Dealer">Dealer</option>
          </select>

          {/* Sort by dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-hidden"
            title="Sort customers"
          >
            <option value="default">Sort: Default</option>
            <option value="outstanding">Outstanding (High to Low)</option>
            <option value="name">Name (A-Z)</option>
            <option value="billed">Total Billed (High to Low)</option>
            <option value="recent">Recently Added</option>
          </select>

          {/* Toggle only outstanding */}
          <button
            onClick={() => setOnlyOutstanding(!onlyOutstanding)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              onlyOutstanding
                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {onlyOutstanding ? '✓ With Balance Only' : 'Has Outstanding Balance'}
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing {sortedCustomers.length} of {customers.length} customers
            {totalOutstanding > 0 && (
              <span className="text-amber-600 font-bold ml-2">| Total Dues: {formatCurrency(totalOutstanding)}</span>
            )}
          </span>
          {(sortBy !== 'default' || onlyOutstanding || typeFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => { setSortBy('default'); setOnlyOutstanding(false); setTypeFilter('ALL'); setSearchQuery(''); }}
              className="text-xs text-blue-600 font-semibold hover:text-blue-700"
            >
              Clear All Filters
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone / Primary ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">City / Address</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-right">Outstanding (Khata)</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCustomers.length > 0 ? (
                sortedCustomers.map((cust) => {
                  const hasDue = cust.outstandingBalance > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenCustomerProfile(cust.id)}
                          className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors"
                        >
                          {cust.name}
                        </button>
                        {cust.gstin && (
                          <p className="text-[10px] text-slate-400 font-mono">GSTIN: {cust.gstin}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 font-semibold">{formatPhone(cust.phone)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <p className="truncate max-w-[150px]">{cust.address || cust.city}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {formatCurrency(cust.totalPurchases)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            hasDue ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(cust.outstandingBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">
                        {formatCurrency(cust.creditLimit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* WhatsApp reminder */}
                          {hasDue && (
                            <button
                              onClick={() => {
                                const custPendingInvs = invoices
                                  .filter((i) => i.customerId === cust.id && i.balanceDue > 0)
                                  .map((i) => i.invoiceNumber);
                                const url = generatePaymentReminderWhatsAppUrl(
                                  cust.phone,
                                  cust.name,
                                  business,
                                  cust.outstandingBalance,
                                  custPendingInvs
                                );
                                window.open(url, '_blank');
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Record payment */}
                          {hasDue && (
                            <button
                              onClick={() => onOpenRecordPayment(cust.id)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-[11px] transition-colors"
                              title="Collect Payment"
                            >
                              Collect
                            </button>
                          )}

                          {/* Quick New Sale */}
                          <button
                            onClick={() => onOpenNewSaleForCustomer(cust.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Create New Sale"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>

                          {/* 360 View Profile */}
                          <button
                            onClick={() => onOpenCustomerProfile(cust.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="360° Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Customer */}
                          <button
                            onClick={() => onOpenCustomerForm(cust)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No customers found. {searchQuery || typeFilter !== 'ALL' || onlyOutstanding ? 'Try adjusting your filters.' : 'Click + Add Customer to create your first customer.'}
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
