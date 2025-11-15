-- ========================================
-- ZANDE BOOKS - INDUSTRY FEATURES CONFIGURATION
-- Dynamic feature visibility per industry
-- ========================================

-- ========================================
-- 1. ADD INDUSTRY TYPE TO PROFILES
-- ========================================

-- Add industry_type column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'industry_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN industry_type VARCHAR(50) DEFAULT 'GENERAL';
    ALTER TABLE profiles ADD COLUMN business_name VARCHAR(255);
    ALTER TABLE profiles ADD COLUMN vat_registered BOOLEAN DEFAULT FALSE;
    ALTER TABLE profiles ADD COLUMN vat_number VARCHAR(50);
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON profiles(industry_type);

-- ========================================
-- 2. INDUSTRY FEATURES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS industry_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type VARCHAR(50) NOT NULL,
  feature_code VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100),
  menu_icon VARCHAR(10),
  sort_order INTEGER DEFAULT 999,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(industry_type, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_industry_features_type ON industry_features(industry_type);
CREATE INDEX IF NOT EXISTS idx_industry_features_enabled ON industry_features(is_enabled);

-- ========================================
-- CLEAR EXISTING DATA (IF RE-RUNNING)
-- ========================================
DELETE FROM industry_features;

-- ========================================
-- 3. CORE FEATURES (ALL INDUSTRIES)
-- ========================================

-- These features are enabled for ALL industries
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
-- GENERAL (default for all)
('ALL', 'dashboard', TRUE, TRUE, 'Dashboard', '📊', 1),
('ALL', 'banking', TRUE, TRUE, 'Banking', '🏦', 50),
('ALL', 'expenses', TRUE, TRUE, 'Expenses', '💳', 60),
('ALL', 'journals', TRUE, FALSE, 'Journals', '📖', 70),
('ALL', 'reports', TRUE, TRUE, 'Reports', '📈', 80),
('ALL', 'chart-of-accounts', TRUE, FALSE, 'Chart of Accounts', '📋', 90);

-- ========================================
-- 4. SERVICES INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('SERVICES', 'customers', TRUE, TRUE, 'Clients', '👥', 10),
('SERVICES', 'suppliers', TRUE, FALSE, 'Vendors', '🏢', 20),
('SERVICES', 'products', FALSE, FALSE, 'Services', '💼', 30),
('SERVICES', 'inventory', FALSE, FALSE, NULL, NULL, 0),
('SERVICES', 'sales', TRUE, TRUE, 'Invoicing', '💵', 40),
('SERVICES', 'purchases', FALSE, FALSE, NULL, NULL, 0),
('SERVICES', 'projects', TRUE, FALSE, 'Projects', '💼', 35),
('SERVICES', 'timesheets', TRUE, FALSE, 'Time Tracking', '⏱️', 36);

-- ========================================
-- 5. RETAIL INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('RETAIL', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('RETAIL', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('RETAIL', 'products', TRUE, TRUE, 'Products', '📦', 30),
('RETAIL', 'inventory', TRUE, TRUE, 'Inventory', '📊', 31),
('RETAIL', 'sales', TRUE, TRUE, 'Sales', '💵', 40),
('RETAIL', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('RETAIL', 'pos', TRUE, FALSE, 'Point of Sale', '🛍️', 42);

-- ========================================
-- 6. RESTAURANT INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('RESTAURANT', 'customers', FALSE, FALSE, NULL, NULL, 0),
('RESTAURANT', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('RESTAURANT', 'products', TRUE, TRUE, 'Menu Items', '🍔', 30),
('RESTAURANT', 'inventory', TRUE, TRUE, 'Inventory', '📦', 31),
('RESTAURANT', 'sales', TRUE, TRUE, 'Orders', '💵', 40),
('RESTAURANT', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('RESTAURANT', 'tables', TRUE, TRUE, 'Tables/Orders', '🍽️', 15),
('RESTAURANT', 'recipes', TRUE, FALSE, 'Recipes', '👨‍🍳', 32);

-- ========================================
-- 7. MANUFACTURING INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('MANUFACTURING', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('MANUFACTURING', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('MANUFACTURING', 'products', TRUE, TRUE, 'Finished Goods', '📦', 30),
('MANUFACTURING', 'inventory', TRUE, TRUE, 'Inventory', '📊', 31),
('MANUFACTURING', 'sales', TRUE, TRUE, 'Sales Orders', '💵', 40),
('MANUFACTURING', 'purchases', TRUE, TRUE, 'Raw Materials', '🛒', 41),
('MANUFACTURING', 'production', TRUE, TRUE, 'Production', '🏭', 32),
('MANUFACTURING', 'job-costing', TRUE, FALSE, 'Job Costing', '💰', 33);

-- ========================================
-- 8. CONSTRUCTION INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('CONSTRUCTION', 'customers', TRUE, TRUE, 'Clients', '👥', 10),
('CONSTRUCTION', 'suppliers', TRUE, TRUE, 'Subcontractors', '🏢', 20),
('CONSTRUCTION', 'products', FALSE, FALSE, NULL, NULL, 0),
('CONSTRUCTION', 'inventory', TRUE, FALSE, 'Materials', '📦', 31),
('CONSTRUCTION', 'sales', TRUE, TRUE, 'Contracts', '📄', 40),
('CONSTRUCTION', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('CONSTRUCTION', 'projects', TRUE, TRUE, 'Projects', '🏗️', 15),
('CONSTRUCTION', 'job-costing', TRUE, TRUE, 'Job Costing', '💰', 33),
('CONSTRUCTION', 'timesheets', TRUE, FALSE, 'Timesheets', '⏱️', 36);

-- ========================================
-- 9. HEALTHCARE INDUSTRY FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('HEALTHCARE', 'customers', TRUE, TRUE, 'Patients', '🏥', 10),
('HEALTHCARE', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('HEALTHCARE', 'products', TRUE, FALSE, 'Medical Supplies', '💊', 30),
('HEALTHCARE', 'inventory', TRUE, FALSE, 'Inventory', '📦', 31),
('HEALTHCARE', 'sales', TRUE, TRUE, 'Billing', '💵', 40),
('HEALTHCARE', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('HEALTHCARE', 'appointments', TRUE, FALSE, 'Appointments', '📅', 15);

-- ========================================
-- 10. LEGAL SERVICES FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('LEGAL', 'customers', TRUE, TRUE, 'Clients', '⚖️', 10),
('LEGAL', 'suppliers', FALSE, FALSE, 'Vendors', '🏢', 20),
('LEGAL', 'products', FALSE, FALSE, NULL, NULL, 0),
('LEGAL', 'inventory', FALSE, FALSE, NULL, NULL, 0),
('LEGAL', 'sales', TRUE, TRUE, 'Billing', '💵', 40),
('LEGAL', 'purchases', FALSE, FALSE, NULL, NULL, 0),
('LEGAL', 'projects', TRUE, TRUE, 'Cases', '📁', 15),
('LEGAL', 'timesheets', TRUE, TRUE, 'Time Tracking', '⏱️', 36),
('LEGAL', 'trust-accounts', TRUE, TRUE, 'Trust Accounts', '🔒', 50);

-- ========================================
-- 11. REAL ESTATE FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('REALESTATE', 'customers', TRUE, TRUE, 'Tenants', '🏠', 10),
('REALESTATE', 'suppliers', TRUE, FALSE, 'Contractors', '🏢', 20),
('REALESTATE', 'products', TRUE, TRUE, 'Properties', '🏘️', 30),
('REALESTATE', 'inventory', FALSE, FALSE, NULL, NULL, 0),
('REALESTATE', 'sales', TRUE, TRUE, 'Rental Income', '💵', 40),
('REALESTATE', 'purchases', TRUE, FALSE, 'Purchases', '🛒', 41),
('REALESTATE', 'leases', TRUE, TRUE, 'Leases', '📋', 15),
('REALESTATE', 'maintenance', TRUE, FALSE, 'Maintenance', '🔧', 42);

-- ========================================
-- 12. TRANSPORTATION/LOGISTICS FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('TRANSPORT', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('TRANSPORT', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('TRANSPORT', 'products', FALSE, FALSE, NULL, NULL, 0),
('TRANSPORT', 'inventory', FALSE, FALSE, NULL, NULL, 0),
('TRANSPORT', 'sales', TRUE, TRUE, 'Deliveries', '💵', 40),
('TRANSPORT', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('TRANSPORT', 'fleet', TRUE, TRUE, 'Fleet Management', '🚚', 15),
('TRANSPORT', 'trips', TRUE, TRUE, 'Trips', '🗺️', 16);

-- ========================================
-- 13. WHOLESALE/DISTRIBUTION FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('WHOLESALE', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('WHOLESALE', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('WHOLESALE', 'products', TRUE, TRUE, 'Products', '📦', 30),
('WHOLESALE', 'inventory', TRUE, TRUE, 'Inventory', '📊', 31),
('WHOLESALE', 'sales', TRUE, TRUE, 'Sales', '💵', 40),
('WHOLESALE', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('WHOLESALE', 'warehouses', TRUE, FALSE, 'Warehouses', '🏭', 32);

-- ========================================
-- 14. E-COMMERCE FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('ECOMMERCE', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('ECOMMERCE', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('ECOMMERCE', 'products', TRUE, TRUE, 'Products', '📦', 30),
('ECOMMERCE', 'inventory', TRUE, TRUE, 'Inventory', '📊', 31),
('ECOMMERCE', 'sales', TRUE, TRUE, 'Orders', '💵', 40),
('ECOMMERCE', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('ECOMMERCE', 'online-store', TRUE, TRUE, 'Online Store', '🛍️', 15),
('ECOMMERCE', 'shipping', TRUE, FALSE, 'Shipping', '📦', 42);

-- ========================================
-- 15. NONPROFIT/NGO FEATURES
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('NONPROFIT', 'customers', TRUE, TRUE, 'Donors', '🤝', 10),
('NONPROFIT', 'suppliers', TRUE, TRUE, 'Vendors', '🏢', 20),
('NONPROFIT', 'products', FALSE, FALSE, NULL, NULL, 0),
('NONPROFIT', 'inventory', FALSE, FALSE, NULL, NULL, 0),
('NONPROFIT', 'sales', TRUE, TRUE, 'Donations', '💵', 40),
('NONPROFIT', 'purchases', TRUE, TRUE, 'Expenses', '🛒', 41),
('NONPROFIT', 'grants', TRUE, TRUE, 'Grants', '💰', 15),
('NONPROFIT', 'programs', TRUE, FALSE, 'Programs', '📋', 16),
('NONPROFIT', 'fundraising', TRUE, FALSE, 'Fundraising', '🎯', 17);

-- ========================================
-- 16. GENERAL (FALLBACK)
-- ========================================
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('GENERAL', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('GENERAL', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('GENERAL', 'products', TRUE, FALSE, 'Products/Services', '📦', 30),
('GENERAL', 'inventory', TRUE, FALSE, 'Inventory', '📊', 31),
('GENERAL', 'sales', TRUE, TRUE, 'Sales', '💵', 40),
('GENERAL', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41);

-- ========================================
-- 17. ENABLE RLS
-- ========================================

ALTER TABLE industry_features ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS industry_features_read_policy ON industry_features;

-- Allow all authenticated users to read industry features
CREATE POLICY industry_features_read_policy ON industry_features
  FOR SELECT USING (true);

-- ========================================
-- SCHEMA COMPLETE
-- ========================================

COMMENT ON TABLE industry_features IS 'Controls which features are visible/enabled for each industry type';
COMMENT ON COLUMN industry_features.feature_code IS 'Unique identifier for feature (e.g., customers, products, timesheets)';
COMMENT ON COLUMN industry_features.display_name IS 'Label shown in UI (e.g., Clients instead of Customers)';
COMMENT ON COLUMN industry_features.menu_icon IS 'Emoji icon for sidebar menu';
