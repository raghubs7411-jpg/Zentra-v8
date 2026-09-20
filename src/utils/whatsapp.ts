import { BusinessProfile, Invoice, Quote } from '../types';
import { formatCurrency, formatDate } from './formatters';

export const cleanPhoneForWhatsApp = (phone: string): string => {
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
};

export const generateInvoiceWhatsAppUrl = (
  phone: string,
  business: BusinessProfile,
  invoice: Invoice
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const itemsSummary = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* (${item.quantity} ${item.unit}) - ${formatCurrency(item.totalAmount)}`
    )
    .join('\n');

  const text = `*Tax Invoice from ${business.name}*
📄 *Invoice No:* ${invoice.invoiceNumber}
📅 *Date:* ${formatDate(invoice.date)}
👤 *Customer:* ${invoice.customerName}

*Items Purchased:*
${itemsSummary}

---------------------------------
*Grand Total:* ${formatCurrency(invoice.grandTotal)}
*Amount Paid:* ${formatCurrency(invoice.amountPaid)}
*Balance Due:* ${formatCurrency(invoice.balanceDue)}
---------------------------------

${invoice.balanceDue > 0 ? `*Payment UPI:* ${business.bankDetails.upiId}\n*Bank:* ${business.bankDetails.bankName} (A/C: ${business.bankDetails.accountNo}, IFSC: ${business.bankDetails.ifscCode})\n` : ''}
Thank you for your business! 🙏
_${business.name} | Ph: ${business.phone}_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

export const generateQuoteWhatsAppUrl = (
  phone: string,
  business: BusinessProfile,
  quote: Quote
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const itemsSummary = quote.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* (${item.quantity} ${item.unit}) - ${formatCurrency(item.totalAmount)}`
    )
    .join('\n');

  const text = `*Quotation from ${business.name}*
📄 *Quote No:* ${quote.quoteNumber}
📅 *Date:* ${formatDate(quote.date)}
⏳ *Valid Until:* ${formatDate(quote.validUntil)}
👤 *Customer:* ${quote.customerName}

*Items Quoted:*
${itemsSummary}

---------------------------------
*Quoted Total (incl. GST):* ${formatCurrency(quote.grandTotal)}
---------------------------------

This is a rate quotation, not a tax invoice. Please reply to confirm your order.

Thank you for your business! 🙏
_${business.name} | Ph: ${business.phone}_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

export const generatePaymentReminderWhatsAppUrl = (
  phone: string,
  customerName: string,
  business: BusinessProfile,
  outstandingAmount: number,
  pendingInvoices: string[]
): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const invStr = pendingInvoices.length > 0 ? ` for Invoice(s): *${pendingInvoices.join(', ')}*` : '';

  const text = `Dear *${customerName}*,

Greetings from *${business.name}*. 🙏

This is a gentle reminder that an outstanding payment of *${formatCurrency(outstandingAmount)}* is pending${invStr}.

Kindly arrange the payment at your earliest convenience via:
*UPI ID:* ${business.bankDetails.upiId}
*Bank:* ${business.bankDetails.bankName}
*A/C No:* ${business.bankDetails.accountNo}
*IFSC Code:* ${business.bankDetails.ifscCode}

If you have already made the payment, please disregard this message.

Thank you!
*${business.name}* | Ph: ${business.phone}`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
