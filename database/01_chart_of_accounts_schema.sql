-- ========================================
-- ZANDE BOOKS - CHART OF ACCOUNTS & DOUBLE-ENTRY ENGINE
-- Phase 1: Foundation Schema
-- ========================================

-- ========================================
-- 1. ACCOUNT TYPES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS account_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('BALANCE_SHEET', 'INCOME_STATEMENT')),
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Standard Account Types
INSERT INTO account_types (code, name, normal_balance, category, sort_order) VALUES
  ('ASSET', 'Assets', 'DEBIT', 'BALANCE_SHEET', 1),
  ('LIABILITY', 'Liabilities', 'CREDIT', 'BALANCE_SHEET', 2),
  ('EQUITY', 'Equity', 'CREDIT', 'BALANCE_SHEET', 3),
  ('REVENUE', 'Revenue', 'CREDIT', 'INCOME_STATEMENT', 4),
  ('EXPENSE', 'Expenses', 'DEBIT', 'INCOME_STATEMENT', 5);

-- ========================================
-- 2. CHART OF ACCOUNTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(10) NOT NULL REFERENCES account_types(code),
  parent_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_system_account BOOLEAN DEFAULT FALSE, -- Cannot be deleted/modified
  is_header BOOLEAN DEFAULT FALSE, -- Parent account (no posting allowed)
  vat_applicable BOOLEAN DEFAULT FALSE,
  allow_manual_posting BOOLEAN DEFAULT TRUE,
  opening_balance DECIMAL(15,2) DEFAULT 0.00,
  opening_balance_type VARCHAR(10) CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  UNIQUE(company_id, account_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coa_company ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);

-- ========================================
-- 3. DEFAULT COA TEMPLATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS coa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type VARCHAR(50) NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(10) NOT NULL REFERENCES account_types(code),
  parent_account_code VARCHAR(20),
  description TEXT,
  is_header BOOLEAN DEFAULT FALSE,
  vat_applicable BOOLEAN DEFAULT FALSE,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_industry ON coa_templates(industry_type);

-- ========================================
-- 4. SYSTEM DEFAULT ACCOUNTS MAPPING
-- ========================================
CREATE TABLE IF NOT EXISTS system_default_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_purpose VARCHAR(100) NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, account_purpose)
);

-- System purposes: 
-- 'RETAINED_EARNINGS', 'VAT_CONTROL', 'VAT_OUTPUT', 'VAT_INPUT', 
-- 'BANK_CHARGES', 'DISCOUNT_ALLOWED', 'DISCOUNT_RECEIVED',
-- 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'SUSPENSE'

CREATE INDEX IF NOT EXISTS idx_default_company ON system_default_accounts(company_id);

-- ========================================
-- 5. ACCOUNTING PERIODS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_name VARCHAR(50) NOT NULL, -- e.g., "January 2025", "Q1 2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  financial_year INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, period_name),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_period_company ON accounting_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_period_dates ON accounting_periods(start_date, end_date);

-- ========================================
-- 6. JOURNAL ENTRIES TABLE (HEADER)
-- ========================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  period_id UUID REFERENCES accounting_periods(id),
  entry_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  -- Entry types: MANUAL, OPENING_BALANCE, SALES, PURCHASE, PAYMENT, RECEIPT, 
  --              EXPENSE, DEPRECIATION, ACCRUAL, REVERSAL, CLOSING
  source_type VARCHAR(50), -- INVOICE, BILL, PAYMENT, EXPENSE, etc.
  source_id UUID, -- Reference to source document
  reference VARCHAR(100), -- External reference (invoice #, cheque #)
  narration TEXT NOT NULL,
  total_debits DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_credits DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debits = total_credits) STORED,
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
  is_reversing BOOLEAN DEFAULT FALSE, -- Auto-reverse next period
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversed_by_entry_id UUID REFERENCES journal_entries(id),
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  posted_by UUID REFERENCES profiles(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(company_id, entry_number),
  CHECK (total_debits >= 0 AND total_credits >= 0)
);

