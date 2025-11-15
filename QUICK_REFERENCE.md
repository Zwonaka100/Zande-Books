# 🚀 Industry Adaptation - Quick Reference

## Files to Execute (In Order)

### 1️⃣ Database Setup
```sql
-- Run this in Supabase SQL Editor
database/03_industry_features_schema.sql
```

### 2️⃣ Signup Flow Update (TODO)
```html
<!-- Add to signup.html -->
<select id="industryType" name="industry_type" required>
  <option value="">Select your industry...</option>
  <option value="SERVICES">Services</option>
  <option value="RETAIL">Retail</option>
  <option value="RESTAURANT">Restaurant</option>
  <option value="MANUFACTURING">Manufacturing</option>
  <option value="CONSTRUCTION">Construction</option>
  <option value="HEALTHCARE">Healthcare</option>
  <option value="LEGAL">Legal Services</option>
  <option value="REALESTATE">Real Estate</option>
  <option value="TRANSPORT">Transportation</option>
  <option value="WHOLESALE">Wholesale</option>
  <option value="ECOMMERCE">E-Commerce</option>
  <option value="NONPROFIT">Nonprofit</option>
  <option value="GENERAL">General Business</option>
</select>
```

---

## Test Commands (Browser Console)

```javascript
// Check if loaded
window.industryConfig.isLoaded
// Should return: true

// Get current industry
window.industryConfig.getIndustryType()
// Returns: 'SERVICES', 'RETAIL', etc.

// Get display name
window.industryConfig.getIndustryDisplayName()
// Returns: 'Services', 'Retail', etc.

// Check if feature enabled
window.industryConfig.isFeatureEnabled('customers')
// Returns: true or false

// Get feature display name
window.industryConfig.getFeatureDisplayName('customers')
// Returns: 'Clients', 'Customers', etc.

// Get all enabled features
window.industryConfig.getEnabledFeatures()
// Returns: array of enabled features

// Show industry badge on screen
window.industryUI.showIndustryBadge()
// Shows popup with industry name

// Reload configuration
await window.industryConfig.reload()

// Reapply UI adaptations
window.industryUI.applyAdaptations()
```

---

## Database Queries (Supabase SQL Editor)

```sql
-- Check if industry_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'industry_type';

-- Check industry_features table
SELECT COUNT(*) FROM industry_features;
-- Should return: 100+ rows

-- View all features for SERVICES industry
SELECT feature_code, is_enabled, display_name, sort_order
FROM industry_features
WHERE industry_type = 'SERVICES'
ORDER BY sort_order;

-- View all features for RETAIL industry
SELECT feature_code, is_enabled, display_name, sort_order
FROM industry_features
WHERE industry_type = 'RETAIL'
ORDER BY sort_order;

-- Check a specific user's industry
SELECT id, email, industry_type, business_name
FROM profiles
WHERE email = 'test@example.com';

-- Update a user's industry (for testing)
UPDATE profiles 
SET industry_type = 'SERVICES'
WHERE email = 'test@example.com';
```

---

## Industry Configuration Matrix

### Services (SERVICES)
- ✅ Dashboard
- ✅ **Clients** (not Customers)
- ✅ **Vendors** (not Suppliers)
- ❌ Products (hidden)
- ✅ Banking
- ✅ **Invoicing** (not Sales)
- ❌ Purchases (hidden)
- ✅ Expenses
- ✅ Journals
- ✅ General Ledger
- ✅ Chart of Accounts
- ✅ Reports

### Retail (RETAIL)
- ✅ Dashboard
- ✅ Customers
- ✅ Suppliers
- ✅ Products
- ✅ Banking
- ✅ Sales
- ✅ Purchases
- ✅ Expenses
- ✅ Journals
- ✅ General Ledger
- ✅ Chart of Accounts
- ✅ Reports

### Restaurant (RESTAURANT)
- ✅ Dashboard
- ❌ Customers (hidden)
- ✅ Suppliers
- ✅ **Menu Items** (not Products)
- ✅ Banking
- ✅ **Orders** (not Sales)
- ✅ Purchases
- ✅ Expenses
- ✅ Journals
- ✅ General Ledger
- ✅ Chart of Accounts
- ✅ Reports

### Manufacturing (MANUFACTURING)
- ✅ Dashboard
- ✅ Customers
- ✅ Suppliers
- ✅ **Finished Goods** (not Products)
- ✅ Banking
- ✅ **Sales Orders** (not Sales)
- ✅ **Raw Materials** (not Purchases)
- ✅ Expenses
- ✅ Journals
- ✅ General Ledger
- ✅ Chart of Accounts
- ✅ Reports

