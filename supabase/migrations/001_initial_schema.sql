-- ============================================================
-- VyaparFlow CRM — Supabase Schema (Initial Migration)
-- Target: Medium-scale GST distributor (₹50K-100K daily sales)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. BUSINESS PROFILES (Multi-tenant: each business = one tenant)
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
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

-- ============================================================
-- 2. USERS & AUTH (Supabase Auth handles passwords securely)
-- ============================================================
-- Supabase provides auth.users; we add a profile table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Sales Executive',
  role_id TEXT,
  status TEXT DEFAULT 'Active', -- 'Active' | 'Disabled'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
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

-- ============================================================
-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT,
  gstin TEXT,
  customer_type TEXT DEFAULT 'Retail', -- Retail | Wholesale | Contractor | Dealer | Other
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

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
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
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, sku)
);

-- ============================================================
-- 6. PRODUCT BATCHES (Expiry & FIFO tracking)
-- ============================================================
CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  batch_number TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  manufacture_date DATE,
  expiry_date DATE,
  purchase_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. SALES
-- ============================================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
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
  payment_status TEXT DEFAULT 'Pending', -- Paid | Partially Paid | Pending | Cancelled | Refunded
  payment_method TEXT DEFAULT 'Cash',
  is_zero_gst BOOLEAN DEFAULT false,
  is_inter_state BOOLEAN DEFAULT false,
  employee_name TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, invoice_number)
);

-- ============================================================
-- 8. SALE ITEMS (Line items per sale)
-- ============================================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  sku TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed', -- percentage | fixed
  gst_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  batch_id UUID REFERENCES product_batches(id) -- which batch was dispatched
);

-- ============================================================
-- 9. INVOICES
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
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
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, invoice_number)
);

-- ============================================================
-- 10. PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  payment_number TEXT,
  invoice_id UUID REFERENCES invoices(id),
  invoice_number TEXT,
  sale_id UUID REFERENCES sales(id),
  customer_id UUID REFERENCES customers(id),
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

-- ============================================================
-- 11. PURCHASES (Stock-in from suppliers)
-- ============================================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_number TEXT,
  vendor_invoice_no TEXT,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_gstin TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending',
  scheme_details TEXT, -- manufacturer scheme / discount info
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE -- batch/expiry at purchase line level
);

-- ============================================================
-- 12. STOCK MOVEMENTS (Audit trail for every stock change)
-- ============================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  type TEXT NOT NULL, -- Sale | Purchase | Return | Damage | Adjustment | Audit
  quantity NUMERIC NOT NULL, -- negative for out, positive for in
  previous_stock NUMERIC,
  new_stock NUMERIC,
  reference_id TEXT,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. SALES RETURNS
-- ============================================================
CREATE TABLE sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  return_number TEXT,
  sale_id UUID REFERENCES sales(id),
  invoice_number TEXT,
  customer_id UUID REFERENCES customers(id),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  unit TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  refund_amount NUMERIC DEFAULT 0
);

-- ============================================================
-- 14. PRICE HISTORY (Audit trail for price changes)
-- ============================================================
CREATE TABLE price_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  price_type TEXT, -- retail | wholesale | dealer | purchase
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- ============================================================
-- 15. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  performed_by TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 16. DELIVERY CHALLANS (Dispatch tracking)
-- ============================================================
CREATE TABLE delivery_challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  challan_number TEXT,
  sale_id UUID REFERENCES sales(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  vehicle_number TEXT,
  driver_name TEXT,
  transport_name TEXT,
  dispatch_date TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'Dispatched', -- Dispatched | Delivered | Returned
  delivered_at TIMESTAMPTZ,
  received_by TEXT, -- signature/name at delivery
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE delivery_challan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id UUID REFERENCES delivery_challans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT
);

-- ============================================================
-- 17. NOTIFICATIONS (Push notification queue)
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- payment_overdue | low_stock | sale_completed | daily_summary | payment_received
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES (Performance for common queries)
-- ============================================================
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

-- ============================================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- ============================================================
-- Every query is automatically scoped to the user's business_id
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access data within their own business
CREATE POLICY "users_access_own_business" ON customers
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON products
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON sales
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON sale_items
  USING (sale_id IN (SELECT id FROM sales WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));
CREATE POLICY "users_access_own_business" ON invoices
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON payments
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON purchases
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON purchase_items
  USING (purchase_id IN (SELECT id FROM purchases WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));
CREATE POLICY "users_access_own_business" ON stock_movements
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON sales_returns
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON sales_return_items
  USING (sales_return_id IN (SELECT id FROM sales_returns WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));
CREATE POLICY "users_access_own_business" ON price_histories
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON audit_logs
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON delivery_challans
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON delivery_challan_items
  USING (challan_id IN (SELECT id FROM delivery_challans WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())));
CREATE POLICY "users_access_own_business" ON notifications
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON product_batches
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
CREATE POLICY "users_access_own_business" ON roles
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- REALTIME (Enable Supabase real-time on key tables)
-- ============================================================
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE stock_movements REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================
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

-- ============================================================
-- FCM TOKEN COLUMN (For Push Notifications)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
