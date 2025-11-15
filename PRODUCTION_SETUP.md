# 🚀 ZANDE BOOKS - PRODUCTION SETUP GUIDE

## Step 1: Execute SQL Scripts in Supabase (REQUIRED)

### Open Supabase SQL Editor
1. Go to https://supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

---

## Step 2: Run These Scripts IN ORDER

### Script 1: Chart of Accounts Foundation
**File:** `database/01_chart_of_accounts_schema.sql`

```sql
-- Copy and paste the entire contents of database/01_chart_of_accounts_schema.sql
-- This creates:
-- - account_types table
-- - chart_of_accounts table
-- - coa_templates table
-- - system_default_accounts table
-- - accounting_periods table
-- - journal_entries table
-- - journal_entry_lines table
-- - audit_log table
-- - account_balances materialized view
-- - All triggers and RLS policies
```

**Status:** ⚠️ MUST RUN FIRST

---

### Script 2: COA Templates (4 Industries)
**File:** `database/02_coa_templates_data.sql`

```sql
-- Copy and paste the entire contents of database/02_coa_templates_data.sql
-- This inserts:
-- - RETAIL template (60 accounts)
-- - SERVICES template (50 accounts)
-- - RESTAURANT template (55 accounts)
-- - MANUFACTURING template (60 accounts)
```

**Status:** ⚠️ RUN AFTER Script 1

---

### Script 3: Industry Features Configuration
**File:** `database/03_industry_features_schema.sql`

```sql
-- Copy and paste the entire contents of database/03_industry_features_schema.sql
-- This adds:
-- - industry_type column to profiles
-- - industry_features table
-- - 13 industry configurations
```

**Status:** ⚠️ RUN AFTER Script 2

---

## Step 3: Load COA Template for Your Account

Once the tables are created, you need to load a COA template for your demo account.

### Option A: Using JavaScript Console (Quick Test)

1. Open your app in browser
2. Press F12 to open console
3. Run this command:

```javascript
// Load COA template for current user
async function setupMyCOA() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('Profile:', profile);
  
  // Choose industry (change this to your business type)
  const industryType = 'RETAIL'; // or 'SERVICES', 'RESTAURANT', 'MANUFACTURING'
  
  // Load template using COA engine
  if (window.coaEngine) {
    const result = await window.coaEngine.loadCOATemplate(
      profile.id, // company_id
      industryType,
      user.id
    );
    console.log('COA Template loaded:', result);
  } else {
    console.error('COA Engine not loaded. Make sure coa-engine.js is included.');
  }
}

// Run it
setupMyCOA();
```

### Option B: Using SQL (Manual)

If you want to manually copy a template:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID
-- Replace 'RETAIL' with your chosen industry

INSERT INTO chart_of_accounts (
  company_id, 
  account_code, 
  account_name, 
  account_type, 
  sub_type, 
  description, 
  parent_account_id,
  is_header,
  is_system,
  normal_balance,
  is_active,
  created_by
)
SELECT 
  'YOUR_USER_ID' as company_id,
  account_code,
  account_name,
  account_type,
  sub_type,
  description,
  NULL as parent_account_id, -- We'll handle hierarchy later
  is_header,
  is_system,
  normal_balance,
  TRUE as is_active,
  'YOUR_USER_ID' as created_by
