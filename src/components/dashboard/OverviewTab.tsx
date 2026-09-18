import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  UserPlus,
  Truck,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OverviewTabProps {
  onNavigateTab: (tabId: string, options?: { sortOutstandingFirst?: boolean }) => void;
  onOpenSaleDetail: (saleId: string) => void;
  onOpenRecordPayment: () => void;
  onOpenAddCustomer: () => void;
  onOpenQuickStockIn: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onNavigateTab,
  onOpenSaleDetail,
  onOpenRecordPayment,
  onOpenAddCustomer,
  onOpenQuickStockIn,
}) => {
  const { sales, payments, products, customers, getLowStockProducts, currentUser, hasPermission } = useApp();
  const [chartPeriod, setChartPeriod] = useState<'7days' | '30days'>('7days');

  const lowStockItems = getLowStockProducts();

  // Helper date matching
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Today's metrics
  const todaySalesList = sales.filter(
    (s) => s.date.slice(0, 10) === todayStr && s.paymentStatus !== 'Cancelled'
  );
  const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + s.grandTotal, 0);

  const todayPaymentsList = payments.filter((p) => p.paymentDate.slice(0, 10) === todayStr);
  const todayPaymentsTotal = todayPaymentsList.reduce((sum, p) => sum + p.amount, 0);

  // Month's metrics
  const monthSalesList = sales.filter(
    (s) => s.date.slice(0, 7) === currentMonthStr && s.paymentStatus !== 'Cancelled'
  );
  const monthSalesTotal = monthSalesList.reduce((sum, s) => sum + s.grandTotal, 0);

  // Month's COGS & Profit
  const monthCostOfGoods = monthSalesList.reduce((acc, sale) => {
    return (
      acc +
      sale.items.reduce(
        (iSum, item) => iSum + (item.purchasePrice || 0) * item.quantity,
        0
      )
    );
  }, 0);
  const monthGrossProfit = Math.max(0, monthSalesTotal - monthCostOfGoods);
  const monthMarginPercent = monthSalesTotal > 0 ? (monthGrossProfit / monthSalesTotal) * 100 : 0;

  // Total Outstanding
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  // Inventory valuation
  const totalInventoryCost = products.reduce((sum, p) => sum + p.purchasePrice * p.currentStock, 0);
  const totalInventoryRetail = products.reduce((sum, p) => sum + p.sellingPrice * p.currentStock, 0);

  // Chart Data: Last 7 Days
  const chartData = React.useMemo(() => {
    const days = chartPeriod === '7days' ? 7 : 30;
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      const daySales = sales
        .filter((s) => s.date.slice(0, 10) === dateStr && s.paymentStatus !== 'Cancelled')
        .reduce((sum, s) => sum + s.grandTotal, 0);

      const dayCollections = payments
        .filter((p) => p.paymentDate.slice(0, 10) === dateStr)
        .reduce((sum, p) => sum + p.amount, 0);

      result.push({
        date: label,
        sales: daySales,
        collections: dayCollections,
      });
    }
    return result;
  }, [sales, payments, chartPeriod]);

  // Product sales volume aggregation for Top 5
  const topProducts = React.useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; unit: string }> = {};
    sales.forEach((s) => {
      if (s.paymentStatus === 'Cancelled') return;
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            unit: item.unit,
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.totalAmount;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Payment methods breakdown data
  const paymentBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {
      UPI: 0,
      Cash: 0,
      'Bank Transfer': 0,
      Card: 0,
      Cheque: 0,
    };
    payments.forEach((p) => {
      if (map[p.paymentMethod] !== undefined) {
        map[p.paymentMethod] += p.amount;
      } else {
        map['Other'] = (map['Other'] || 0) + p.amount;
      }
    });

    const colors: Record<string, string> = {
      UPI: '#3b82f6',
      Cash: '#10b981',
      'Bank Transfer': '#8b5cf6',
      Card: '#f59e0b',
      Cheque: '#64748b',
    };

    return Object.entries(map)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || '#94a3b8',
      }));
  }, [payments]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Business Overview</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time sales, collections, inventory and outstanding health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('new-sale')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </button>
          <button
            onClick={onOpenRecordPayment}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={onOpenQuickStockIn}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-medium rounded-xl transition-all"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Stock-In</span>
          </button>
          <button
            onClick={onOpenAddCustomer}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-medium rounded-xl transition-all"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>+ Customer</span>
          </button>
        </div>
      </div>

      {/* Low Stock Urgent Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-bold">
                Low Stock Alert: {lowStockItems.length} product(s) reached minimum threshold!
              </p>
              <p className="text-xs text-amber-700">
                {lowStockItems.map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="text-xs font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-2"
          >
            Reorder Stock
          </button>
        </div>
      )}

      {/* Main KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('sales')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateTab('sales'); }}
          className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 active:scale-[0.98] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{formatCurrency(todaySalesTotal)}</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>{todaySalesList.length} invoices today</span>
            <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:gap-1 transition-all">
              View <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Today's Collections */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('payments')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateTab('payments'); }}
          className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-400 active:scale-[0.98] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{formatCurrency(todayPaymentsTotal)}</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>{todayPaymentsList.length} payments</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5 group-hover:gap-1 transition-all">
              Ledger <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Outstanding Balance (Khata) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('customers', { sortOutstandingFirst: true })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateTab('customers', { sortOutstandingFirst: true }); }}
          className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-400 active:scale-[0.98] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-amber-600 mt-2">{formatCurrency(totalOutstanding)}</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Pending from customers</span>
            <span className="text-amber-700 font-semibold flex items-center gap-0.5 group-hover:gap-1 transition-all">
              Khata <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab('inventory')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateTab('inventory'); }}
          className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-400 active:scale-[0.98] transition-all cursor-pointer group text-left"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Valuation</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{formatCurrency(totalInventoryCost)}</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Retail value: {formatCurrency(totalInventoryRetail)}</span>
            <span className="text-indigo-600 font-semibold flex items-center gap-0.5 group-hover:gap-1 transition-all">
              Stock <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Summary & Profit Stats (Visible if canViewProfit is granted) */}
      {hasPermission('canViewProfit') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-lg">
          <div className="border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month's Sales</span>
            <p className="text-2xl font-black mt-1 text-white">{formatCurrency(monthSalesTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">{monthSalesList.length} total completed orders</p>
          </div>
          <div className="border-b md:border-b-0 md:border-r border-slate-800 py-4 md:py-0 md:px-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
            <p className="text-2xl font-black mt-1 text-slate-300">{formatCurrency(monthCostOfGoods)}</p>
            <p className="text-xs text-slate-400 mt-1">Purchase cost of items sold</p>
          </div>
          <div className="pt-4 md:pt-0 md:pl-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Gross Profit (Month)</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-2xl font-black text-emerald-400">{formatCurrency(monthGrossProfit)}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {monthMarginPercent.toFixed(1)}% Margin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Sales Revenue - Product Cost</p>
          </div>
        </div>
      )}

      {/* Main Charts & Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Collections Trend Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Revenue vs Collections</h3>
              <p className="text-xs text-slate-500">Compare invoiced sales vs actual cash/UPI collected</p>
            </div>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setChartPeriod('7days')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  chartPeriod === '7days' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setChartPeriod('30days')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  chartPeriod === '30days' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collectionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}>
                  <label value="Date" position="insideBottom" offset={-2} style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                </XAxis>
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8', fontWeight: 600, textAnchor: 'middle' } }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="sales" name="Sales Billed" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="collections" name="Payments Collected" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#collectionsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-900 text-sm md:text-base">Payment Method Share</h3>
          <p className="text-xs text-slate-500 mb-2">Total collection distribution</p>

          <div className="h-48 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            {paymentBreakdown.map((item) => (
              <div key={item.name} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Top Selling Products</h3>
              <p className="text-xs text-slate-500">Highest revenue contributors</p>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Full Report →
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {topProducts.map((p, idx) => (
              <div key={p.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(p.revenue)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-7">
                  <span>Sold: {p.quantity} {p.unit}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${topProducts[0]?.revenue ? (p.revenue / topProducts[0].revenue) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Latest sales invoices</p>
            </div>
            <button
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2 flex-1">
            {sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                onClick={() => onOpenSaleDetail(sale.id)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800 font-mono group-hover:text-blue-600">
                      {sale.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
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
                  <p className="text-xs text-slate-500 mt-0.5">{sale.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{formatCurrency(sale.grandTotal)}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(sale.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
