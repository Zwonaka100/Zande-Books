-- ========================================
-- SAFE MIGRATION 1: ENHANCE EXISTING TABLES
-- This works with your current schema safely
-- ========================================

-- First, let's create a companies table to organize everything
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    vat_number TEXT,
    registration_number TEXT,
    
    -- Subscription fields
    subscription_plan VARCHAR(20) DEFAULT 'starter',
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires_at TIMESTAMP,
    max_users INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add company_id to profiles table (your existing user table)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add company_id to all your existing business tables
-- This allows multi-tenant data separation
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE sales_documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create a default company for existing data
INSERT INTO companies (name, subscription_plan, max_users, subscription_status)
VALUES ('Demo Company Pty Ltd', 'pro', 7, 'active')
ON CONFLICT DO NOTHING;

-- Link existing profile to the company (make them the owner)
UPDATE profiles 
SET 
    company_id = (SELECT id FROM companies LIMIT 1),
    role = 'owner',
    current_plan = 'pro'
WHERE company_id IS NULL;

-- Link existing business data to the company
UPDATE customers SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE suppliers SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE products SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE sales_documents SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE purchases SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE expenses SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE bank_accounts SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE journal_entries SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
UPDATE chart_of_accounts SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the migration
SELECT 
    'Migration 1 completed!' as status,
    (SELECT COUNT(*) FROM companies) as companies_created,
    (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL) as profiles_linked,
    (SELECT COUNT(*) FROM customers WHERE company_id IS NOT NULL) as customers_linked;

SELECT 'Safe migration completed - your existing data is preserved!' as message;