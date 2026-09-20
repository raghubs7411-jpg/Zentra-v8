-- VyaparFlow CRM — Migration 004: Quotations (rate quotes / estimates)
-- Quotes are NON-POSTING documents: they never touch stock, customer
-- balances, invoices or payments. An accepted quote can be converted
-- into a Sale (which then posts normally).

-- ------------------------------------------------------------ 
-- 1. QUOTE NUMBER COUNTER on businesses
-- ------------------------------------------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_quote_number INTEGER DEFAULT 1;

-- ------------------------------------------------------------
-- 2. QUOTATIONS (parent)
-- ------------------------------------------------------------
CREATE TABLE quotations (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_gstin TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  subtotal NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  is_zero_gst BOOLEAN DEFAULT false,
  is_inter_state BOOLEAN DEFAULT false,
  notes TEXT,
  converted_sale_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. QUOTATION ITEMS (child)
-- ------------------------------------------------------------
CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT REFERENCES quotations(id) ON DELETE CASCADE,
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
  total_amount NUMERIC DEFAULT 0
);

-- ------------------------------------------------------------
-- 4. INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_quotations_business ON quotations(business_id);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotation_items_quote ON quotation_items(quote_id);

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (owner-scoped, same model as sales)
-- ------------------------------------------------------------
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_business_data" ON quotations
  USING (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid()));

CREATE POLICY "own_business_data" ON quotation_items
  USING (quote_id IN (SELECT id FROM quotations WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())))
  WITH CHECK (quote_id IN (SELECT id FROM quotations WHERE business_id IN (SELECT id FROM businesses WHERE owner_auth_id = auth.uid())));

-- ------------------------------------------------------------
-- 6. REALTIME + updated_at trigger (same conventions as 003)
-- ------------------------------------------------------------
ALTER TABLE quotations REPLICA IDENTITY FULL;

CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
