-- ========================================
-- MIGRATION 5: SAMPLE DATA & TESTING
-- Run this LAST in your Supabase SQL Editor
-- ========================================

-- Insert sample company settings for your existing company
INSERT INTO company_settings (
    company_id, 
    logo_url, 
    primary_color, 
    secondary_color,
    business_type,
    industry,
    company_size,
    financial_year_start,
    default_payment_terms,
    default_vat_rate,
    invoice_prefix,
    quote_prefix
) 
SELECT 
    id as company_id,
    'https://example.com/logo.png' as logo_url,
    '#0ea5e9' as primary_color,
    '#64748b' as secondary_color,
    'Private Company' as business_type,
    'Technology' as industry,
    'Small (1-50 employees)' as company_size,
    '2024-03-01' as financial_year_start,
    30 as default_payment_terms,
    0.15 as default_vat_rate,
    'INV' as invoice_prefix,
    'QUO' as quote_prefix
FROM companies 
WHERE NOT EXISTS (
    SELECT 1 FROM company_settings WHERE company_id = companies.id
);

-- Create sample notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id 
FROM profiles 
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = profiles.id
);

-- Update existing users with sample profile data (adjust as needed)
UPDATE profiles 
SET 
    timezone = COALESCE(timezone, 'Africa/Johannesburg'),
    language = COALESCE(language, 'en'),
    role = COALESCE(role, 'owner'),
    is_active = COALESCE(is_active, true),
    job_title = CASE 
        WHEN role = 'owner' THEN 'CEO'
        WHEN role = 'admin' THEN 'Manager'
        ELSE 'Staff Member'
    END
WHERE timezone IS NULL OR language IS NULL OR role IS NULL OR is_active IS NULL;

-- Sample user invitation (you can delete this after testing)
INSERT INTO user_invitations (
    company_id,
    email,
    full_name,
    role,
    invitation_message,
    invited_by
)
SELECT 
    c.id as company_id,
    'demo.user@example.com' as email,
    'Demo User' as full_name,
    'user' as role,
    'Welcome to our ZandeBooks team!' as invitation_message,
    p.id as invited_by
FROM companies c
CROSS JOIN profiles p
WHERE p.role = 'owner'
LIMIT 1
ON CONFLICT (company_id, email) DO NOTHING;

-- ========================================
-- HELPFUL QUERIES FOR TESTING
-- ========================================

-- View company subscription status
CREATE OR REPLACE VIEW company_subscription_status AS
SELECT 
    c.id,
    c.name as company_name,
    c.subscription_plan,
    c.subscription_status,
    c.subscription_expires_at,
    c.max_users,
    COUNT(p.id) as current_users,
    (c.max_users - COUNT(p.id)) as available_slots
FROM companies c
LEFT JOIN profiles p ON p.company_id = c.id AND p.is_active = true
GROUP BY c.id, c.name, c.subscription_plan, c.subscription_status, c.subscription_expires_at, c.max_users;

-- View user invitations status
CREATE OR REPLACE VIEW user_invitations_summary AS
SELECT 
    ui.id,
    c.name as company_name,
    ui.email,
    ui.full_name,
    ui.role,
    ui.status,
    ui.expires_at,
    p.name as invited_by_name,
    ui.created_at
FROM user_invitations ui
JOIN companies c ON c.id = ui.company_id
LEFT JOIN profiles p ON p.id = ui.invited_by
ORDER BY ui.created_at DESC;

-- ========================================
-- VERIFICATION & TESTING QUERIES
-- ========================================

-- Test 1: Check company subscription limits
SELECT 'Testing subscription limits...' as test;
SELECT * FROM company_subscription_status;

-- Test 2: Check user permissions function
SELECT 'Testing user permissions...' as test;
SELECT 
    p.name as full_name,
    p.role,
    user_has_permission(p.id, 'view_dashboard') as can_view_dashboard,
    user_has_permission(p.id, 'delete_company') as can_delete_company
FROM profiles p
LIMIT 3;

-- Test 3: Check if user can be added to company
SELECT 'Testing user limits...' as test;
SELECT 
    c.name,
    c.max_users,
    can_add_user_to_company(c.id) as can_add_more_users
FROM companies c;

-- Test 4: Check dashboard stats
SELECT 'Testing dashboard stats...' as test;
SELECT get_company_dashboard_stats(c.id) as dashboard_stats
FROM companies c
LIMIT 1;

-- Test 5: Check RLS is working (this should only return data for authenticated user's company)
SELECT 'Testing RLS...' as test;
SELECT 'Run the following queries after authenticating in your app:' as instruction;
SELECT 'SELECT * FROM companies;' as query_1;
SELECT 'SELECT * FROM profiles;' as query_2;
SELECT 'SELECT * FROM user_invitations;' as query_3;

-- ========================================
-- CLEANUP EXPIRED INVITATIONS (run this periodically)
-- ========================================

-- Clean up expired invitations
SELECT cleanup_expired_invitations() as expired_invitations_cleaned;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 
    'All migrations completed successfully! 🎉' as status,
    'Your ZandeBooks database is ready for multi-user management!' as message,
    'Next steps:' as next_steps,
    '1. Update your frontend to use the new authentication flow' as step_1,
    '2. Test user invitations and permissions' as step_2,
    '3. Configure payment webhooks for subscription management' as step_3;

-- Show summary of what was created
SELECT 
    'Migration Summary:' as summary,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('user_invitations', 'user_sessions', 'notification_preferences', 'company_settings')) as new_tables_created,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%user%' OR routine_name LIKE '%company%' OR routine_name LIKE '%subscription%') as functions_created,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as security_policies_created;