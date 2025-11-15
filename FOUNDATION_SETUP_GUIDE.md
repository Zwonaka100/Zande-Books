# 🏗️ ZANDE BOOKS - FOUNDATION SETUP GUIDE
## Chart of Accounts & Double-Entry Engine

---

## 📋 WHAT WE'VE BUILT

### ✅ **1. Complete Database Schema**
**File:** `database/01_chart_of_accounts_schema.sql`

**Created Tables:**
- `account_types` - 5 account types (Asset, Liability, Equity, Revenue, Expense)
- `chart_of_accounts` - Company-specific accounts with hierarchy
- `coa_templates` - Pre-built industry templates
- `system_default_accounts` - System account mappings
- `accounting_periods` - Financial period management with locking
- `journal_entries` - Journal entry headers
- `journal_entry_lines` - Debit/credit lines
- `audit_log` - Complete audit trail
- `account_balances` - Materialized view for fast balance queries

**Features:**
- ✅ Hierarchical account structure (parent-child)
- ✅ Auto-calculate journal totals (trigger)
- ✅ Period locking (prevents posting to closed months)
- ✅ Audit logging (tracks all COA changes)
- ✅ Row Level Security (RLS) policies
- ✅ Double-entry validation (debits = credits check)

---

### ✅ **2. Industry COA Templates**
**File:** `database/02_coa_templates_data.sql`

**4 Complete Templates:**
1. **RETAIL** - 60+ accounts (inventory-focused)
   - Inventory accounts (Finished Goods)
   - COGS, Stock Shrinkage
   - Retail-specific expenses (Security, Leasehold Improvements)

2. **SERVICES** - 50+ accounts (labor-focused)
   - Unbilled Receivables, Deferred Revenue
   - Service Revenue categories (Consulting, Project, Retainer, Training)
   - Software Subscriptions, Professional Development

3. **RESTAURANT** - 55+ accounts (food service)
   - Inventory: Food, Beverages, Alcohol, Supplies
   - Food Cost, Beverage Cost, Alcohol Cost
   - Kitchen Staff, Wait Staff salaries separate
   - Licenses, Music, Delivery Fees, SAMRO fees

4. **MANUFACTURING** - 60+ accounts (production-focused)
   - Inventory: Raw Materials, WIP, Finished Goods, Packaging
   - Cost of Goods Manufactured
   - Factory Overhead, Direct Labor
   - Machinery, Tools & Dies

**Each template includes:**
- Assets, Liabilities, Equity, Revenue, Expenses
- VAT accounts (VAT Payable, PAYE, UIF)
- South African specific accounts (SARS compliance)
- Hierarchical structure (parent → child accounts)

---

### ✅ **3. Chart of Accounts Engine**
**File:** `Scripts/coa-engine.js`

**Functions:**
```javascript
// Load industry template for new company
await coaEngine.loadCOATemplate(companyId, 'RETAIL', userId);

// Get all accounts for company
const accounts = await coaEngine.getChartOfAccounts(companyId);

// Get posting accounts (for dropdowns)
const postingAccounts = await coaEngine.getPostingAccounts(companyId);

// Add custom account
await coaEngine.addAccount(companyId, {
  account_code: '6950',
  account_name: 'Software Licenses',
  account_type_code: 'EXPENSE',
  description: 'Annual software subscriptions'
}, userId);

// Update account
await coaEngine.updateAccount(accountId, { account_name: 'New Name' }, userId);

// Deactivate account (soft delete)
await coaEngine.deactivateAccount(accountId, userId);

// Get account balance
const balance = await coaEngine.getAccountBalance(accountId, companyId);

// Refresh materialized view (after posting journals)
await coaEngine.refreshAccountBalances();
```

---

### ✅ **4. Double-Entry Journal Engine**
**File:** `Scripts/journal-engine.js`

**Manual Journal Entry:**
```javascript
// Create manual journal entry
await journalEngine.createJournalEntry(companyId, {
  entry_date: '2025-11-03',
  entry_type: 'MANUAL',
  reference: 'ADJ-001',
  narration: 'Monthly rent accrual',
  lines: [
    {
      account_id: rentExpenseAccountId,
      debit_amount: 8500,
      credit_amount: 0,
      line_number: 1
    },
    {
      account_id: accruedExpensesAccountId,
      debit_amount: 0,
      credit_amount: 8500,
      line_number: 2
    }
  ],
  status: 'DRAFT' // or 'POSTED'
}, userId);
```

