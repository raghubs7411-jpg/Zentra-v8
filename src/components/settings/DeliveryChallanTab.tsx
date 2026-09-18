/**
 * DeliveryChallanTab — Shows all delivery challans, create new from existing sales,
 * mark delivered/returned. Embedded in SettingsPage.
 */
import React, { useState } from 'react';
import { Truck, Plus, CheckCircle2, XCircle, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface DeliveryChallanTabProps {
  sales: any[];
  deliveryChallans: any[];
  createDeliveryChallan: (params: {
    saleId: string;
    vehicleNumber: string;
    driverName: string;
    transportName: string;
    notes?: string;
  }) => any;
  updateChallanStatus: (challanId: string, status: 'Delivered' | 'Returned', receivedBy?: string) => void;
  confirmDialog: (options: any) => Promise<boolean>;
}

export const DeliveryChallanTab: React.FC<DeliveryChallanTabProps> = ({
  sales,
  deliveryChallans,
  createDeliveryChallan,
  updateChallanStatus,
  confirmDialog,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transportName, setTransportName] = useState('');
  const [notes, setNotes] = useState('');

  // Sales that don't have a challan yet
  const salesWithoutChallan = sales.filter(
    (s) => s.paymentStatus !== 'Cancelled' && !deliveryChallans.some((c) => c.saleId === s.id)
  );

  const handleCreate = () => {
    if (!selectedSaleId) {
      toast.error('Please select a sale to create challan.');
      return;
    }
    if (!vehicleNumber.trim()) {
      toast.error('Please enter vehicle number.');
      return;
    }

    const result = createDeliveryChallan({
      saleId: selectedSaleId,
      vehicleNumber: vehicleNumber.trim(),
      driverName: driverName.trim(),
      transportName: transportName.trim(),
      notes: notes.trim() || undefined,
    });

    if (result) {
      toast.success(`Delivery challan ${result.challanNumber} created.`);
      setShowCreateForm(false);
      setSelectedSaleId('');
      setVehicleNumber('');
      setDriverName('');
      setTransportName('');
      setNotes('');
    }
  };

  const handleMarkDelivered = async (challan: any) => {
    const ok = await confirmDialog({
      title: 'Mark as Delivered',
      message: `Confirm delivery of challan ${challan.challanNumber} to ${challan.customerName}?`,
      variant: 'default',
      confirmText: 'Confirm Delivery',
    });
    if (ok) {
      updateChallanStatus(challan.id, 'Delivered');
      toast.success(`Challan ${challan.challanNumber} marked as delivered.`);
    }
  };

  const handleMarkReturned = async (challan: any) => {
    const ok = await confirmDialog({
      title: 'Mark as Returned',
      message: `Mark challan ${challan.challanNumber} as returned/undelivered?`,
      variant: 'warning',
      confirmText: 'Mark Returned',
    });
    if (ok) {
      updateChallanStatus(challan.id, 'Returned');
      toast.success(`Challan ${challan.challanNumber} marked as returned.`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Delivery Challans
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Track dispatch, vehicle, and delivery confirmation for sales.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Challan</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-800">Create Delivery Challan</h4>

          {salesWithoutChallan.length === 0 ? (
            <p className="text-xs text-slate-400">No sales available without a challan. All sales have been dispatched.</p>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Select Sale (Invoice)</label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => setSelectedSaleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Select Sale --</option>
                  {salesWithoutChallan.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.invoiceNumber} — {s.customerName} ({s.items.length} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="KA01 AB 1234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Transport Name</label>
                  <input
                    type="text"
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    placeholder="e.g. VRL Logistics, Own Vehicle"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any dispatch notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
                >
                  Create Challan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Challan List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {deliveryChallans.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No delivery challans created yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click "New Challan" to create one from an existing sale.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Challan #</th>
                  <th className="py-3 px-4">Invoice / Customer</th>
                  <th className="py-3 px-4">Vehicle / Driver</th>
                  <th className="py-3 px-4">Dispatch Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryChallans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.challanNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{c.customerName}</p>
                      <p className="text-[10px] text-slate-400">{c.customerPhone}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-slate-700">{c.vehicleNumber || '-'}</p>
                      <p className="text-[10px] text-slate-400">{c.driverName} • {c.transportName}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(c.dispatchDate)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          c.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.deliveryStatus === 'Returned'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {c.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.deliveryStatus === 'Dispatched' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleMarkDelivered(c)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-[11px] transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </button>
                          <button
                            onClick={() => handleMarkReturned(c)}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-lg text-[11px] transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
