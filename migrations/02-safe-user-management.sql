-- ========================================
-- SAFE MIGRATION 2: ADD USER MANAGEMENT TABLES
-- Safe to run - won't affect existing data
-- ========================================

-- User invitations table for multi-user management
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invitation_message TEXT,
    
    -- Invitation Status
    status VARCHAR(20) DEFAULT 'pending',
    invited_by UUID REFERENCES profiles(id),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Security
    invitation_token UUID DEFAULT gen_random_uuid(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(company_id, email)
);

-- User sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Session Details
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    location VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Email Notifications
    email_invoice_payments BOOLEAN DEFAULT true,
    email_overdue_reminders BOOLEAN DEFAULT true,
    email_weekly_summary BOOLEAN DEFAULT false,
    email_low_stock_alerts BOOLEAN DEFAULT false,
    
    -- Push Notifications
    push_payment_notifications BOOLEAN DEFAULT true,
    push_daily_summary BOOLEAN DEFAULT false,
    push_system_alerts BOOLEAN DEFAULT true,
    
    -- Frequency Settings
    summary_frequency VARCHAR(20) DEFAULT 'weekly',
    reminder_frequency INTEGER DEFAULT 3,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Company settings table (extends your existing settings)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#0ea5e9',
    secondary_color VARCHAR(7) DEFAULT '#64748b',
    
    -- Business Settings
    business_type VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    
    -- Financial Settings
    financial_year_start DATE DEFAULT '2024-03-01',
    default_payment_terms INTEGER DEFAULT 30,
    default_vat_rate DECIMAL(5,4) DEFAULT 0.15,
    
    -- Invoice Settings (integrates with your sales_documents)
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    invoice_number_format VARCHAR(50) DEFAULT '{prefix}-{number}',
    next_invoice_number INTEGER DEFAULT 1,
    
    -- Quote Settings
    quote_prefix VARCHAR(10) DEFAULT 'QUO',
    quote_number_format VARCHAR(50) DEFAULT '{prefix}-{number}',
    next_quote_number INTEGER DEFAULT 1,
    
    -- Security Settings
    require_2fa BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 30,
    password_policy JSONB DEFAULT '{"minLength": 8, "requireSpecialChar": true}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(company_id)
);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Create default company settings for existing company
INSERT INTO company_settings (company_id, business_type, industry, company_size)
SELECT id, 'Private Company', 'Technology', 'Small (1-50 employees)'
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM company_settings WHERE company_id = companies.id);

-- Update next invoice/quote numbers based on existing data
UPDATE company_settings 
SET 
    next_invoice_number = COALESCE((
        SELECT MAX(CAST(SUBSTRING(document_number FROM '\d+') AS INTEGER)) + 1
        FROM sales_documents 
        WHERE document_type = 'Invoice'
        AND company_id = company_settings.company_id
    ), 1),
    next_quote_number = COALESCE((
        SELECT MAX(CAST(SUBSTRING(document_number FROM '\d+') AS INTEGER)) + 1
        FROM sales_documents 
        WHERE document_type = 'Quote'
        AND company_id = company_settings.company_id
    ), 1);

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE user_id = profiles.id);

-- Verify the migration
SELECT 
    'Migration 2 completed!' as status,
    (SELECT COUNT(*) FROM user_invitations) as invitations_table_ready,
    (SELECT COUNT(*) FROM user_sessions) as sessions_table_ready,
    (SELECT COUNT(*) FROM notification_preferences) as notification_prefs_created,
    (SELECT COUNT(*) FROM company_settings) as company_settings_created;

SELECT 'User management tables created successfully!' as message;