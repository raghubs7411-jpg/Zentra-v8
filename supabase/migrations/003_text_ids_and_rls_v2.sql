-- ============================================================
-- VyaparFlow CRM — Migration 003: TEXT ids + RLS v2
-- REPLACES the 001/002 table structures (safe on an EMPTY
-- database — do not run if you already have production data).
--
-- Why: the app generates string ids (cust-…, si-…, pmt-…).
-- UUID primary keys made syncing impossible. This migration
-- recreates every table with TEXT ids and a simpler RLS model:
--   businesses.owner_auth_id  =  Supabase auth.users.id
-- Every query is scoped to the signed-in owner's business.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Drop the 001/002 structures (database is empty)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS generate_gstr1_report(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_overdue_customers(UUID);

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS delivery_challan_items CASCADE;
DROP TABLE IF EXISTS delivery_challans CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS price_histories CASCADE;
DROP TABLE IF EXISTS sales_return_items CASCADE;
DROP TABLE IF EXISTS sales_returns CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ------------------------------------------------------------
-- 1. BUSINESSES (one row per tenant; owner_auth_id links Supabase Auth)
-- ------------------------------------------------------------
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  logo_url TEXT,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  gstin TEXT,
  pan TEXT,
  state_code TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  bank_upi_id TEXT,
  bank_account_holder TEXT,
  invoice_prefix TEXT DEFAULT 'INV-',
  next_invoice_number INT DEFAULT 1,
  next_payment_number INT DEFAULT 1,
  next_purchase_number INT DEFAULT 1,
  next_return_number INT DEFAULT 1,
  invoice_terms TEXT DEFAULT '',
  currency_symbol TEXT DEFAULT '₹',
  enable_gst BOOLEAN DEFAULT true,
  default_gst_rate NUMERIC DEFAULT 18,
  business_state_code TEXT DEFAULT '27',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. USERS (app-level staff accounts; NOT auth.users)
--    password = local PIN used for offline login on any device
-- ------------------------------------------------------------
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Sales Executive',
  role_id TEXT,
  status TEXT DEFAULT 'Active',
  password TEXT,
  avatar_url TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. ROLES (system roles have NULL business_id and are shared)
-- ------------------------------------------------------------
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_system_role BOOLEAN DEFAULT false,
  accessible_modules TEXT[] DEFAULT '{}',
  can_view_cost_price BOOLEAN DEFAULT false,
  can_view_profit BOOLEAN DEFAULT false,
  can_edit_prices BOOLEAN DEFAULT false,
  can_cancel_invoices BOOLEAN DEFAULT false,
  can_process_returns BOOLEAN DEFAULT false,
  can_delete_products BOOLEAN DEFAULT false,
  can_delete_sales BOOLEAN DEFAULT false,
  can_modify_stock BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT,
  gstin TEXT,
  customer_type TEXT DEFAULT 'Retail',
  credit_limit NUMERIC DEFAULT 0,
  payment_terms_days INT DEFAULT 15,
  total_purchases NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  opening_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  unit TEXT DEFAULT 'Pieces',
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  wholesale_price NUMERIC DEFAULT 0,
  dealer_price NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  hsn_code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. PRODUCT BATCHES (expiry & FIFO — used by mobile app later)