### Legal (LEGAL)
- ✅ Dashboard
- ✅ **Clients** (not Customers)
- ✅ **Vendors** (not Suppliers)
- ❌ Products (hidden)
- ✅ Banking
- ✅ **Billing** (not Sales)
- ❌ Purchases (hidden)
- ✅ Expenses
- ✅ Journals
- ✅ General Ledger
- ✅ Chart of Accounts
- ✅ Reports

---

## Common Issues & Fixes

### Issue: Features not hiding
```javascript
// Solution 1: Check if config loaded
if (!window.industryConfig.isLoaded) {
  await window.industryConfig.loadConfig();
  await window.industryUI.applyAdaptations();
}

// Solution 2: Check data-feature attributes
document.querySelectorAll('[data-feature]').forEach(el => {
  console.log(el.getAttribute('data-feature'), el.style.display);
});
```

### Issue: Wrong labels showing
```javascript
// Check feature config
console.log(window.industryConfig.getFeatureConfig('customers'));

// Expected output:
// {
//   enabled: true,
//   required: true,
//   displayName: "Clients",
//   icon: "👥",
//   sortOrder: 10
// }
```

### Issue: SQL errors
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'industry_features');

-- Should return both tables
```

---

## Adding New Industry (5 Steps)

```sql
-- 1. Add to database (copy-paste this template, change NEWTYPE)
INSERT INTO industry_features (industry_type, feature_code, is_enabled, is_required, display_name, menu_icon, sort_order) VALUES
('NEWTYPE', 'dashboard', TRUE, TRUE, 'Dashboard', '📊', 1),
('NEWTYPE', 'customers', TRUE, TRUE, 'Customers', '👥', 10),
('NEWTYPE', 'suppliers', TRUE, TRUE, 'Suppliers', '🏢', 20),
('NEWTYPE', 'products', TRUE, FALSE, 'Products', '📦', 30),
('NEWTYPE', 'banking', TRUE, TRUE, 'Banking', '🏦', 50),
('NEWTYPE', 'sales', TRUE, TRUE, 'Sales', '💵', 40),
('NEWTYPE', 'purchases', TRUE, TRUE, 'Purchases', '🛒', 41),
('NEWTYPE', 'expenses', TRUE, TRUE, 'Expenses', '💳', 60),
('NEWTYPE', 'journals', TRUE, FALSE, 'Journals', '📖', 70),
('NEWTYPE', 'reports', TRUE, TRUE, 'Reports', '📈', 80);
```

```html
<!-- 2. Add to signup.html -->
<option value="NEWTYPE">New Industry Name</option>
```

```javascript
// 3. Add to industry-config.js (line ~90)
const industryNames = {
  // ... existing industries
  'NEWTYPE': 'New Industry Name'
};
```

```
4. Test with console:
   window.industryConfig.reload()
   window.industryUI.applyAdaptations()
```

```
5. Done! No other changes needed.
```

---

## File Structure

```
Zandebooks/
├── database/
│   ├── 01_chart_of_accounts_schema.sql      [COA foundation]
│   ├── 02_coa_templates_data.sql            [4 COA templates]
│   └── 03_industry_features_schema.sql      [NEW - Industry config]
├── Scripts/
│   ├── auth.js
│   ├── supabase.js
│   ├── industry-config.js                   [NEW - Config loader]
│   └── industry-ui-adapter.js               [NEW - UI adapter]
├── app/
│   ├── app.html                             [MODIFIED - Added scripts]
│   └── app.js
├── signup.html                              [TODO - Add dropdown]
├── INDUSTRY_ADAPTATION_GUIDE.md             [NEW - Full guide]
├── IMPLEMENTATION_SUMMARY.md                [NEW - Summary]
└── QUICK_REFERENCE.md                       [NEW - This file]
```

---

## Key Concepts

**Single App, Multiple Industries**
- ✅ ONE codebase
- ✅ Features show/hide based on industry_type
- ✅ Database-driven configuration
- ✅ Like Microsoft Word (one app, different users)

**How It Works**
1. User logs in
2. System reads `profiles.industry_type`
3. Loads matching features from `industry_features`
4. Hides disabled features with `display: none`
5. Renames labels (e.g., Customers → Clients)
6. Updates icons if specified

**Performance**
- Config loads once on app start
- Cached in `window.industryConfig`
- No performance impact
- Instant UI updates

---

## Next Steps

1. ✅ Database schema created
2. ✅ JavaScript modules created
3. ✅ UI integration complete
4. ✅ Documentation written
5. ⏳ Execute SQL in Supabase (TODO)
6. ⏳ Update signup flow (TODO)
7. ⏳ Test with 3 industries (TODO)

---

**See Also:**
- `INDUSTRY_ADAPTATION_GUIDE.md` - Full setup guide
- `IMPLEMENTATION_SUMMARY.md` - What we built
- `database/03_industry_features_schema.sql` - Database schema
- `Scripts/industry-config.js` - Configuration loader
- `Scripts/industry-ui-adapter.js` - UI adapter
