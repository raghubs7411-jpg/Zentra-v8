# Zentra Suite v3.0 — VyaparFlow CRM

**Connected CRM, Billing, Stock & Payments** — business software for India's GST distributors.

Built for medium-scale, single-product-category GST distributors billing ₹50K–1L per day on credit (khata), dispatching from stock, and filing GST monthly.

## Getting started (one time only)

```bash
git clone https://github.com/raghubs7411-jpg/Zentra-v8.git
cd Zentra-v8
npm install
npm run dev
```

## How to update when new changes are pushed

1. In VS Code, open the Source Control panel (Ctrl+Shift+G) and click **Sync Changes**, or run `git pull` in the terminal.
2. That's it — Vite hot-reloads the app in the browser automatically.
3. Run `npm install` again **only** when `package.json` changes (you will be told when it does).

No re-downloading, no deleting folders, no re-extracting.

## Project structure

- `src/` — web app (React + TypeScript + Vite + Tailwind)
- `mobile/` — React Native mobile app
- `supabase/` — SQL migrations (17 tables + row-level security, GSTR-1 & overdue functions)

## Feature highlights

- GST billing — CGST / SGST / IGST, Bill of Supply, HSN/SAC search, 3 invoice templates (A4 GST, Classic, 80mm thermal)
- Tiered pricing — retail / wholesale / dealer price per product
- Customer khata — credit limits, payment terms, ageing analysis (0-30/60/90+), loyalty tiers
- Inventory — live stock, low-stock alerts, adjustments, audit trail
- Purchases — vendor credit days, due dates, overdue tracking
- Delivery challans, WhatsApp invoice & reminder sharing
- Multi-user roles with granular permissions
- Offline-first — works without internet