**Auto-Posting Functions:**
```javascript
// When invoice created → auto-post journal
await journalEngine.postSalesJournal(companyId, {
  id: invoiceId,
  invoice_number: 'INV-001',
  customer_name: 'ABC Company',
  invoice_date: '2025-11-03',
  subtotal: 10000,
  vat_amount: 1500,
  total_amount: 11500
}, userId);
// Creates: DR Receivables R11,500 | CR Sales R10,000 | CR VAT R1,500

// When expense recorded → auto-post journal
await journalEngine.postExpenseJournal(companyId, {
  expense_date: '2025-11-03',
  expense_account_id: officeSuppliesAccountId,
  payment_account_id: bankAccountId,
  description: 'Office stationery',
  subtotal: 350,
  vat_amount: 52.50,
  total_amount: 402.50
}, userId);
// Creates: DR Office Supplies R350 | DR VAT Input R52.50 | CR Bank R402.50
```

**Validation:**
```javascript
// Validate before posting
const validation = journalEngine.validateJournalEntry(lines);
if (!validation.valid) {
  alert(validation.error);
  // Error: "Journal entry is not balanced. Debits: R1000, Credits: R900, Difference: R100"
}
```

**Other Functions:**
```javascript
// Post a draft entry
await journalEngine.postJournalEntry(journalEntryId, userId);

// Void an entry (creates reversing entry)
await journalEngine.voidJournalEntry(journalEntryId, userId, 'Duplicate entry');

// Get all journal entries
const entries = await journalEngine.getJournalEntries(companyId, {
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  entryType: 'SALES', // MANUAL, PURCHASE, PAYMENT, etc.
  status: 'POSTED'
});
```

---

## 🚀 SETUP INSTRUCTIONS

### **STEP 1: Run Database Schema**

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `xfimvzdadqtlzwvlesrx`

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Schema SQL:**
   - Copy entire contents of `database/01_chart_of_accounts_schema.sql`
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for success message

4. **Run Template Data SQL:**
   - Create new query
   - Copy entire contents of `database/02_coa_templates_data.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Should insert 220+ template accounts

5. **Verify Tables Created:**
   ```sql
   -- Run this to check:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'account_types',
     'chart_of_accounts',
     'coa_templates',
     'journal_entries',
     'journal_entry_lines',
     'accounting_periods',
     'system_default_accounts',
     'audit_log'
   );
   ```
   Should return 8 tables.

---

### **STEP 2: Load Scripts in app.html**

Add these script tags BEFORE the closing `</body>` tag:

```html
<!-- Chart of Accounts Engine -->
<script src="Scripts/coa-engine.js"></script>

<!-- Journal Entry Engine -->
<script src="Scripts/journal-engine.js"></script>

<!-- Your existing app.js -->
<script src="app.js"></script>
```

**Order matters:** COA Engine → Journal Engine → App.js

---

### **STEP 3: Test Template Loading**

Open browser console and run:

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
const userId = user.id;
const companyId = user.id; // For now, user = company

// Load RETAIL template
await coaEngine.loadCOATemplate(companyId, 'RETAIL', userId);

// Verify accounts loaded
const accounts = await coaEngine.getChartOfAccounts(companyId);
console.log(`✅ Loaded ${accounts.length} accounts`);
// Should show 60+ accounts

// Check hierarchy
const assets = accounts.filter(a => a.account_type_code === 'ASSET');
console.log('Assets:', assets.length);
```

**Try other templates:**
- `'SERVICES'` - 50+ accounts
- `'RESTAURANT'` - 55+ accounts
- `'MANUFACTURING'` - 60+ accounts

---

### **STEP 4: Test Journal Entry**

```javascript
// Get some accounts
const accounts = await coaEngine.getPostingAccounts(companyId);
const bankAccount = accounts.find(a => a.account_name.includes('Bank'));
const salesAccount = accounts.find(a => a.account_name.includes('Sales'));
const vatAccount = accounts.find(a => a.account_name.includes('VAT'));
const receivablesAccount = accounts.find(a => a.account_name.includes('Receivable'));

// Create test journal entry
const entry = await journalEngine.createJournalEntry(companyId, {
  entry_date: '2025-11-03',
  entry_type: 'MANUAL',
  reference: 'TEST-001',
  narration: 'Test journal entry',
  lines: [
    {
      account_id: receivablesAccount.id,
      debit_amount: 1000,
      credit_amount: 0,
      line_number: 1
    },
    {
      account_id: salesAccount.id,
      debit_amount: 0,
      credit_amount: 870,
      line_number: 2
    },
    {
      account_id: vatAccount.id,
      debit_amount: 0,
      credit_amount: 130,
      line_number: 3
    }
  ],
  status: 'POSTED'
}, userId);

console.log('✅ Journal entry created:', entry.entry_number);

// Check balance updated
await coaEngine.refreshAccountBalances();
const balance = await coaEngine.getAccountBalance(receivablesAccount.id, companyId);
console.log('Receivables balance:', balance.current_balance);
// Should show R1,000
```

---

### **STEP 5: Test Auto-Posting**

