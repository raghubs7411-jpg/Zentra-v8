import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Package,
  DollarSign,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  PieChart as PieIcon,
  AlertTriangle,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';
import { Gstr1ReportTab } from './Gstr1ReportTab';

export const ReportsPage: React.FC = () => {
  const { sales, payments, products, customers, stockMovements, currentUser } = useApp();
  const [activeReportTab, setActiveReportTab] = useState<'sales' | 'payments' | 'inventory' | 'profit' | 'gstr1'>('profit');
  const [period, setPeriod] = useState<'month' | 'fy' | 'all'>('month');

  // Completed valid sales
  const validSales = sales.filter((s) => s.paymentStatus !== 'Cancelled');

  // ---------------------------------------------------------
  // 1. FINANCIAL PROFIT & LOSS INTELLIGENCE
  // ---------------------------------------------------------
  const totalGrossSales = validSales.reduce((sum, s) => sum + s.subtotal, 0);
  const totalDiscounts = validSales.reduce((sum, s) => sum + s.totalDiscount, 0);
  const totalNetRevenue = validSales.reduce((sum, s) => sum + s.grandTotal, 0);

  const totalCOGS = validSales.reduce((acc, sale) => {
    return (
      acc +
      sale.items.reduce((iSum, it) => iSum + (it.purchasePrice || 0) * it.quantity, 0)
    );
  }, 0);

  const totalGrossProfit = Math.max(0, totalNetRevenue - totalCOGS);
  const overallMargin = totalNetRevenue > 0 ? (totalGrossProfit / totalNetRevenue) * 100 : 0;

  // ---------------------------------------------------------
  // 2. PRODUCT-WISE PERFORMANCE
  // ---------------------------------------------------------
  const productReport = React.useMemo(() => {
    const map: Record<
      string,
      { name: string; sku: string; category: string; qty: number; unit: string; revenue: number; cogs: number; profit: number }
    > = {};

    validSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            sku: item.sku,
            category: item.sku.split('-')[0] || 'General',
            qty: 0,
            unit: item.unit,
            revenue: 0,
            cogs: 0,
            profit: 0,
          };
        }
        const itemCost = (item.purchasePrice || 0) * item.quantity;
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.totalAmount;
        map[item.productId].cogs += itemCost;
        map[item.productId].profit += item.totalAmount - itemCost;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [validSales]);

  // ---------------------------------------------------------
  // 3. CUSTOMER-WISE SALES & AGEING
  // ---------------------------------------------------------
  const customerReport = React.useMemo(() => {
    return customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        type: c.customerType,
        totalBilled: c.totalPurchases,
        totalPaid: c.totalPaid,
        outstanding: c.outstandingBalance,
      }))
      .sort((a, b) => b.totalBilled - a.totalBilled);
  }, [customers]);

  // Outstanding Ageing Analysis
  const ageingData = React.useMemo(() => {
    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucketOver60 = 0;

    const now = Date.now();
    sales
      .filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Partially Paid')
      .forEach((s) => {
        const daysOld = Math.floor((now - new Date(s.date).getTime()) / 86400000);
        if (daysOld <= 30) bucket0to30 += s.balanceDue;
        else if (daysOld <= 60) bucket31to60 += s.balanceDue;
        else bucketOver60 += s.balanceDue;
      });

    return [
      { name: '0 - 30 Days', value: bucket0to30, color: '#10b981' },
      { name: '31 - 60 Days', value: bucket31to60, color: '#f59e0b' },
      { name: '60+ Days (Overdue)', value: bucketOver60, color: '#ef4444' },
    ];
  }, [sales]);

  // ---------------------------------------------------------
  // 4. INVENTORY VALUATION & MOVEMENT
  // ---------------------------------------------------------
  const totalStockCost = products.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
  const totalStockRetail = products.reduce((sum, p) => sum + p.sellingPrice * p.currentStock, 0);
  const potentialInventoryProfit = totalStockRetail - totalStockCost;

  // Export handlers
  const handleExportSalesReport = () => {
    const data = productReport.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      'Units Sold': `${p.qty} ${p.unit}`,
      'Total Revenue (₹)': p.revenue,
      'Cost of Goods (₹)': p.cogs,
      'Gross Profit (₹)': p.profit,
      'Margin %': p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0',
    }));
    exportToCsvFile(data, 'Product_Sales_Profit_Report');
  };

  const handleExportCustomerReport = () => {
    const data = customerReport.map((c) => ({
      Customer: c.name,
      Phone: c.phone,
      Category: c.type,
      'Total Billed (₹)': c.totalBilled,
      'Total Paid (₹)': c.totalPaid,
      'Outstanding Balance (₹)': c.outstanding,
    }));
    exportToCsvFile(data, 'Customer_Sales_Ledger_Report');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Reports & Business Intelligence</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Real-time profit & loss, sales volume, payment ageing, and stock analytics without complex accounting.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 pt-3 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveReportTab('profit')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeReportTab === 'profit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Profit & Loss (P&L)</span>
          </button>

          <button
            onClick={() => setActiveReportTab('sales')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeReportTab === 'sales'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Product Sales Breakdown</span>
          </button>

          <button
            onClick={() => setActiveReportTab('payments')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeReportTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Customer Ageing & Collections</span>
          </button>

          <button
            onClick={() => setActiveReportTab('inventory')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeReportTab === 'inventory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Valuation</span>
          </button>

          <button
            onClick={() => setActiveReportTab('gstr1')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeReportTab === 'gstr1'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>GSTR-1 Report</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* REPORT 1: PROFIT & LOSS (P&L)                         */}
      {/* ---------------------------------------------------- */}
      {activeReportTab === 'profit' && (
        <div className="space-y-6">
          {/* P&L Main Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales Billed</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalNetRevenue)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{validSales.length} successful sales</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
              <p className="text-2xl font-black text-slate-700 mt-1">{formatCurrency(totalCOGS)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Direct purchase cost of inventory sold</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Gross Profit</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalGrossProfit)}</p>
              <p className="text-xs text-emerald-700 mt-0.5">Revenue - Product Cost</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Overall Margin</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{overallMargin.toFixed(1)}%</p>
              <p className="text-xs text-blue-700 mt-0.5">Average profit margin ratio</p>
            </div>
          </div>

          {/* Profit Statement Formula Card */}
          <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-lg space-y-4">
            <h3 className="font-bold text-base text-white">Income & Profit Statement</h3>
            <div className="space-y-2 text-xs divide-y divide-slate-800">
              <div className="flex justify-between py-2 text-slate-300">
                <span>(+) Gross Invoiced Sales:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(totalGrossSales)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-300">
                <span>(-) Total Discounts Given to Customers:</span>
                <span className="font-mono font-bold">-{formatCurrency(totalDiscounts)}</span>
              </div>
              <div className="flex justify-between py-2 text-slate-300">
                <span>(=) Net Sales Revenue:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(totalNetRevenue)}</span>
              </div>
              <div className="flex justify-between py-2 text-amber-300">
                <span>(-) Cost of Goods Sold (Purchases):</span>
                <span className="font-mono font-bold">-{formatCurrency(totalCOGS)}</span>
              </div>
              <div className="flex justify-between pt-3 text-base md:text-lg font-black text-emerald-400 border-t-2 border-slate-700">
                <span>(=) Gross Profit:</span>
                <span className="font-mono">{formatCurrency(totalGrossProfit)} ({overallMargin.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REPORT 2: PRODUCT SALES BREAKDOWN                    */}
      {/* ---------------------------------------------------- */}
      {activeReportTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleExportSalesReport}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Product Report (CSV)</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Cost (₹)</th>
                    <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productReport.map((p) => {
                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;

                    return (
                      <tr key={p.sku} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {p.qty} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(p.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(p.cogs)}</td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                          +{formatCurrency(p.profit)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REPORT 3: CUSTOMER AGEING & COLLECTIONS               */}
      {/* ---------------------------------------------------- */}
      {activeReportTab === 'payments' && (
        <div className="space-y-6">
          {/* Ageing Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ageingData.map((bucket) => (
              <div
                key={bucket.name}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{bucket.name}</span>
                  <p className="text-xl font-black mt-1" style={{ color: bucket.color }}>
                    {formatCurrency(bucket.value)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pending collection</p>
                </div>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bucket.color }} />
              </div>
            ))}
          </div>

          {/* Customer Ledger Directory */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-xs md:text-sm">Customer Outstanding Ledger</h4>
              <button
                onClick={handleExportCustomerReport}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Current Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerReport.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-bold text-slate-700">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(c.totalBilled)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{formatCurrency(c.totalPaid)}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black ${
                            c.outstanding > 0 ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {formatCurrency(c.outstanding)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REPORT 4: INVENTORY VALUATION                         */}
      {/* ---------------------------------------------------- */}
      {activeReportTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Cost Value</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalStockCost)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Warehouse asset value</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Retail Value</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(totalStockRetail)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Potential revenue at retail prices</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Unrealized Gross Margin</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">+{formatCurrency(potentialInventoryProfit)}</p>
              <p className="text-xs text-emerald-700 mt-0.5">Projected profit on full stock clearance</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs md:text-sm">Warehouse Stock Valuation by SKU</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Stock On Hand</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Retail Price</th>
                    <th className="py-3 px-4 text-right">Cost Valuation</th>
                    <th className="py-3 px-4 text-right">Retail Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.sku}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(p.purchasePrice)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{formatCurrency(p.sellingPrice)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(p.purchasePrice * p.currentStock)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                        {formatCurrency(p.sellingPrice * p.currentStock)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REPORT 5: GSTR-1 TAX REPORT                          */}
      {/* ---------------------------------------------------- */}
      {activeReportTab === 'gstr1' && <Gstr1ReportTab />}
    </div>
  );
};
