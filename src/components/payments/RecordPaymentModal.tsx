import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, User, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerId?: string | null;
  defaultInvoiceId?: string | null;
  onPaymentRecorded: (paymentId: string) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerId,
  defaultInvoiceId,
  onPaymentRecorded,
}) => {
  const { customers, invoices, recordPayment } = useApp();

  const [customerId, setCustomerId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (defaultCustomerId) {
      setCustomerId(defaultCustomerId);
    }
    if (defaultInvoiceId) {
      setInvoiceId(defaultInvoiceId);
      const inv = invoices.find((i) => i.id === defaultInvoiceId);
      if (inv) {
        setAmount(inv.balanceDue);
        if (!customerId) setCustomerId(inv.customerId);
      }
    }
  }, [defaultCustomerId, defaultInvoiceId, invoices, isOpen]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerInvoices = invoices.filter(
    (i) => i.customerId === customerId && i.balanceDue > 0
  );

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    if (invId) {
      const inv = invoices.find((i) => i.id === invId);
      if (inv) setAmount(inv.balanceDue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (amount <= 0) {
      toast.error('Please enter a payment amount greater than 0.');
      return;
    }

    const newPayment = recordPayment({
      customerId,
      invoiceId: invoiceId || undefined,
      amount: Number(amount),
      paymentDate: new Date(paymentDate).toISOString(),
      paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
      chequeNumber: chequeNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onPaymentRecorded(newPayment.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Record Inward Customer Payment</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Customer Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceId('');
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c && c.outstandingBalance > 0) setAmount(c.outstandingBalance);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Khata Balance: {formatCurrency(c.outstandingBalance)})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Khata Balance Snapshot */}
          {selectedCustomer && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Current Outstanding Khata:</span>
                <p className="font-black text-amber-600 text-sm mt-0.5">
                  {formatCurrency(selectedCustomer.outstandingBalance)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Pending Invoices:</span>
                <p className="font-bold text-slate-700 mt-0.5">{customerInvoices.length} unpaid</p>
              </div>
            </div>
          )}

          {/* Invoice Linking (Optional) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Link to Specific Invoice (Optional)
            </label>
            <select
              value={invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">-- General Account Settlement / Unallocated --</option>
              {customerInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} (Total: {formatCurrency(inv.grandTotal)}, Due: {formatCurrency(inv.balanceDue)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount Received (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              {(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-1.5 rounded-lg border text-center font-bold transition-all ${
                    paymentMethod === mode
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Mode specifics */}
          {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UTR / Transaction Ref Number</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UPI/3291084491 or IMPS2608129"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          {paymentMethod === 'Cheque' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cheque Number</label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="6-digit cheque #"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. SBI, HDFC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via Google Pay at shop"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
            >
              Record Payment & Issue Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
