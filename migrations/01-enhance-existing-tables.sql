-- ========================================
-- MIGRATION 1: ENHANCE EXISTING TABLES
-- Run this FIRST in your Supabase SQL Editor
-- ========================================

-- Add subscription columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add profile columns to users table  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records with default subscription info
UPDATE companies 
SET 
    subscription_plan = 'pro',
    max_users = 7,
    subscription_status = 'active',
    subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE subscription_plan IS NULL;

COMMENT ON TABLE companies IS 'Enhanced with subscription management';
COMMENT ON TABLE users IS 'Enhanced with profile and preference management';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check companies table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- Check users table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'Migration 1 completed successfully!' as status;