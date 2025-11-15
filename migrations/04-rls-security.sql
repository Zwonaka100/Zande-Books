-- ========================================
-- MIGRATION 4: ROW LEVEL SECURITY (RLS)
-- Run this FOURTH in your Supabase SQL Editor
-- ========================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- COMPANIES TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Owners and admins can update their company" ON companies;

-- Users can view their own company
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Owners and admins can update their company
CREATE POLICY "Owners and admins can update their company" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ========================================
-- PROFILES TABLE POLICIES (your user table)
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view users in their company" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON profiles;

-- Users can view users in their company
CREATE POLICY "Users can view users in their company" ON profiles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Admins can manage users in their company
CREATE POLICY "Admins can manage users in their company" ON profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ========================================
-- USER INVITATIONS TABLE POLICIES
-- ========================================

-- Users can manage invitations for their company
CREATE POLICY "Users can manage invitations for their company" ON user_invitations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- ========================================
-- USER SESSIONS TABLE POLICIES
-- ========================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- ========================================
-- NOTIFICATION PREFERENCES TABLE POLICIES
-- ========================================

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- ========================================
-- COMPANY SETTINGS TABLE POLICIES
-- ========================================

-- Users can view their company settings
CREATE POLICY "Users can view their company settings" ON company_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Owners and admins can update company settings
CREATE POLICY "Owners and admins can update company settings" ON company_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Owners and admins can insert company settings
CREATE POLICY "Owners and admins can insert company settings" ON company_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ========================================
-- ADDITIONAL ACCOUNTING TABLES (if they exist)
-- Add RLS policies for your existing accounting tables
-- ========================================

-- Example for customers table (adjust table names as needed)
DO $$
BEGIN
    -- Check if customers table exists and add RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Users can manage customers in their company" ON customers;
        
        -- Create policy for customers
        CREATE POLICY "Users can manage customers in their company" ON customers
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- Example for suppliers table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage suppliers in their company" ON suppliers;
        
        CREATE POLICY "Users can manage suppliers in their company" ON suppliers
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- Example for products table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage products in their company" ON products;
        
        CREATE POLICY "Users can manage products in their company" ON products
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for sales_documents table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales_documents') THEN
        ALTER TABLE sales_documents ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage sales documents in their company" ON sales_documents;
        
        CREATE POLICY "Users can manage sales documents in their company" ON sales_documents
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for purchases table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchases') THEN
        ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage purchases in their company" ON purchases;
        
        CREATE POLICY "Users can manage purchases in their company" ON purchases
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for expenses table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage expenses in their company" ON expenses;
        
        CREATE POLICY "Users can manage expenses in their company" ON expenses
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for bank_accounts table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_accounts') THEN
        ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage bank accounts in their company" ON bank_accounts;
        
        CREATE POLICY "Users can manage bank accounts in their company" ON bank_accounts
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for journal_entries table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage journal entries in their company" ON journal_entries;
        
        CREATE POLICY "Users can manage journal entries in their company" ON journal_entries
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- RLS for chart_of_accounts table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
        ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage chart of accounts in their company" ON chart_of_accounts;
        
        CREATE POLICY "Users can manage chart of accounts in their company" ON chart_of_accounts
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM profiles WHERE id = auth.uid()
                )
            );
    END IF;
END
$$;

-- ========================================
-- SECURITY FUNCTIONS
-- ========================================

-- Function to check if current user is company owner/admin
CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's company_id
CREATE OR REPLACE FUNCTION current_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'profiles', 'user_invitations', 'user_sessions', 'notification_preferences', 'company_settings')
ORDER BY tablename;

-- Check policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Migration 4 (RLS Policies) completed successfully!' as status;