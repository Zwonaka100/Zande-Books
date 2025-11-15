-- ========================================
-- SAFE MIGRATION 3: BUSINESS LOGIC FUNCTIONS
-- Safe to run - adds helper functions
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
        COUNT(p.id),
        c.max_users
    INTO current_users, max_allowed
    FROM companies c
    LEFT JOIN profiles p ON p.company_id = c.id AND p.is_active = true
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
    UPDATE profiles
    SET 
        company_id = invitation_record.company_id,
        role = invitation_record.role,
        name = COALESCE(name, invitation_record.full_name),
        updated_at = NOW()
    WHERE id = new_user_id;
    
    -- Update invitation status
    UPDATE user_invitations
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user permissions based on role
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
    FROM profiles
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
            SELECT COUNT(*) FROM profiles 
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
        'total_customers', (
            SELECT COUNT(*) FROM customers WHERE company_id = company_uuid
        ),
        'total_suppliers', (
            SELECT COUNT(*) FROM suppliers WHERE company_id = company_uuid
        ),
        'total_products', (
            SELECT COUNT(*) FROM products WHERE company_id = company_uuid
        ),
        'pending_invoices', (
            SELECT COUNT(*) FROM sales_documents 
            WHERE company_id = company_uuid 
            AND document_type = 'Invoice' 
            AND status IN ('Draft', 'Sent')
        ),
        'overdue_invoices', (
            SELECT COUNT(*) FROM sales_documents 
            WHERE company_id = company_uuid 
            AND document_type = 'Invoice' 
            AND status = 'Overdue'
        ),
        'bank_accounts', (
            SELECT COUNT(*) FROM bank_accounts 
            WHERE company_id = company_uuid AND is_active = true
        ),
        'total_bank_balance', (
            SELECT COALESCE(SUM(current_balance), 0) 
            FROM bank_accounts 
            WHERE company_id = company_uuid AND is_active = true
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

-- Function to get next document number (integrates with your existing system)
CREATE OR REPLACE FUNCTION get_next_document_number(
    company_uuid UUID,
    document_type_param TEXT
)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Get company settings
    SELECT 
        CASE 
            WHEN document_type_param = 'Invoice' THEN invoice_prefix
            WHEN document_type_param = 'Quote' THEN quote_prefix
            ELSE 'DOC'
        END,
        CASE 
            WHEN document_type_param = 'Invoice' THEN next_invoice_number
            WHEN document_type_param = 'Quote' THEN next_quote_number
            ELSE 1
        END
    INTO prefix, next_number
    FROM company_settings
    WHERE company_id = company_uuid;
    
    -- If no settings found, use defaults
    IF NOT FOUND THEN
        prefix := CASE 
            WHEN document_type_param = 'Invoice' THEN 'INV'
            WHEN document_type_param = 'Quote' THEN 'QUO'
            ELSE 'DOC'
        END;
        next_number := 1;
    END IF;
    
    -- Format the number (e.g., INV-00001)
    formatted_number := prefix || '-' || LPAD(next_number::TEXT, 5, '0');
    
    -- Update the next number in settings
    UPDATE company_settings
    SET 
        next_invoice_number = CASE WHEN document_type_param = 'Invoice' THEN next_number + 1 ELSE next_invoice_number END,
        next_quote_number = CASE WHEN document_type_param = 'Quote' THEN next_number + 1 ELSE next_quote_number END,
        updated_at = NOW()
    WHERE company_id = company_uuid;
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users (only if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON profiles;
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Verify the migration
SELECT 
    'Migration 3 completed!' as status,
    'Business logic functions created successfully!' as message;

-- Test the functions
SELECT 
    'Testing functions...' as test,
    can_add_user_to_company((SELECT id FROM companies LIMIT 1)) as can_add_user,
    get_company_dashboard_stats((SELECT id FROM companies LIMIT 1)) as dashboard_stats;