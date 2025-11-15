-- ========================================
-- SAFE ASSESSMENT: CHECK EXISTING SCHEMA
-- Run this FIRST to see what you already have
-- ========================================

-- Check existing tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check columns in companies table (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check columns in users table (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all your existing tables and their columns
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- Check existing foreign keys
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check existing functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'Assessment complete! Review the results above.' as status;