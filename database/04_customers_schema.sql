-- ========================================
-- ZANDE BOOKS - CUSTOMERS MODULE
-- Full customer/client management with AR integration
-- ========================================

-- ========================================
-- 1. CUSTOMERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  customer_code VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255), -- How name appears on invoices
  customer_type VARCHAR(20) DEFAULT 'INDIVIDUAL' CHECK (customer_type IN ('INDIVIDUAL', 'BUSINESS')),
  
  -- Contact Info
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  website VARCHAR(255),
  
  -- Primary Contact Person (for businesses)
  contact_person VARCHAR(255),
  contact_title VARCHAR(100),
  
  -- Address
  billing_address_line1 VARCHAR(255),
  billing_address_line2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_province VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(100) DEFAULT 'South Africa',
  
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'South Africa',
  shipping_same_as_billing BOOLEAN DEFAULT TRUE,
  
  -- Financial Info
  credit_limit DECIMAL(15,2) DEFAULT 0.00,
  payment_terms VARCHAR(20) DEFAULT 'NET30', -- NET30, NET15, NET7, COD, IMMEDIATE
  payment_terms_days INTEGER DEFAULT 30,
  tax_number VARCHAR(50), -- VAT number if VAT registered
  is_vat_registered BOOLEAN DEFAULT FALSE,
  
  -- Account Settings
  ar_account_id UUID REFERENCES chart_of_accounts(id), -- Custom AR account (optional)
  default_revenue_account_id UUID REFERENCES chart_of_accounts(id), -- Default revenue account
  pricing_tier VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, WHOLESALE, RETAIL, etc.
  discount_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Status & Flags
  is_active BOOLEAN DEFAULT TRUE,
  credit_hold BOOLEAN DEFAULT FALSE,
  credit_hold_reason TEXT,
  tags TEXT[], -- Array of tags for filtering
  notes TEXT,
  
  -- Balances (calculated)
  current_balance DECIMAL(15,2) DEFAULT 0.00, -- What customer owes
  credit_used DECIMAL(15,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  
  UNIQUE(company_id, customer_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);

-- ========================================
-- 2. CUSTOMER TRANSACTIONS (AR LEDGER)
-- ========================================
CREATE TABLE IF NOT EXISTS customer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  
  -- Transaction Info
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN 
    ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'REFUND', 'ADJUSTMENT')),
  transaction_number VARCHAR(50) NOT NULL,
  reference VARCHAR(100), -- External reference
  description TEXT,
  
  -- Amounts
  amount DECIMAL(15,2) NOT NULL, -- Positive for invoices/debits, negative for payments/credits
  amount_paid DECIMAL(15,2) DEFAULT 0.00,
  amount_due DECIMAL(15,2) GENERATED ALWAYS AS (amount - amount_paid) STORED,
  
  -- Payment Terms
  due_date DATE,
  payment_terms VARCHAR(20),
  
  -- Status
  status VARCHAR(20) DEFAULT 'UNPAID' CHECK (status IN 
    ('DRAFT', 'SENT', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID')),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  
  -- Links
  journal_entry_id UUID REFERENCES journal_entries(id), -- Link to GL posting
  source_document_id UUID, -- Link to invoice/payment record
  applied_to_id UUID REFERENCES customer_transactions(id), -- If payment, which invoice it applies to
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  UNIQUE(company_id, transaction_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_trans_company ON customer_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_trans_customer ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_trans_date ON customer_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_customer_trans_type ON customer_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_trans_status ON customer_transactions(status);
CREATE INDEX IF NOT EXISTS idx_customer_trans_due ON customer_transactions(due_date);

-- ========================================
-- 3. CUSTOMER PAYMENT APPLICATIONS
-- ========================================
-- Tracks which payments apply to which invoices
CREATE TABLE IF NOT EXISTS customer_payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES customer_transactions(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES customer_transactions(id) ON DELETE CASCADE,
  amount_applied DECIMAL(15,2) NOT NULL,
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_apps_customer ON customer_payment_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_payment ON customer_payment_applications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_invoice ON customer_payment_applications(invoice_id);

-- ========================================
-- 4. CUSTOMER STATEMENTS
-- ========================================
-- Tracks when statements were sent
CREATE TABLE IF NOT EXISTS customer_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  opening_balance DECIMAL(15,2) NOT NULL,
  closing_balance DECIMAL(15,2) NOT NULL,
  statement_html TEXT, -- HTML version for email
  statement_pdf_url TEXT, -- Link to PDF storage
  sent_date TIMESTAMP WITH TIME ZONE,
  sent_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_statements_customer ON customer_statements(customer_id);
CREATE INDEX IF NOT EXISTS idx_statements_date ON customer_statements(statement_date);

-- ========================================
-- 5. CUSTOMER AGING VIEW
-- ========================================
CREATE OR REPLACE VIEW customer_aging AS
SELECT 
  c.company_id,
  c.id as customer_id,
  c.customer_code,
  c.customer_name,
  c.email,
  c.phone,
  c.credit_limit,
  c.current_balance as total_outstanding,
  
  -- Aging buckets
  COALESCE(SUM(CASE 
    WHEN ct.due_date IS NULL OR ct.due_date >= CURRENT_DATE THEN ct.amount_due 
    ELSE 0 
  END), 0) as current_amount,
  
  COALESCE(SUM(CASE 
    WHEN ct.due_date < CURRENT_DATE AND ct.due_date >= CURRENT_DATE - INTERVAL '30 days' 
    THEN ct.amount_due ELSE 0 
  END), 0) as days_1_30,
  
  COALESCE(SUM(CASE 
    WHEN ct.due_date < CURRENT_DATE - INTERVAL '30 days' AND ct.due_date >= CURRENT_DATE - INTERVAL '60 days' 
    THEN ct.amount_due ELSE 0 
  END), 0) as days_31_60,
  
  COALESCE(SUM(CASE 
    WHEN ct.due_date < CURRENT_DATE - INTERVAL '60 days' AND ct.due_date >= CURRENT_DATE - INTERVAL '90 days' 
    THEN ct.amount_due ELSE 0 
  END), 0) as days_61_90,
  
  COALESCE(SUM(CASE 
    WHEN ct.due_date < CURRENT_DATE - INTERVAL '90 days' 
    THEN ct.amount_due ELSE 0 
  END), 0) as days_over_90,
  
  -- Oldest invoice date
  MIN(ct.transaction_date) FILTER (WHERE ct.amount_due > 0) as oldest_invoice_date,
  
  -- Days overdue for oldest invoice
  COALESCE(EXTRACT(DAY FROM (
    CURRENT_DATE - MIN(ct.due_date) FILTER (WHERE ct.amount_due > 0 AND ct.due_date < CURRENT_DATE)
  ))::INTEGER, 0) as days_overdue

FROM customers c
LEFT JOIN customer_transactions ct ON c.id = ct.customer_id 
  AND ct.transaction_type IN ('INVOICE', 'DEBIT_NOTE')
  AND ct.status NOT IN ('VOID', 'PAID')
  AND ct.amount_due > 0
WHERE c.is_active = TRUE
GROUP BY c.company_id, c.id, c.customer_code, c.customer_name, c.email, c.phone, c.credit_limit, c.current_balance;

-- ========================================
-- 6. TRIGGERS
-- ========================================

-- Auto-update customer balance when transactions change
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET 
    current_balance = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('INVOICE', 'DEBIT_NOTE') THEN amount_due
          WHEN transaction_type IN ('PAYMENT', 'CREDIT_NOTE', 'REFUND') THEN -amount_due
          ELSE 0
        END
      ), 0)
      FROM customer_transactions
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
        AND status != 'VOID'
    ),
    credit_used = CASE 
      WHEN credit_limit > 0 THEN 
        LEAST(credit_limit, (
          SELECT COALESCE(SUM(amount_due), 0)
          FROM customer_transactions
          WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
            AND transaction_type IN ('INVOICE', 'DEBIT_NOTE')
            AND status != 'VOID'
        ))
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_balance
AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
FOR EACH ROW
EXECUTE FUNCTION update_customer_balance();

-- Auto-update transaction status based on amount paid
CREATE OR REPLACE FUNCTION update_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_paid flag
  NEW.is_paid := (NEW.amount_paid >= NEW.amount);
  
  -- Update status
  IF NEW.amount_paid = 0 THEN
    NEW.status := 'UNPAID';
  ELSIF NEW.amount_paid >= NEW.amount THEN
    NEW.status := 'PAID';
    IF NEW.paid_date IS NULL THEN
      NEW.paid_date := CURRENT_DATE;
    END IF;
  ELSE
    NEW.status := 'PARTIAL';
  END IF;
  
  -- Check if overdue
  IF NEW.status IN ('UNPAID', 'PARTIAL') AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'OVERDUE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_status
BEFORE INSERT OR UPDATE ON customer_transactions
FOR EACH ROW
EXECUTE FUNCTION update_transaction_status();

-- ========================================
-- 7. ROW LEVEL SECURITY
-- ========================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_company_isolation ON customers
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY customer_transactions_company_isolation ON customer_transactions
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY payment_apps_company_isolation ON customer_payment_applications
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY statements_company_isolation ON customer_statements
  FOR ALL USING (company_id = auth.uid());

-- ========================================
-- SCHEMA COMPLETE
-- ========================================

COMMENT ON TABLE customers IS 'Customer/client master data with AR integration';
COMMENT ON TABLE customer_transactions IS 'Customer AR ledger - invoices, payments, credits';
COMMENT ON TABLE customer_payment_applications IS 'Links payments to specific invoices';
COMMENT ON VIEW customer_aging IS 'Aging analysis showing overdue amounts by time bucket';
