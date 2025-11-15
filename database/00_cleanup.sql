-- ========================================
-- CLEANUP SCRIPT - Run this FIRST
-- This removes all existing accounting tables/views/functions
-- ========================================

-- Drop materialized view and its index first
DROP MATERIALIZED VIEW IF EXISTS account_balances CASCADE;

-- Drop tables in reverse order (to handle foreign keys)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS system_default_accounts CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS accounting_periods CASCADE;
DROP TABLE IF EXISTS coa_templates CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS account_types CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS refresh_account_balances() CASCADE;
DROP FUNCTION IF EXISTS update_journal_totals() CASCADE;
DROP FUNCTION IF EXISTS check_period_lock() CASCADE;
DROP FUNCTION IF EXISTS log_coa_changes() CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete! You can now run 01_chart_of_accounts_schema.sql';
END $$;
