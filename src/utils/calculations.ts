import { SaleItem } from '../types';

export interface LineItemCalculation {
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export const calculateLineItem = (
  unitPrice: number,
  quantity: number,
  discount: number = 0,
  discountType: 'percentage' | 'fixed' = 'fixed',
  gstRate: number = 0,
  isInterState: boolean = false
): LineItemCalculation => {
  const baseAmount = unitPrice * quantity;

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (baseAmount * discount) / 100;
  } else {
    discountAmount = discount;
  }
  discountAmount = Math.min(discountAmount, baseAmount); // Can't discount more than base

  const taxableAmount = Math.max(0, baseAmount - discountAmount);
  const taxAmount = (taxableAmount * gstRate) / 100;
  const cgstAmount = isInterState ? 0 : taxAmount / 2;
  const sgstAmount = isInterState ? 0 : taxAmount / 2;
  const igstAmount = isInterState ? taxAmount : 0;
  const totalAmount = taxableAmount + taxAmount;

  return {
    baseAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
  };
};

export interface SaleTotalsCalculation {
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalTax: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  unroundedTotal: number;
  roundOff: number;
  grandTotal: number;
}

export const calculateSaleTotals = (
  items: SaleItem[],
  isInterState: boolean = false
): SaleTotalsCalculation => {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableTotal = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const line = calculateLineItem(
      item.unitPrice,
      item.quantity,
      item.discount,
      item.discountType,
      item.gstRate,
      isInterState
    );
    subtotal += line.baseAmount;
    totalDiscount += line.discountAmount;
    taxableTotal += line.taxableAmount;
    totalTax += line.taxAmount;
  });

  const unroundedTotal = taxableTotal + totalTax;
  const grandTotal = Math.round(unroundedTotal);
  const roundOff = Number((grandTotal - unroundedTotal).toFixed(2));

  return {
    subtotal,
    totalDiscount,
    taxableTotal,
    totalTax,
    cgstTotal: isInterState ? 0 : totalTax / 2,
    sgstTotal: isInterState ? 0 : totalTax / 2,
    igstTotal: isInterState ? totalTax : 0,
    unroundedTotal,
    roundOff,
    grandTotal,
  };
};

export const calculateMargin = (
  sellingPrice: number,
  purchasePrice: number
): { profit: number; marginPercent: number } => {
  const profit = sellingPrice - purchasePrice;
  const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return {
    profit,
    marginPercent: Number(marginPercent.toFixed(1)),
  };
};
