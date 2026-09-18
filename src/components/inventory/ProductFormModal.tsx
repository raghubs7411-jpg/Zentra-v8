import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Tags, DollarSign, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, UnitType } from '../../types';
import { toast } from 'sonner';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, currentUser } = useApp();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('General');
  const [unit, setUnit] = useState<UnitType>('Pieces');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [dealerPrice, setDealerPrice] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(10);
  const [currentStock, setCurrentStock] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [hsnCode, setHsnCode] = useState('');
  const [description, setDescription] = useState('');
  const [priceChangeReason, setPriceChangeReason] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setPurchasePrice(productToEdit.purchasePrice);
      setSellingPrice(productToEdit.sellingPrice);
      setWholesalePrice(productToEdit.wholesalePrice);
      setDealerPrice(productToEdit.dealerPrice);
      setMinStockLevel(productToEdit.minStockLevel);
      setCurrentStock(productToEdit.currentStock);
      setGstRate(productToEdit.gstRate);
      setHsnCode(productToEdit.hsnCode || '');
      setDescription(productToEdit.description || '');
      setPriceChangeReason('');
    } else {
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode('');
      setCategory('General');
      setUnit('Pieces');
      setPurchasePrice(0);
      setSellingPrice(0);
      setWholesalePrice(0);
      setDealerPrice(0);
      setMinStockLevel(10);
      setCurrentStock(50);
      setGstRate(18);
      setHsnCode('');
      setDescription('');
      setPriceChangeReason('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const isPriceModified =
    productToEdit &&
    (sellingPrice !== productToEdit.sellingPrice ||
      wholesalePrice !== productToEdit.wholesalePrice ||
      dealerPrice !== productToEdit.dealerPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || sellingPrice <= 0) {
      toast.error('Please fill product name, SKU, and a valid selling price.');
      return;
    }

    if (productToEdit) {
      updateProduct(
        productToEdit.id,
        {
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          category: category.trim(),
          unit,
          purchasePrice: Number(purchasePrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          wholesalePrice: Number(wholesalePrice) || 0,
          dealerPrice: Number(dealerPrice) || 0,
          minStockLevel: Number(minStockLevel) || 0,
          currentStock: Number(currentStock) || 0,
          gstRate: Number(gstRate) || 0,
          hsnCode: hsnCode.trim() || undefined,
          description: description.trim() || undefined,
        },
        priceChangeReason
      );
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        category: category.trim(),
        unit,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        wholesalePrice: Number(wholesalePrice) || 0,
        dealerPrice: Number(dealerPrice) || 0,
        minStockLevel: Number(minStockLevel) || 0,
        currentStock: Number(currentStock) || 0,
        gstRate: Number(gstRate) || 0,
        hsnCode: hsnCode.trim() || undefined,
        description: description.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-xs md:text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {productToEdit ? 'Edit Product & Pricing' : 'Add New Product to Catalog'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. UltraTech Super Cement (50kg Bag)"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Cement, Steel, Paint"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Product SKU / Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Barcode (Optional)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="EAN / UPC code"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="Pieces">Pieces (Pcs)</option>
                <option value="Bags">Bags</option>
                <option value="Kg">Kilograms (Kg)</option>
                <option value="Grams">Grams (g)</option>
                <option value="Litres">Litres (L)</option>
                <option value="Boxes">Boxes</option>
                <option value="Metres">Metres (m)</option>
                <option value="Hours">Hours (hr)</option>
                <option value="Packets">Packets</option>
                <option value="Units">Units</option>
              </select>
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tier Pricing (Per {unit})</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Purchase / Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  disabled={currentUser.role === 'Sales'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-700 mb-1">
                  Retail Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-400 rounded-xl font-bold text-blue-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Wholesale Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Dealer Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dealerPrice}
                  onChange={(e) => setDealerPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Price change reason log if editing */}
            {isPriceModified && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Price Change (Logged in Price History)
                </label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  placeholder="e.g. Supplier rate revision, festival discount..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}
          </div>

          {/* Stock Levels & GST Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Stock ({unit})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Stock Alert Threshold</label>
              <input
                type="number"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 252329"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
            >
              {productToEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