CREATE INDEX IF NOT EXISTS idx_journal_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status);

-- ========================================
-- 7. JOURNAL ENTRY LINES TABLE (DEBIT/CREDIT)
-- ========================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0.00,
  credit_amount DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journal_entry_id, line_number),
  CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  ),
  CHECK (debit_amount >= 0 AND credit_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);

-- ========================================
-- 8. AUDIT LOG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, LOCK, UNLOCK
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ========================================
-- 9. ACCOUNT BALANCES MATERIALIZED VIEW
-- ========================================
-- This speeds up balance queries significantly
CREATE MATERIALIZED VIEW IF NOT EXISTS account_balances AS
SELECT 
  j.company_id,
  jl.account_id,
  c.account_code,
  c.account_name,
  c.account_type,
  at.normal_balance,
  c.opening_balance,
  c.opening_balance_type,
  SUM(jl.debit_amount) as total_debits,
  SUM(jl.credit_amount) as total_credits,
  CASE 
    WHEN at.normal_balance = 'DEBIT' THEN 
      c.opening_balance + SUM(jl.debit_amount) - SUM(jl.credit_amount)
    ELSE 
      c.opening_balance + SUM(jl.credit_amount) - SUM(jl.debit_amount)
  END as current_balance
FROM journal_entry_lines jl
JOIN journal_entries j ON jl.journal_entry_id = j.id
JOIN chart_of_accounts c ON jl.account_id = c.id
JOIN account_types at ON c.account_type = at.code
WHERE j.status = 'POSTED'
GROUP BY j.company_id, jl.account_id, c.account_code, c.account_name, 
         c.account_type, at.normal_balance, c.opening_balance, c.opening_balance_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_balance_company_account ON account_balances(company_id, account_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_account_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 10. TRIGGERS
-- ========================================

-- Auto-update journal entry totals
CREATE OR REPLACE FUNCTION update_journal_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries
  SET 
    total_debits = (
      SELECT COALESCE(SUM(debit_amount), 0)
      FROM journal_entry_lines
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    total_credits = (
      SELECT COALESCE(SUM(credit_amount), 0)
      FROM journal_entry_lines
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_journal_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION update_journal_totals();

-- Prevent posting to locked periods
CREATE OR REPLACE FUNCTION check_period_lock()
RETURNS TRIGGER AS $$
DECLARE
  period_locked BOOLEAN;
BEGIN
  SELECT is_locked INTO period_locked
  FROM accounting_periods
  WHERE company_id = NEW.company_id
    AND NEW.entry_date BETWEEN start_date AND end_date
  LIMIT 1;
  
  IF period_locked = TRUE THEN
    RAISE EXCEPTION 'Cannot post to locked accounting period';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_period_lock
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION check_period_lock();

-- Auto-log changes to COA
CREATE OR REPLACE FUNCTION log_coa_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      NEW.company_id,
      NEW.updated_by,
      'UPDATE',
      'chart_of_accounts',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, new_values)
    VALUES (
      NEW.company_id,
      NEW.created_by,
      'CREATE',
      'chart_of_accounts',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (company_id, user_id, action, table_name, record_id, old_values)
    VALUES (
      OLD.company_id,
      OLD.updated_by,
      'DELETE',
      'chart_of_accounts',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_coa_changes
AFTER INSERT OR UPDATE OR DELETE ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION log_coa_changes();

-- ========================================
-- 11. ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_default_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own company data
CREATE POLICY coa_company_isolation ON chart_of_accounts
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY journal_company_isolation ON journal_entries
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY journal_lines_company_isolation ON journal_entry_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journal_entries 
      WHERE id = journal_entry_id AND company_id = auth.uid()
    )
  );

CREATE POLICY periods_company_isolation ON accounting_periods
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY defaults_company_isolation ON system_default_accounts
  FOR ALL USING (company_id = auth.uid());

CREATE POLICY audit_company_isolation ON audit_log
  FOR SELECT USING (company_id = auth.uid());

-- ========================================
-- SCHEMA COMPLETE
-- ========================================
