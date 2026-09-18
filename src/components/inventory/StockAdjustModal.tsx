import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, StockMovementType } from '../../types';
import { toast } from 'sonner';

interface StockAdjustModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  productId,
  isOpen,
  onClose,
}) => {
  const { products, adjustStock } = useApp();
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>('Adjustment');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');

  if (!isOpen || !productId) return null;

  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  const currentStock = product.currentStock;
  const quantityDelta = direction === 'add' ? quantity : -quantity;
  const newProjectedStock = Math.max(0, currentStock + quantityDelta);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the stock adjustment.');
      return;
    }

    adjustStock(product.id, quantityDelta, adjustmentType, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs md:text-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Adjust Stock: {product.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Current Stock On Hand</span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {currentStock} {product.unit}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Min Threshold</span>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                {product.minStockLevel} {product.unit}
              </p>
            </div>
          </div>

          {/* Direction toggle: Add vs Deduct */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adjustment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('add')}
                className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl border font-bold transition-all ${
                  direction === 'add'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>+ Stock In / Add</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('remove')}
                className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl border font-bold transition-all ${
                  direction === 'remove'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>- Reduce / Deduct</span>
              </button>
            </div>
          </div>

          {/* Adjustment category / reason type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adjustment Category</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as StockMovementType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="Adjustment">General Stock Adjustment</option>
              <option value="Damage">Damaged / Broken / Expired Stock</option>
              <option value="Audit">Physical Count Audit Correction</option>
              <option value="Purchase">Manual Inward Stock Receipt</option>
              <option value="Return">Supplier / Vendor Return</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Quantity to {direction === 'add' ? 'Add' : 'Deduct'} ({product.unit}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={quantity || ''}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-slate-900 text-base focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Reason notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason / Reference <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Month-end inventory verification count"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Projected outcome pill */}
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex justify-between items-center text-xs">
            <span className="text-indigo-900 font-semibold">New Stock Level After Adjustment:</span>
            <span className="font-black text-indigo-700 text-sm">
              {newProjectedStock} {product.unit}
            </span>
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
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