```javascript
// Simulate a sale
const fakeInvoice = {
  id: crypto.randomUUID(),
  invoice_number: 'INV-001',
  customer_name: 'Test Customer',
  invoice_date: '2025-11-03',
  subtotal: 5000,
  vat_amount: 750,
  total_amount: 5750
};

// Auto-post sales journal
const salesJournal = await journalEngine.postSalesJournal(companyId, fakeInvoice, userId);
console.log('✅ Sales journal posted:', salesJournal.entry_number);

// Verify entry created
const entries = await journalEngine.getJournalEntries(companyId);
console.log('Total journal entries:', entries.length);

// Check the lines
console.log('Lines:', salesJournal.lines);
// Should show:
// DR Accounts Receivable R5,750
// CR Sales Revenue R5,000
// CR VAT Output R750
```

---

## 📊 WHAT'S NEXT (TODO)

### **Immediate:**
1. **Build Chart of Accounts UI** - Tree view of accounts in app.html
2. **Build Journals UI** - Manual journal entry form
3. **Build Trial Balance Report** - Show all account balances
4. **Build General Ledger Report** - Transaction details by account

### **Integration:**
5. **Update Sales Module** - Call `postSalesJournal()` when invoice created
6. **Update Purchases Module** - Call `postPurchaseJournal()` when bill created
7. **Update Expenses Module** - Call `postExpenseJournal()` when expense recorded
8. **Update Banking Module** - Call payment journals when payments made

### **Reports:**
9. **Profit & Loss** - Query account_balances for REVENUE - EXPENSE accounts
10. **Balance Sheet** - Query account_balances for ASSET, LIABILITY, EQUITY
11. **Trial Balance** - Show all accounts with debit/credit totals
12. **General Ledger** - Detailed transaction list per account

---

## 🎓 KEY CONCEPTS

### **Double-Entry Rules:**
```
ASSETS = LIABILITIES + EQUITY

For every transaction:
Total Debits = Total Credits

Account Types & Normal Balances:
- Assets: DEBIT increases, CREDIT decreases
- Liabilities: CREDIT increases, DEBIT decreases
- Equity: CREDIT increases, DEBIT decreases
- Revenue: CREDIT increases, DEBIT decreases
- Expenses: DEBIT increases, CREDIT decreases
```

### **Common Journal Entries:**

**Sale (on credit):**
```
DR: Accounts Receivable  R11,500
  CR: Sales Revenue              R10,000
  CR: VAT Output                  R1,500
```

**Purchase (on credit):**
```
DR: Purchases            R5,000
DR: VAT Input              R750
  CR: Accounts Payable           R5,750
```

**Payment from Customer:**
```
DR: Bank                R11,500
  CR: Accounts Receivable        R11,500
```

**Payment to Supplier:**
```
DR: Accounts Payable     R5,750
  CR: Bank                        R5,750
```

**Expense (paid immediately):**
```
DR: Rent Expense         R8,500
  CR: Bank                        R8,500
```

---

## 🐛 TROUBLESHOOTING

### **Error: "infinite recursion detected in policy"**
**Solution:** Your RLS policies are circular. Run this:
```sql
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
```
Then recreate policies properly.

### **Error: "Account code already exists"**
**Solution:** Account codes must be unique per company. Change the code or check if account already exists.

### **Error: "Cannot post to locked period"**
**Solution:** Unlock the period:
```sql
UPDATE accounting_periods 
SET is_locked = FALSE 
WHERE company_id = 'your-company-id' 
AND period_name = 'Month Name';
```

### **Journal entry not balancing:**
**Solution:** Check your math. Use browser console:
```javascript
const lines = [
  { debit: 1000, credit: 0 },
  { debit: 0, credit: 900 }
];
const totalDR = lines.reduce((sum, l) => sum + l.debit, 0);
const totalCR = lines.reduce((sum, l) => sum + l.credit, 0);
console.log('Debits:', totalDR, 'Credits:', totalCR, 'Difference:', totalDR - totalCR);
```

---

## ✅ TESTING CHECKLIST

- [ ] SQL schema runs without errors
- [ ] Template data inserts successfully
- [ ] Scripts load in browser (check console)
- [ ] `window.coaEngine` exists in console
- [ ] `window.journalEngine` exists in console
- [ ] Load RETAIL template → 60+ accounts created
- [ ] Create manual journal entry → validates balance
- [ ] Post journal entry → status changes to POSTED
- [ ] Refresh balances → account_balances view updates
- [ ] Auto-post sales journal → 3 lines created (DR/CR/VAT)
- [ ] Check audit_log → COA changes tracked
- [ ] Try locked period → error thrown correctly

---

## 📞 SUPPORT

If you get stuck, check:
1. Browser Console (F12) for JavaScript errors
2. Supabase Dashboard → Database → Check if tables exist
3. Supabase Dashboard → Auth → Check if user logged in
4. Network tab → Check if Supabase API calls succeeding

---

**🎉 YOU NOW HAVE A BULLETPROOF ACCOUNTING FOUNDATION!**

This is the core of every accounting system. Everything else (invoices, expenses, reports) posts to these journals and accounts.

Next step: Build the UI to make it accessible to users! 🚀
