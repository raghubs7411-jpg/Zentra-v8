import React, { useState } from 'react';
import { History, Search, Download, ShieldCheck, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../utils/formatters';
import { exportToCsvFile } from '../../utils/storage';

export const AuditTrailPage: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (entityFilter !== 'ALL' && log.entityType !== entityFilter) {
      return false;
    }

    return true;
  });

  const handleExportCsv = () => {
    const data = filteredLogs.map((l) => ({
      Timestamp: formatDateTime(l.timestamp),
      Action: l.action,
      Entity: l.entityType,
      'Reference ID': l.entityId,
      Details: l.details,
      'Performed By': l.performedBy,
    }));
    exportToCsvFile(data, 'System_Audit_Trail_Log');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-blue-600" />
            <span>Audit Trail & Activity Log</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Immutable log of all price changes, sales, stock movements, and user actions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center px-3 py-2 border border-slate-300 rounded-xl bg-slate-50/50 w-full sm:w-80 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all text-xs">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, reference ID, employee..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Entity Types</option>
            <option value="Sale">Sale / Invoices</option>
            <option value="Payment">Payments</option>
            <option value="Price">Price Changes</option>
            <option value="Inventory">Inventory Adjustments</option>
            <option value="Purchase">Purchases</option>
            <option value="Customer">Customers</option>
            <option value="Settings">Settings</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{log.details}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{log.performedBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No activity logs found.
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
