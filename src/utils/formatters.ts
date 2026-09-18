/**
 * Currency, Date and Text Formatting Utilities for Indian & International MSMEs
 */

// Module-level currency symbol, set by AppContext from BusinessProfile
let _currencySymbol = '₹';
export const setCurrencySymbol = (symbol: string): void => {
  _currencySymbol = symbol || '₹';
};

export const formatCurrency = (amount: number | undefined | null, showSymbol = true): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? `${_currencySymbol}0.00` : '0.00';
  }

  // Format using Indian Numbering System (Lakhs & Crores)
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  // Indian numbering regex
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = `${formattedInteger}.${decimalPart}`;
  const prefix = isNegative ? '-' : '';
  return showSymbol ? `${prefix}${_currencySymbol}${result}` : `${prefix}${result}`;
};

export const formatDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

export const formatDateTime = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
};

export const formatPhone = (phone: string | undefined): string => {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
};

// Convert number to Indian words for GST Invoice Printout
export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    if (n < 1000) {
      return (
        inWords(Math.floor(n / 100)) +
        'Hundred ' +
        (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '')
      );
    }
    if (n < 100000) {
      return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    }
    if (n < 10000000) {
      return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    }
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  };

  const whole = Math.floor(Math.abs(num));
  const fraction = Math.round((Math.abs(num) - whole) * 100);

  let result = 'Rupees ' + inWords(whole);
  if (fraction > 0) {
    result += 'and ' + inWords(fraction) + 'Paise ';
  }
  result += 'Only';
  return result.replace(/\s+/g, ' ').trim();
};
