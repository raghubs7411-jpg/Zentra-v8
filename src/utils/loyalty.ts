/**
 * Customer Loyalty & Ageing Analysis Utilities
 *
 * Calculates repeat purchase tiers, visit frequency, and outstanding ageing buckets
 * from existing sales data — no schema changes needed.
 */

export type LoyaltyTier = 'New' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyInfo {
  visitCount: number;
  totalBilled: number;
  avgBillValue: number;
  tier: LoyaltyTier;
  tierColor: string;
  tierBg: string;
  tierIcon: string;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  daysSinceLastPurchase: number;
  isRepeatCustomer: boolean;
}

export interface AgeingBucket {
  label: string;
  amount: number;
  invoiceCount: number;
  color: string;
  bg: string;
}

const TIER_CONFIG: Record<LoyaltyTier, { color: string; bg: string; icon: string; minVisits: number }> = {
  New:      { color: 'text-slate-600',   bg: 'bg-slate-100',   icon: '🆕', minVisits: 0 },
  Bronze:   { color: 'text-amber-700',   bg: 'bg-amber-100',   icon: '🥉', minVisits: 3 },
  Silver:   { color: 'text-slate-500',   bg: 'bg-slate-200',   icon: '🥈', minVisits: 6 },
  Gold:     { color: 'text-yellow-600',  bg: 'bg-yellow-100',  icon: '🥇', minVisits: 12 },
  Platinum: { color: 'text-indigo-600', bg: 'bg-indigo-100',  icon: '💎', minVisits: 25 },
};

export const calculateLoyalty = (
  sales: { customerId: string; date: string; grandTotal: number; paymentStatus: string }[],
  customerId: string
): LoyaltyInfo => {
  const customerSales = sales
    .filter((s) => s.customerId === customerId && s.paymentStatus !== 'Cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const visitCount = customerSales.length;
  const totalBilled = customerSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const avgBillValue = visitCount > 0 ? totalBilled / visitCount : 0;
  const firstPurchaseDate = visitCount > 0 ? customerSales[0].date : undefined;
  const lastPurchaseDate = visitCount > 0 ? customerSales[visitCount - 1].date : undefined;
  const daysSinceLastPurchase = lastPurchaseDate
    ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / 86400000)
    : -1;

  let tier: LoyaltyTier = 'New';
  if (visitCount >= 25) tier = 'Platinum';
  else if (visitCount >= 12) tier = 'Gold';
  else if (visitCount >= 6) tier = 'Silver';
  else if (visitCount >= 3) tier = 'Bronze';

  const config = TIER_CONFIG[tier];

  return {
    visitCount,
    totalBilled,
    avgBillValue,
    tier,
    tierColor: config.color,
    tierBg: config.bg,
    tierIcon: config.icon,
    firstPurchaseDate,
    lastPurchaseDate,
    daysSinceLastPurchase,
    isRepeatCustomer: visitCount >= 2,
  };
};

/**
 * Calculate ageing buckets for outstanding invoices.
 * Buckets: 0-30 days, 31-60 days, 61-90 days, 90+ days
 */
export const calculateAgeingBuckets = (
  invoices: { customerId: string; date: string; balanceDue: number; paymentStatus: string }[],
  customerId: string
): AgeingBucket[] => {
  const customerInvoices = invoices.filter(
    (inv) =>
      inv.customerId === customerId &&
      inv.balanceDue > 0 &&
      inv.paymentStatus !== 'Cancelled' &&
      inv.paymentStatus !== 'Paid'
  );

  const now = Date.now();
  const buckets: Record<string, { amount: number; count: number }> = {
    '0-30': { amount: 0, count: 0 },
    '31-60': { amount: 0, count: 0 },
    '61-90': { amount: 0, count: 0 },
    '90+': { amount: 0, count: 0 },
  };

  customerInvoices.forEach((inv) => {
    const days = Math.floor((now - new Date(inv.date).getTime()) / 86400000);
    if (days <= 30) {
      buckets['0-30'].amount += inv.balanceDue;
      buckets['0-30'].count++;
    } else if (days <= 60) {
      buckets['31-60'].amount += inv.balanceDue;
      buckets['31-60'].count++;
    } else if (days <= 90) {
      buckets['61-90'].amount += inv.balanceDue;
      buckets['61-90'].count++;
    } else {
      buckets['90+'].amount += inv.balanceDue;
      buckets['90+'].count++;
    }
  });

  return [
    { label: '0-30 Days',   amount: buckets['0-30'].amount,   invoiceCount: buckets['0-30'].count,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: '31-60 Days',  amount: buckets['31-60'].amount,  invoiceCount: buckets['31-60'].count,  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
    { label: '61-90 Days',  amount: buckets['61-90'].amount,  invoiceCount: buckets['61-90'].count,  color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
    { label: '90+ Days',    amount: buckets['90+'].amount,    invoiceCount: buckets['90+'].count,    color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
  ];
};

/**
 * Get all customers with ageing data for the collections dashboard.
 */
export const calculateCollectionSummary = (
  customers: { id: string; name: string; phone: string; outstandingBalance: number; customerType: string }[],
  invoices: { customerId: string; date: string; balanceDue: number; paymentStatus: string; invoiceNumber: string }[]
) => {
  return customers
    .filter((c) => c.outstandingBalance > 0)
    .map((c) => {
      const buckets = calculateAgeingBuckets(invoices, c.id);
      const totalOutstanding = buckets.reduce((sum, b) => sum + b.amount, 0);
      const overdueAmount = buckets
        .filter((b) => b.label !== '0-30 Days')
        .reduce((sum, b) => sum + b.amount, 0);
      const loyalty = calculateLoyalty(
        invoices.map((i) => ({ customerId: i.customerId, date: i.date, grandTotal: i.balanceDue, paymentStatus: i.paymentStatus })),
        c.id
      );

      return {
        ...c,
        ageingBuckets: buckets,
        totalOutstanding,
        overdueAmount,
        visitCount: loyalty.visitCount,
        tier: loyalty.tier,
        tierIcon: loyalty.tierIcon,
        isRepeatCustomer: loyalty.isRepeatCustomer,
      };
    })
    .sort((a, b) => b.overdueAmount - a.overdueAmount);
};
