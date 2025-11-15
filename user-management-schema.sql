-- ========================================
-- USER PROFILE & MANAGEMENT SYSTEM
-- Enhanced Supabase Schema for ZandeBooks
-- ========================================

-- Update the existing companies table to include subscription info
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'starter';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1;

-- Update the existing users table to include profile info
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
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

-- ========================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- ========================================

-- Function to check if user can be added to company
CREATE OR REPLACE FUNCTION can_add_user_to_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_users INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get current user count and max allowed
    SELECT 
        COUNT(u.id),
        c.max_users
    INTO current_users, max_allowed
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id AND u.is_active = true
    WHERE c.id = company_uuid
    GROUP BY c.max_users;
    
    -- Return true if under limit
    RETURN COALESCE(current_users, 0) < COALESCE(max_allowed, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription plan
CREATE OR REPLACE FUNCTION update_subscription_plan(
    company_uuid UUID,
    new_plan VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    max_users_for_plan INTEGER;
BEGIN
    -- Determine max users for plan
    CASE new_plan
        WHEN 'starter' THEN max_users_for_plan := 1;
        WHEN 'business' THEN max_users_for_plan := 3;
        WHEN 'pro' THEN max_users_for_plan := 7;
        ELSE max_users_for_plan := 1;
    END CASE;
    
    -- Update company subscription
    UPDATE companies 
    SET 
        subscription_plan = new_plan,
        max_users = max_users_for_plan,
        updated_at = NOW()
    WHERE id = company_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USER INVITATION FUNCTIONS
-- ========================================

-- Function to create user invitation
CREATE OR REPLACE FUNCTION create_user_invitation(
    company_uuid UUID,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    invited_by_uuid UUID,
    invitation_msg TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    invitation_id UUID;
BEGIN
    -- Check if company can add more users
    IF NOT can_add_user_to_company(company_uuid) THEN
        RAISE EXCEPTION 'Company has reached maximum user limit';
    END IF;
    
    -- Create invitation
    INSERT INTO user_invitations (
        company_id,
        email,
        full_name,
        role,
        invitation_message,
        invited_by
    ) VALUES (
        company_uuid,
        user_email,
        user_name,
        user_role,
        invitation_msg,
        invited_by_uuid
    ) RETURNING id INTO invitation_id;
    
    RETURN invitation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept user invitation
CREATE OR REPLACE FUNCTION accept_user_invitation(
    invitation_uuid UUID,
    user_password VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    invitation_record RECORD;
    new_user_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM user_invitations
    WHERE id = invitation_uuid
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Check if company can still add users
    IF NOT can_add_user_to_company(invitation_record.company_id) THEN
        RAISE EXCEPTION 'Company has reached maximum user limit';
    END IF;
    
    -- Create user account (this would integrate with Supabase Auth)
    -- For now, just create the record
    INSERT INTO users (
        company_id,
        email,
        full_name,
        role
    ) VALUES (
        invitation_record.company_id,
        invitation_record.email,
        invitation_record.full_name,
        invitation_record.role
    ) RETURNING id INTO new_user_id;
    
    -- Update invitation status
    UPDATE user_invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_uuid;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ROLE-BASED ACCESS CONTROL
-- ========================================

-- Function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(
    user_uuid UUID,
    permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
BEGIN
    -- Get user role
    SELECT role INTO user_role
    FROM users
    WHERE id = user_uuid AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check permissions based on role
    CASE user_role
        WHEN 'owner' THEN
            RETURN true; -- Owner has all permissions
        WHEN 'admin' THEN
            RETURN permission_name NOT IN ('delete_company', 'change_subscription');
        WHEN 'user' THEN
            RETURN permission_name IN (
                'view_dashboard', 'manage_customers', 'manage_suppliers',
                'create_invoices', 'manage_products', 'view_reports'
            );
        WHEN 'accountant' THEN
            RETURN permission_name IN (
                'view_dashboard', 'view_all_financial_data', 'create_journal_entries',
                'generate_reports', 'reconcile_accounts', 'view_audit_trail'
            );
        WHEN 'auditor' THEN
            RETURN permission_name LIKE 'view_%' OR permission_name LIKE 'read_%';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS FOR AUTOMATION
-- ========================================

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Trigger to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_invitations
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'pending';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job (would need to be set up in Supabase dashboard)
-- SELECT cron.schedule('expire-invitations', '0 */6 * * *', 'SELECT expire_old_invitations();');

-- ========================================
-- RLS POLICIES FOR SECURITY
-- ========================================

-- Enable RLS on new tables
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for user_invitations
CREATE POLICY "Users can manage invitations for their company" ON user_invitations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS Policy for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- RLS Policy for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- RLS Policy for company_settings
CREATE POLICY "Users can view their company settings" ON company_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can update company settings" ON company_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Update existing company with subscription info
UPDATE companies 
SET 
    subscription_plan = 'pro',
    max_users = 7,
    subscription_status = 'active',
    subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE id = (SELECT id FROM companies LIMIT 1);

-- Create sample company settings
INSERT INTO company_settings (company_id, logo_url, primary_color) 
VALUES (
    (SELECT id FROM companies LIMIT 1),
    'https://example.com/logo.png',
    '#0ea5e9'
) ON CONFLICT (company_id) DO NOTHING;

-- This schema provides:
-- ✅ Complete user profile management
-- ✅ Subscription tier enforcement
-- ✅ User invitation system
-- ✅ Role-based access control
-- ✅ Session management
-- ✅ Notification preferences
-- ✅ Company branding settings
-- ✅ Security policies
-- ✅ Automated processes