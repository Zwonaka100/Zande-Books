-- ========================================
-- MIGRATION 2: CREATE NEW TABLES
-- Run this SECOND in your Supabase SQL Editor
-- ========================================

-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invitation_message TEXT,
    
    -- Invitation Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled
    invited_by UUID REFERENCES users(id),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Security
    invitation_token UUID DEFAULT gen_random_uuid(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(company_id, email)
);

-- Create user sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
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

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
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
    summary_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
    reminder_frequency INTEGER DEFAULT 3, -- days before reminder
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create company settings table
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
    
    -- Invoice Settings
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    invoice_number_format VARCHAR(50) DEFAULT '{prefix}-{number}',
    next_invoice_number INTEGER DEFAULT 1,
    
    -- Quote Settings
    quote_prefix VARCHAR(10) DEFAULT 'QUO',
    quote_number_format VARCHAR(50) DEFAULT '{prefix}-{number}',
    next_quote_number INTEGER DEFAULT 1,
    
    -- Email Settings
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    smtp_from_email VARCHAR(255),
    smtp_from_name VARCHAR(255),
    
    -- Security Settings
    require_2fa BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 30, -- minutes
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

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Add table comments
COMMENT ON TABLE user_invitations IS 'Manages user invitations for multi-user companies';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions across devices';
COMMENT ON TABLE notification_preferences IS 'User-specific notification settings';
COMMENT ON TABLE company_settings IS 'Company-wide configuration and branding';

SELECT 'Migration 2 completed successfully!' as status;