-- ------------------------------------------------------------
CREATE TABLE product_batches (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  batch_number TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  manufacture_date DATE,
  expiry_date DATE,
  purchase_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 7. SALES + SALE ITEMS
-- ------------------------------------------------------------
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_gstin TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  subtotal NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending',
  payment_method TEXT DEFAULT 'Cash',
  split_payments JSONB,
  is_zero_gst BOOLEAN DEFAULT false,
  is_inter_state BOOLEAN DEFAULT false,
  employee_name TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  sku TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  gst_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  batch_id TEXT REFERENCES product_batches(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 8. INVOICES (items are the parent sale's items)
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_gstin TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  subtotal NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending',
  is_zero_gst BOOLEAN DEFAULT false,
  is_inter_state BOOLEAN DEFAULT false,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 9. PAYMENTS
-- ------------------------------------------------------------
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  payment_number TEXT,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_number TEXT,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT DEFAULT 'Cash',
  reference_no TEXT,
  cheque_number TEXT,
  bank_name TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 10. PURCHASES + PURCHASE ITEMS
-- ------------------------------------------------------------
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_number TEXT,
  vendor_invoice_no TEXT,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_gstin TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  credit_days INT,
  due_date TIMESTAMPTZ,
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending',
  scheme_details TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE
);

-- ------------------------------------------------------------
-- 11. STOCK MOVEMENTS
-- ------------------------------------------------------------
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  reference_id TEXT,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 12. SALES RETURNS + ITEMS
-- ------------------------------------------------------------
CREATE TABLE sales_returns (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  return_number TEXT,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  invoice_number TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  total_refund_amount NUMERIC DEFAULT 0,
  restock_inventory BOOLEAN DEFAULT false,
  refund_method TEXT DEFAULT 'Cash',
  reason TEXT,
  processed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_return_items (
  id TEXT PRIMARY KEY,
  sales_return_id TEXT REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  refund_amount NUMERIC DEFAULT 0
);

-- ------------------------------------------------------------
-- 13. PRICE HISTORIES
-- ------------------------------------------------------------
CREATE TABLE price_histories (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  price_type TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- ------------------------------------------------------------
-- 14. AUDIT LOGS
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  performed_by TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 15. DELIVERY CHALLANS + ITEMS
-- ------------------------------------------------------------
CREATE TABLE delivery_challans (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  challan_number TEXT,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  vehicle_number TEXT,
  driver_name TEXT,
  transport_name TEXT,
  dispatch_date TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'Dispatched',
  delivered_at TIMESTAMPTZ,
  received_by TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE delivery_challan_items (
  id TEXT PRIMARY KEY,
  challan_id TEXT REFERENCES delivery_challans(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT
);

-- ------------------------------------------------------------
-- 16. NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_sales_business ON sales(business_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_purchases_business ON purchases(business_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_delivery_challans_sale ON delivery_challans(sale_id);
CREATE INDEX idx_product_batches_product ON product_batches(product_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY — v2
-- businesses.owner_auth_id identifies the tenant owner.
-- ------------------------------------------------------------
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- businesses: owner sees/edits only their own row
CREATE POLICY "businesses_owner_access" ON businesses
  USING (owner_auth_id = auth.uid())
  WITH CHECK (owner_auth_id = auth.uid());

-- users: any signed-in member of the business
CREATE POLICY "users_business_access" ON users
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

-- roles: system roles (business_id IS NULL) readable by all signed-in owners,
-- custom roles scoped to the business
CREATE POLICY "roles_access" ON roles
  USING (business_id IS NULL OR business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IS NULL OR business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

-- Data tables: everything belongs to the owner's business
CREATE POLICY "own_business_data" ON customers
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON products
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON product_batches
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON sales
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON sale_items
  USING (sale_id IN (SELECT id FROM sales WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())))
  WITH CHECK (sale_id IN (SELECT id FROM sales WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())));

CREATE POLICY "own_business_data" ON invoices
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON payments
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON purchases
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON purchase_items
  USING (purchase_id IN (SELECT id FROM purchases WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())))
  WITH CHECK (purchase_id IN (SELECT id FROM purchases WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())));

CREATE POLICY "own_business_data" ON stock_movements
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON sales_returns
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON sales_return_items
  USING (sales_return_id IN (SELECT id FROM sales_returns WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())))
  WITH CHECK (sales_return_id IN (SELECT id FROM sales_returns WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())));

CREATE POLICY "own_business_data" ON price_histories
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON audit_logs
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON delivery_challans
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON delivery_challan_items
  USING (challan_id IN (SELECT id FROM delivery_challans WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())))
  WITH CHECK (challan_id IN (SELECT id FROM delivery_challans WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())));

CREATE POLICY "own_business_data" ON notifications
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

-- ------------------------------------------------------------
-- REALTIME
-- ------------------------------------------------------------
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE stock_movements REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- REPORT FUNCTIONS (from 002, now with TEXT business ids)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_gstr1_report(
  p_business_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  invoice_number TEXT,
  invoice_date DATE,
  customer_name TEXT,
  customer_gstin TEXT,
  is_inter_state BOOLEAN,
  invoice_type TEXT,
  taxable_value NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  total_tax NUMERIC,
  grand_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.invoice_number,
    DATE(s.date) AS invoice_date,
    s.customer_name,
    s.customer_gstin,
    s.is_inter_state,
    CASE
      WHEN s.customer_gstin IS NOT NULL AND LENGTH(s.customer_gstin) >= 15 THEN 'B2B'
      ELSE 'B2C'
    END AS invoice_type,
    (s.subtotal - s.total_discount) AS taxable_value,
    CASE WHEN s.is_inter_state THEN 0 ELSE s.total_tax / 2 END AS cgst,
    CASE WHEN s.is_inter_state THEN 0 ELSE s.total_tax / 2 END AS sgst,
    CASE WHEN s.is_inter_state THEN s.total_tax ELSE 0 END AS igst,
    s.total_tax,
    s.grand_total
  FROM sales s
  WHERE s.business_id = p_business_id
    AND DATE(s.date) >= p_start_date
    AND DATE(s.date) <= p_end_date
    AND s.payment_status != 'Cancelled'
  ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_overdue_customers(
  p_business_id TEXT
)
RETURNS TABLE (
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  outstanding_balance NUMERIC,
  oldest_overdue_date DATE,
  days_overdue INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.outstanding_balance,
    DATE(MIN(s.date)) AS oldest_overdue_date,
    EXTRACT(DAY FROM now() - MIN(s.date))::INT AS days_overdue
  FROM customers c
  JOIN sales s ON s.customer_id = c.id
  WHERE c.business_id = p_business_id
    AND c.outstanding_balance > 0
    AND s.balance_due > 0
    AND s.payment_status != 'Cancelled'
  GROUP BY c.id, c.name, c.phone, c.outstanding_balance
  HAVING MIN(s.date) < now() - INTERVAL '15 days'
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql;
