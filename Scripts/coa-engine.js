/**
 * ========================================
 * ZANDE BOOKS - CHART OF ACCOUNTS ENGINE
 * Core accounting functionality
 * ========================================
 */

// ========================================
// CHART OF ACCOUNTS FUNCTIONS
// ========================================

/**
 * Load industry COA template for a new company
 */
async function loadCOATemplate(companyId, industryType, userId) {
  try {
    console.log(`Loading ${industryType} COA template for company ${companyId}`);
    
    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from('coa_templates')
      .select('*')
      .eq('industry_type', industryType)
      .order('sort_order');
    
    if (templateError) throw templateError;
    
    if (!template || template.length === 0) {
      throw new Error(`No template found for industry: ${industryType}`);
    }
    
    // Transform template to company COA
    const coaRecords = template.map(t => ({
      company_id: companyId,
      account_code: t.account_code,
      account_name: t.account_name,
      account_type_code: t.account_type_code,
      description: t.description,
      is_header: t.is_header,
      is_active: true,
      is_system_account: true, // Template accounts are protected
      vat_applicable: t.vat_applicable,
      allow_manual_posting: !t.is_header, // Headers can't be posted to
      created_by: userId,
      updated_by: userId
    }));
    
    // Insert accounts in batches (Supabase limit)
    const batchSize = 100;
    for (let i = 0; i < coaRecords.length; i += batchSize) {
      const batch = coaRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('chart_of_accounts')
        .insert(batch);
      
      if (insertError) throw insertError;
    }
    
    // Now set up parent-child relationships (second pass needed)
    await setupCOAHierarchy(companyId, industryType);
    
    // Set up default system accounts
    await setupDefaultAccounts(companyId);
    
    console.log(`✅ Loaded ${coaRecords.length} accounts for ${industryType}`);
    return { success: true, accountCount: coaRecords.length };
    
  } catch (error) {
    console.error('Error loading COA template:', error);
    throw error;
  }
}

/**
 * Setup parent-child hierarchy for COA
 */
async function setupCOAHierarchy(companyId, industryType) {
  try {
    // Get template to find parent relationships
    const { data: template } = await supabase
      .from('coa_templates')
      .select('account_code, parent_account_code')
      .eq('industry_type', industryType)
      .not('parent_account_code', 'is', null);
    
    if (!template) return;
    
    // Get all company accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code')
      .eq('company_id', companyId);
    
    // Create lookup map
    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.account_code] = acc.id;
    });
    
    // Update parent IDs
    for (const t of template) {
      const accountId = accountMap[t.account_code];
      const parentId = accountMap[t.parent_account_code];
      
      if (accountId && parentId) {
        await supabase
          .from('chart_of_accounts')
          .update({ parent_account_id: parentId })
          .eq('id', accountId);
      }
    }
    
    console.log('✅ COA hierarchy set up');
  } catch (error) {
    console.error('Error setting up COA hierarchy:', error);
  }
}

/**
 * Setup default system accounts mapping
 */
async function setupDefaultAccounts(companyId) {
  try {
    // Get key accounts from COA
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name')
      .eq('company_id', companyId);
    
    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.account_code] = acc.id;
    });
    
    // Map common account codes to system purposes
    const defaultMappings = [
      { purpose: 'RETAINED_EARNINGS', code: '3300' },
      { purpose: 'CURRENT_YEAR_EARNINGS', code: '3900' },
      { purpose: 'VAT_CONTROL', code: '2120' },
      { purpose: 'VAT_OUTPUT', code: '2120' },
      { purpose: 'VAT_INPUT', code: '2120' },
      { purpose: 'ACCOUNTS_RECEIVABLE', code: '1140' },
      { purpose: 'ACCOUNTS_PAYABLE', code: '2110' },
      { purpose: 'BANK_CHARGES', code: '6800' }
    ];
    
    const mappingsToInsert = defaultMappings
      .filter(m => accountMap[m.code])
      .map(m => ({
        company_id: companyId,
        account_purpose: m.purpose,
        account_id: accountMap[m.code]
      }));
    
    if (mappingsToInsert.length > 0) {
      const { error } = await supabase
        .from('system_default_accounts')
        .insert(mappingsToInsert);
      
      if (error && error.code !== '23505') { // Ignore duplicate errors
        throw error;
      }
    }
    
    console.log('✅ Default accounts mapped');
  } catch (error) {
    console.error('Error setting up default accounts:', error);
  }
}

/**
 * Get Chart of Accounts for a company
 */
async function getChartOfAccounts(companyId, includeInactive = false) {
  try {
    let query = supabase
      .from('chart_of_accounts')
      .select(`
        *,
        account_type:account_types(code, name, normal_balance),
        parent:parent_account_id(account_code, account_name)
      `)
      .eq('company_id', companyId)
      .order('account_code');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching COA:', error);
    throw error;
  }
}

/**
 * Get accounts for dropdown (posting accounts only)
 */
async function getPostingAccounts(companyId) {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type_code, vat_applicable')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_header', false)
      .eq('allow_manual_posting', true)
      .order('account_code');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching posting accounts:', error);
    throw error;
  }
}

/**
 * Add new account to COA
 */
async function addAccount(companyId, accountData, userId) {
  try {
    // Validate account code doesn't exist
    const { data: existing } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_code', accountData.account_code)
      .single();
    
    if (existing) {
      throw new Error(`Account code ${accountData.account_code} already exists`);
    }
    
    const newAccount = {
      company_id: companyId,
      ...accountData,
      created_by: userId,
      updated_by: userId,
      is_system_account: false
    };
    
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([newAccount])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Account added:', data.account_code);
    return data;
  } catch (error) {
    console.error('Error adding account:', error);
    throw error;
  }
}

/**
 * Update account
 */
async function updateAccount(accountId, updates, userId) {
  try {
    updates.updated_by = userId;
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('is_system_account', false) // Can't modify system accounts
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Account updated:', accountId);
    return data;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
}

/**
 * Deactivate account (soft delete)
 */
async function deactivateAccount(accountId, userId) {
  try {
    // Check if account has transactions
    const { data: transactions } = await supabase
      .from('journal_entry_lines')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);
    
    if (transactions && transactions.length > 0) {
      throw new Error('Cannot deactivate account with transactions. Mark as inactive instead.');
    }
    
    const { error } = await supabase
      .from('chart_of_accounts')
      .update({ 
        is_active: false, 
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('is_system_account', false);
    
    if (error) throw error;
    
    console.log('✅ Account deactivated:', accountId);
  } catch (error) {
    console.error('Error deactivating account:', error);
    throw error;
  }
}

/**
 * Get account balance
 */
async function getAccountBalance(accountId, companyId, asOfDate = null) {
  try {
    const { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('company_id', companyId)
      .eq('account_id', accountId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found"
    
    return data || {
      account_id: accountId,
      current_balance: 0,
      total_debits: 0,
      total_credits: 0
    };
  } catch (error) {
    console.error('Error fetching account balance:', error);
    throw error;
  }
}

/**
 * Refresh account balances materialized view
 */
async function refreshAccountBalances() {
  try {
    const { error } = await supabase.rpc('refresh_account_balances');
    if (error) throw error;
    console.log('✅ Account balances refreshed');
  } catch (error) {
    console.error('Error refreshing balances:', error);
    throw error;
  }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
window.coaEngine = {
  loadCOATemplate,
  getChartOfAccounts,
  getPostingAccounts,
  addAccount,
  updateAccount,
  deactivateAccount,
  getAccountBalance,
  refreshAccountBalances
};

console.log('✅ COA Engine loaded');
