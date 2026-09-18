-- ============================================================
-- GSTR-1 Report Generation (PostgreSQL Function)
-- Generates monthly GSTR-1 summary from sales data
-- ============================================================

CREATE OR REPLACE FUNCTION generate_gstr1_report(
  p_business_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  invoice_number TEXT,
  invoice_date DATE,
  customer_name TEXT,
  customer_gstin TEXT,
  is_inter_state BOOLEAN,
  invoice_type TEXT, -- B2B | B2C
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

-- ============================================================
-- Overdue Payment Check Function
-- Returns customers with overdue outstanding balance
-- ============================================================

CREATE OR REPLACE FUNCTION get_overdue_customers(
  p_business_id UUID
)
RETURNS TABLE (
  customer_id UUID,
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
