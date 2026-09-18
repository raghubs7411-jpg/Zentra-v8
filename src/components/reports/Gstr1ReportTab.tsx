import React, { useState, useMemo } from 'react';
import { Download, Calendar, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsvFile, exportToJsonFile } from '../../utils/storage';

type Period = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'fy' | 'custom';

interface B2bRow {
  invoiceNumber: string;
  date: string;
  customerName: string;
  gstin: string;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  total: number;
}

interface RateRow {
  rate: number;
  taxable: number;
  tax: number;
}

interface HsnRow {
  hsn: string;
  description: string;
  uqc: string;
  qty: number;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisQuarter: 'This Quarter',
  fy: 'This Financial Year',
  custom: 'Custom Range',
};

export const Gstr1ReportTab: React.FC = () => {
  const { sales, products } = useApp();
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const range = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    if (period === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'thisQuarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
    } else if (period === 'fy') {
      const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(y, 3, 1);
      end = new Date(y + 1, 2, 31, 23, 59, 59);
    } else {
      start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(0);
      end = toDate ? new Date(`${toDate}T23:59:59`) : new Date(now.getTime() + 86400000);
    }
    return { start, end };
  }, [period, fromDate, toDate]);

  const periodSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.paymentStatus === 'Cancelled') return false;
      const t = new Date(s.date).getTime();
      return t >= range.start.getTime() && t <= range.end.getTime();
    });
  }, [sales, range]);

  const isExempt = (s: (typeof sales)[number]) => Boolean(s.isZeroGst);

  // -----------------------------------------------------------
  // B2B: invoices to GST-registered customers (with GSTIN)
  // -----------------------------------------------------------
  const b2bRows: B2bRow[] = useMemo(() => {
    return periodSales
      .filter((s) => !isExempt(s) && s.customerGstin)
      .map((s) => {
        const taxable = Math.max(0, s.subtotal - s.totalDiscount);
        const igst = s.isInterState ? s.totalTax : 0;
        const cgst = s.isInterState ? 0 : s.totalTax / 2;
        const sgst = s.isInterState ? 0 : s.totalTax / 2;
        return {
          invoiceNumber: s.invoiceNumber,
          date: s.date,
          customerName: s.customerName,
          gstin: s.customerGstin || '',
          taxable,
          igst,
          cgst,
          sgst,
          total: s.grandTotal,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodSales]);

  // -----------------------------------------------------------
  // B2C: rate-wise summary for customers without GSTIN
  // -----------------------------------------------------------
  const b2cRows: RateRow[] = useMemo(() => {
    const map: Record<string, RateRow> = {};
    periodSales
      .filter((s) => !isExempt(s) && !s.customerGstin)
      .forEach((s) => {
        s.items.forEach((item) => {
          const key = String(item.gstRate);
          if (!map[key]) {
            map[key] = { rate: item.gstRate, taxable: 0, tax: 0 };
          }
          map[key].taxable += Math.max(0, item.totalAmount - item.taxAmount);
          map[key].tax += item.taxAmount;
        });
      });
    return Object.values(map).sort((a, b) => a.rate - b.rate);
  }, [periodSales]);

  // -----------------------------------------------------------
  // HSN-wise summary (all GST sales in period)
  // -----------------------------------------------------------
  const hsnRows: HsnRow[] = useMemo(() => {
    const map: Record<string, HsnRow> = {};
    periodSales
      .filter((s) => !isExempt(s))
      .forEach((s) => {
        s.items.forEach((item) => {
          const product = products.find((p) => p.id === item.productId);
          const hsn = product?.hsnCode || '';
          const key = hsn || '__none__';
          if (!map[key]) {
            map[key] = {
              hsn: hsn || '—',
              description: item.productName,
              uqc: product?.unit || item.unit,
              qty: 0,
              taxable: 0,
              igst: 0,
              cgst: 0,
              sgst: 0,
            };
          }
          const taxable = Math.max(0, item.totalAmount - item.taxAmount);
          map[key].qty += item.quantity;
          map[key].taxable += taxable;
          if (s.isInterState) {
            map[key].igst += item.taxAmount;
          } else {
            map[key].cgst += item.taxAmount / 2;
            map[key].sgst += item.taxAmount / 2;
          }
        });
      });
    return Object.values(map).sort((a, b) => b.taxable - a.taxable);
  }, [periodSales, products]);

  // -----------------------------------------------------------
  // Totals
  // -----------------------------------------------------------
  const totals = useMemo(() => {
    let taxable = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;
    b2bRows.forEach((r) => {
      taxable += r.taxable;
      igst += r.igst;
      cgst += r.cgst;
      sgst += r.sgst;
    });
    let b2cTaxable = 0;
    let b2cTax = 0;
    b2cRows.forEach((r) => {
      b2cTaxable += r.taxable;
      b2cTax += r.tax;
    });
    const exemptSales = periodSales.filter((s) => isExempt(s));
    const exemptValue = exemptSales.reduce((sum, s) => sum + s.grandTotal, 0);
    return {
      // B2C tax is shown combined (rate-wise); the IGST/CGST/SGST split for
      // B2C appears in the HSN summary table.
      taxable: taxable + b2cTaxable,
      igst,
      cgst,
      sgst,
      b2cTax,
      exemptValue,
      exemptCount: exemptSales.length,
      invoiceCount: periodSales.length,
      gstInvoiceCount: b2bRows.length,
    };
  }, [b2bRows, b2cRows, periodSales]);

  // -----------------------------------------------------------
  // Exports (CA-ready)
  // -----------------------------------------------------------
  const handleExportB2bCsv = () => {
    exportToCsvFile(
      b2bRows.map((r) => ({
        'Invoice Number': r.invoiceNumber,
        'Invoice Date': formatDate(r.date),
        Customer: r.customerName,
        'GSTIN / UIN': r.gstin,
        'Taxable Value (₹)': r.taxable.toFixed(2),
        'IGST (₹)': r.igst.toFixed(2),
        'CGST (₹)': r.cgst.toFixed(2),
        'SGST (₹)': r.sgst.toFixed(2),
        'Invoice Value (₹)': r.total.toFixed(2),
      })),
      'GSTR1_B2B_Invoices'
    );
  };

  const handleExportHsnCsv = () => {
    exportToCsvFile(
      hsnRows.map((r) => ({
        HSN: r.hsn,
        Description: r.description,
        UQC: r.uqc,
        'Total Quantity': r.qty,
        'Taxable Value (₹)': r.taxable.toFixed(2),
        'IGST (₹)': r.igst.toFixed(2),
        'CGST (₹)': r.cgst.toFixed(2),
        'SGST (₹)': r.sgst.toFixed(2),
      })),
      'GSTR1_HSN_Summary'
    );
  };

  const handleExportJson = () => {
    exportToJsonFile(
      {
        report: 'GSTR-1 Summary',
        period: {
          label: PERIOD_LABELS[period],
          from: range.start.toISOString().slice(0, 10),
          to: range.end.toISOString().slice(0, 10),
        },
        totals: {
          taxableValue: Number(totals.taxable.toFixed(2)),
          igst: Number(totals.igst.toFixed(2)),
          cgst: Number(totals.cgst.toFixed(2)),
          sgst: Number(totals.sgst.toFixed(2)),
          exemptSupplies: Number(totals.exemptValue.toFixed(2)),
          gstInvoices: totals.gstInvoiceCount,
          totalInvoices: totals.invoiceCount,
        },
        b2bInvoices: b2bRows.map((r) => ({
          invoiceNumber: r.invoiceNumber,
          date: formatDate(r.date),
          customer: r.customerName,
          gstin: r.gstin,
          taxableValue: Number(r.taxable.toFixed(2)),
          igst: Number(r.igst.toFixed(2)),
          cgst: Number(r.cgst.toFixed(2)),
          sgst: Number(r.sgst.toFixed(2)),
          invoiceValue: Number(r.total.toFixed(2)),
        })),
        b2cRateSummary: b2cRows.map((r) => ({
          rate: r.rate,
          taxableValue: Number(r.taxable.toFixed(2)),
          taxAmount: Number(r.tax.toFixed(2)),
        })),
        hsnSummary: hsnRows.map((r) => ({
          hsn: r.hsn,
          description: r.description,
          uqc: r.uqc,
          totalQuantity: r.qty,
          taxableValue: Number(r.taxable.toFixed(2)),
          igst: Number(r.igst.toFixed(2)),
          cgst: Number(r.cgst.toFixed(2)),
          sgst: Number(r.sgst.toFixed(2)),
        })),
      },
      'GSTR1_Summary_Report'
    );
  };

  const periodButtons: Period[] = ['thisMonth', 'lastMonth', 'thisQuarter', 'fy', 'custom'];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-slate-500">
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Return Period</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodButtons.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}
          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md transition-all ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Taxable Value</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totals.taxable)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totals.invoiceCount} invoices in period</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IGST Payable</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totals.igst)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Inter-state sales</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">CGST + SGST Payable</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(totals.cgst + totals.sgst + totals.b2cTax)}</p>
          <p className="text-xs text-blue-700 mt-0.5">Intra-state sales</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Exempt Supplies</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totals.exemptValue)}</p>
          <p className="text-xs text-emerald-700 mt-0.5">{totals.exemptCount} Bills of Supply (0% GST)</p>
        </div>
      </div>

      {/* B2B Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-900 text-xs md:text-sm">B2B Invoices (Registered Customers)</h4>
            <p className="text-[11px] text-slate-400">Sales to customers with GSTIN — GSTR-1 Table 4</p>
          </div>
          <button
            onClick={handleExportB2bCsv}
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
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">IGST (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
                <th className="py-3 px-4 text-right">Invoice Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {b2bRows.length > 0 ? (
                b2bRows.map((r) => (
                  <tr key={r.invoiceNumber} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(r.date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.customerName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.gstin}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.taxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.igst > 0 ? r.igst.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.cgst > 0 ? r.cgst.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.sgst > 0 ? r.sgst.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{r.total.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No B2B invoices in this period. B2B invoices require the customer's GSTIN.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* B2C Rate-wise Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h4 className="font-bold text-slate-900 text-xs md:text-sm">B2C Summary (Unregistered Customers, Rate-wise)</h4>
          <p className="text-[11px] text-slate-400">Aggregated by GST rate — GSTR-1 Table B2CS</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">GST Rate</th>
                <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                <th className="py-3 px-4 text-right">Tax Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {b2cRows.length > 0 ? (
                b2cRows.map((r) => (
                  <tr key={r.rate} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.rate}%</td>
                    <td className="py-3 px-4 text-right font-mono">{r.taxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{r.tax.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No B2C sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HSN Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-900 text-xs md:text-sm">HSN-wise Summary</h4>
            <p className="text-[11px] text-slate-400">Per product HSN code — GSTR-1 Table 12</p>
          </div>
          <button
            onClick={handleExportHsnCsv}
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
                <th className="py-3 px-4">HSN Code</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">UQC</th>
                <th className="py-3 px-4 text-right">Total Qty</th>
                <th className="py-3 px-4 text-right">Taxable (₹)</th>
                <th className="py-3 px-4 text-right">IGST (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hsnRows.length > 0 ? (
                hsnRows.map((r, idx) => (
                  <tr key={`${r.hsn}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.hsn}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.description}</td>
                    <td className="py-3 px-4 text-slate-500">{r.uqc}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.qty}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.taxable.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.igst > 0 ? r.igst.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.cgst > 0 ? r.cgst.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 text-right font-mono">{r.sgst > 0 ? r.sgst.toFixed(2) : '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No GST sales in this period. Add HSN codes to your products for a complete HSN summary.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CA Note */}
      <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          These figures follow the GSTR-1 structure (B2B, B2C rate-wise, HSN summary). Export the full JSON
          report and share it with your CA, or use the CSV exports for direct reference while filing on the
          GST portal. Sales marked Cancelled are excluded automatically.
        </p>
      </div>
    </div>
  );
};
