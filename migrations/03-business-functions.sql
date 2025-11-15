-- ========================================
-- MIGRATION 3: BUSINESS LOGIC FUNCTIONS
-- Run this THIRD in your Supabase SQL Editor
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept user invitation
CREATE OR REPLACE FUNCTION accept_user_invitation(
    invitation_uuid UUID,
    new_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record RECORD;
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
    
    -- Update user with company and role
    UPDATE users
    SET 
        company_id = invitation_record.company_id,
        role = invitation_record.role,
        updated_at = NOW()
    WHERE id = new_user_id;
    
    -- Update invitation status
    UPDATE user_invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company dashboard stats
CREATE OR REPLACE FUNCTION get_company_dashboard_stats(company_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (
            SELECT COUNT(*) FROM users 
            WHERE company_id = company_uuid AND is_active = true
        ),
        'pending_invitations', (
            SELECT COUNT(*) FROM user_invitations 
            WHERE company_id = company_uuid AND status = 'pending'
        ),
        'subscription_plan', (
            SELECT subscription_plan FROM companies WHERE id = company_uuid
        ),
        'max_users', (
            SELECT max_users FROM companies WHERE id = company_uuid
        ),
        'subscription_expires', (
            SELECT subscription_expires_at FROM companies WHERE id = company_uuid
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_invitations
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status = 'pending';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;

-- Create trigger for new users
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Add function comments
COMMENT ON FUNCTION can_add_user_to_company(UUID) IS 'Checks if company is under user limit';
COMMENT ON FUNCTION update_subscription_plan(UUID, VARCHAR) IS 'Updates company subscription plan and user limits';
COMMENT ON FUNCTION create_user_invitation(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, TEXT) IS 'Creates a new user invitation';
COMMENT ON FUNCTION accept_user_invitation(UUID, UUID) IS 'Accepts a pending user invitation';
COMMENT ON FUNCTION user_has_permission(UUID, VARCHAR) IS 'Checks if user has specific permission based on role';
COMMENT ON FUNCTION get_company_dashboard_stats(UUID) IS 'Returns company dashboard statistics';
COMMENT ON FUNCTION cleanup_expired_invitations() IS 'Marks expired invitations as expired';

SELECT 'Migration 3 (Functions) completed successfully!' as status;