FROM coa_templates
WHERE industry_type = 'RETAIL';
```

---

## Step 4: Enable COA Engine in Your App

The COA engine scripts need to be loaded. Update your `app.html`:

```html
<!-- Add these scripts BEFORE app.js -->
<script src="../Scripts/coa-engine.js"></script>
<script src="../Scripts/journal-engine.js"></script>
```

**Current Status:** ✅ Already added (commented out in your app.html)

You need to **uncomment** these lines in `app/app.html` around line 4380:

```html
<!-- COA & Journal engines (coming soon) -->
<!-- <script src="../Scripts/coa-engine.js"></script> -->
<!-- <script src="../Scripts/journal-engine.js"></script> -->
```

Change to:

```html
<!-- COA & Journal engines -->
<script src="../Scripts/coa-engine.js"></script>
<script src="../Scripts/journal-engine.js"></script>
```

---

## Step 5: Update JavaScript to Load REAL Data

Currently your `loadChartOfAccounts()` function falls back to demo data. Let's make it load real data properly.

The function in `app.js` will:
1. Try to load from `chart_of_accounts` table
2. If empty, use COA engine to load template
3. Only show demo data if tables don't exist

**Status:** ✅ Function already created, just needs database tables to exist

---

## Step 6: Verification Checklist

After running all scripts, verify in Supabase:

### Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'account_types',
    'chart_of_accounts',
    'coa_templates',
    'system_default_accounts',
    'accounting_periods',
    'journal_entries',
    'journal_entry_lines',
    'audit_log',
    'industry_features'
  )
ORDER BY table_name;
```

**Expected:** 9 tables

### Check COA Templates Loaded
```sql
SELECT industry_type, COUNT(*) as account_count
FROM coa_templates
GROUP BY industry_type
ORDER BY industry_type;
```

**Expected:**
- MANUFACTURING: ~60 accounts
- RESTAURANT: ~55 accounts
- RETAIL: ~60 accounts
- SERVICES: ~50 accounts

### Check Industry Features
```sql
SELECT industry_type, COUNT(*) as feature_count
FROM industry_features
GROUP BY industry_type
ORDER BY industry_type;
```

**Expected:** 13+ industries with multiple features each

### Check Your COA
```sql
-- Replace 'YOUR_USER_ID' with your user ID
SELECT COUNT(*) as my_account_count
FROM chart_of_accounts
WHERE company_id = 'YOUR_USER_ID';
```

**Expected:** 50-60 accounts (depending on industry)

---

## Step 7: Test in Browser

1. Refresh your app
2. Click "Chart of Accounts"
3. You should see:
   - ✅ Your actual accounts from database
   - ✅ NO demo notice
   - ✅ Summary cards with correct counts
   - ✅ Beautiful gradient headers
   - ✅ Smooth hover effects

---

## Step 8: Next Steps After COA Works

Once your Chart of Accounts is loading from the database:

1. **Test Adding Accounts** - The Add Account button should work
2. **Test Journals Section** - Navigate to Journals and test journal entries
3. **Test General Ledger** - View account transactions
4. **Test Reports** - Generate Trial Balance, P&L, Balance Sheet

---

## 🔥 Quick Start Commands

```bash
# 1. Make sure you're in the right directory
cd "C:\Users\Zwonaka Mabege\OneDrive\Desktop\Zande Technologies\Zandebooks\Zandebooks"

# 2. Open Supabase dashboard
start https://supabase.com

# 3. Open the SQL files in order
start database\01_chart_of_accounts_schema.sql
start database\02_coa_templates_data.sql
start database\03_industry_features_schema.sql
```

---

## 🆘 Troubleshooting

### "Table already exists" error
```sql
-- Drop and recreate if needed
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS coa_templates CASCADE;
-- Then run the schema scripts again
```

### "No accounts showing"
1. Check browser console for errors (F12)
2. Verify tables exist in Supabase
3. Check if your user has a company_id in profiles table
4. Try loading template manually using JavaScript console

### "Demo data still showing"
This means tables don't exist yet. Run the SQL scripts in Supabase.

---

## 📊 Architecture Overview

```
User logs in
    ↓
loadChartOfAccounts() runs
    ↓
Checks chart_of_accounts table
    ↓
If empty → Load template using COA engine
    ↓
If tables don't exist → Show demo data (temporary)
    ↓
Display accounts in modern table
```

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ No "demo data" messages
2. ✅ Accounts load instantly from database
3. ✅ Summary cards show real counts
4. ✅ You can add/edit/delete accounts
5. ✅ Changes persist after refresh
6. ✅ Journal entries can post to these accounts

---

**Ready to go live?** Start with Step 1 and run those SQL scripts! 🚀
