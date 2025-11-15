/**
 * ========================================
 * ZANDE BOOKS - DOUBLE-ENTRY JOURNAL ENGINE
 * Core double-entry bookkeeping system
 * ========================================
 */

// ========================================
// JOURNAL ENTRY CREATION & VALIDATION
// ========================================

/**
 * Validate journal entry (must balance: debits = credits)
 */
function validateJournalEntry(lines) {
  if (!lines || lines.length < 2) {
    return { valid: false, error: 'Journal entry must have at least 2 lines' };
  }
  
  let totalDebits = 0;
  let totalCredits = 0;
  
  for (const line of lines) {
    const debit = parseFloat(line.debit_amount) || 0;
    const credit = parseFloat(line.credit_amount) || 0;
    
    // Each line must be either debit OR credit, not both
    if (debit > 0 && credit > 0) {
      return { valid: false, error: `Line ${line.line_number}: Cannot have both debit and credit` };
    }
    
    if (debit === 0 && credit === 0) {
      return { valid: false, error: `Line ${line.line_number}: Must have either debit or credit` };
    }
    
    if (!line.account_id) {
      return { valid: false, error: `Line ${line.line_number}: Account is required` };
    }
    
    totalDebits += debit;
    totalCredits += credit;
  }
  
  // Check if balanced (allow 0.01 difference for rounding)
  const difference = Math.abs(totalDebits - totalCredits);
  if (difference > 0.01) {
    return { 
      valid: false, 
      error: `Journal entry is not balanced. Debits: R${totalDebits.toFixed(2)}, Credits: R${totalCredits.toFixed(2)}, Difference: R${difference.toFixed(2)}` 
    };
  }
  
  return { 
    valid: true, 
    totalDebits: totalDebits.toFixed(2), 
    totalCredits: totalCredits.toFixed(2) 
  };
}

/**
 * Create manual journal entry
 */
async function createJournalEntry(companyId, entryData, userId) {
  try {
    console.log('Creating journal entry...', entryData);
    
    // Validate lines
    const validation = validateJournalEntry(entryData.lines);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Check period lock
    await checkPeriodLock(companyId, entryData.entry_date);
    
    // Generate entry number if not provided
    if (!entryData.entry_number) {
      entryData.entry_number = await generateJournalEntryNumber(companyId, entryData.entry_type);
    }
    
    // Create header
    const header = {
      company_id: companyId,
      entry_number: entryData.entry_number,
      entry_date: entryData.entry_date,
      entry_type: entryData.entry_type || 'MANUAL',
      source_type: entryData.source_type || null,
      source_id: entryData.source_id || null,
      reference: entryData.reference || '',
      narration: entryData.narration,
      total_debits: validation.totalDebits,
      total_credits: validation.totalCredits,
      status: entryData.status || 'DRAFT',
      is_reversing: entryData.is_reversing || false,
      created_by: userId,
      posted_by: entryData.status === 'POSTED' ? userId : null,
      posted_at: entryData.status === 'POSTED' ? new Date().toISOString() : null
    };
    
    const { data: journalEntry, error: headerError } = await supabase
      .from('journal_entries')
      .insert([header])
      .select()
      .single();
    
    if (headerError) throw headerError;
    
    // Create lines
    const lines = entryData.lines.map((line, index) => ({
      journal_entry_id: journalEntry.id,
      line_number: line.line_number || (index + 1),
      account_id: line.account_id,
      description: line.description || entryData.narration,
      debit_amount: parseFloat(line.debit_amount) || 0,
      credit_amount: parseFloat(line.credit_amount) || 0
    }));
    
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);
    
    if (linesError) {
      // Rollback header if lines fail
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw linesError;
    }
    
    console.log('✅ Journal entry created:', journalEntry.entry_number);
    
    // Refresh balances if posted
    if (header.status === 'POSTED') {
      await window.coaEngine.refreshAccountBalances();
    }
    
    return journalEntry;
    
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
}

/**
 * Generate journal entry number
 */
async function generateJournalEntryNumber(companyId, entryType) {
  try {
    // Get last entry number for this type
    const prefix = entryType.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', companyId)
      .like('entry_number', pattern)
      .order('entry_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].entry_number.split('-').pop();
      nextNumber = parseInt(lastNumber) + 1;
    }
    
    return `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  } catch (error) {
    console.error('Error generating entry number:', error);
    return `${entryType}-${Date.now()}`;
  }
}

/**
 * Check if period is locked
 */
async function checkPeriodLock(companyId, entryDate) {
  try {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('is_locked, period_name')
      .eq('company_id', companyId)
      .lte('start_date', entryDate)
      .gte('end_date', entryDate)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (data && data.is_locked) {
      throw new Error(`Cannot post to locked period: ${data.period_name}`);
    }
  } catch (error) {
    if (error.message.includes('locked period')) {
      throw error;
    }
    // If no period found, allow (period management optional)
  }
}

/**
 * Post (approve) a draft journal entry
 */
async function postJournalEntry(journalEntryId, userId) {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        status: 'POSTED',
        posted_by: userId,
        posted_at: new Date().toISOString()
      })
      .eq('id', journalEntryId)
      .eq('status', 'DRAFT')
      .select()
      .single();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error('Journal entry not found or already posted');
    }
    
    await window.coaEngine.refreshAccountBalances();
    
    console.log('✅ Journal entry posted:', data.entry_number);
    return data;
  } catch (error) {
    console.error('Error posting journal entry:', error);
    throw error;
  }
}

/**
 * Void a journal entry (create reversing entry)
 */
async function voidJournalEntry(journalEntryId, userId, reason) {
  try {
    // Get original entry with lines
    const { data: original, error: fetchError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(*)
      `)
      .eq('id', journalEntryId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (original.status !== 'POSTED') {
      throw new Error('Can only void posted entries');
    }
    
    // Create reversing entry
    const reversingLines = original.lines.map(line => ({
      account_id: line.account_id,
      description: `REVERSAL: ${line.description}`,
      debit_amount: line.credit_amount, // Swap debit/credit
      credit_amount: line.debit_amount,
      line_number: line.line_number
    }));
    
    const reversingEntry = {
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'REVERSAL',
      source_type: original.source_type,
      source_id: original.source_id,
      reference: original.reference,
      narration: `REVERSAL: ${original.narration} | Reason: ${reason}`,
      lines: reversingLines,
      status: 'POSTED'
    };
    
    const reversing = await createJournalEntry(original.company_id, reversingEntry, userId);
    
    // Mark original as void
    await supabase
      .from('journal_entries')
      .update({
        status: 'VOID',
        reversed_at: new Date().toISOString(),
        reversed_by_entry_id: reversing.id
      })
      .eq('id', journalEntryId);
    
    console.log('✅ Journal entry voided:', original.entry_number);
    return reversing;
  } catch (error) {
    console.error('Error voiding journal entry:', error);
    throw error;
  }
}

// ========================================
// AUTO-POSTING FUNCTIONS (Called by transactions)
// ========================================

/**
 * Auto-post journal entry for Sales Invoice
 */
async function postSalesJournal(companyId, invoice, userId) {
  try {
    const lines = [];
    
    // DR: Accounts Receivable
    const arAccount = await getSystemAccount(companyId, 'ACCOUNTS_RECEIVABLE');
    lines.push({
      account_id: arAccount.id,
      description: `Sales Invoice #${invoice.invoice_number} - ${invoice.customer_name}`,
      debit_amount: invoice.total_amount,
      credit_amount: 0,
      line_number: 1
    });
    
    // CR: Sales Revenue
    const revenueAccount = await findAccountByType(companyId, 'REVENUE', 'Sales');
    lines.push({
      account_id: revenueAccount.id,
      description: `Sales Invoice #${invoice.invoice_number}`,
      debit_amount: 0,
      credit_amount: invoice.subtotal,
      line_number: 2
    });
    
    // CR: VAT Output (if VAT applicable)
    if (invoice.vat_amount > 0) {
      const vatAccount = await getSystemAccount(companyId, 'VAT_OUTPUT');
      lines.push({
        account_id: vatAccount.id,
        description: `VAT on Invoice #${invoice.invoice_number}`,
        debit_amount: 0,
        credit_amount: invoice.vat_amount,
        line_number: 3
      });
    }
    
    const journalEntry = {
      entry_date: invoice.invoice_date,
      entry_type: 'SALES',
      source_type: 'INVOICE',
      source_id: invoice.id,
      reference: invoice.invoice_number,
      narration: `Sales Invoice #${invoice.invoice_number} - ${invoice.customer_name}`,
      lines: lines,
      status: 'POSTED'
    };
    
    return await createJournalEntry(companyId, journalEntry, userId);
  } catch (error) {
    console.error('Error posting sales journal:', error);
    throw error;
  }
}

/**
 * Auto-post journal entry for Purchase Bill
 */
async function postPurchaseJournal(companyId, bill, userId) {
  try {
    const lines = [];
    
    // DR: Purchases/Inventory
    const purchaseAccount = await findAccountByType(companyId, 'EXPENSE', 'Purchase');
    lines.push({
      account_id: purchaseAccount.id,
      description: `Purchase from ${bill.supplier_name}`,
      debit_amount: bill.subtotal,
      credit_amount: 0,
      line_number: 1
    });
    
    // DR: VAT Input (if VAT applicable)
    if (bill.vat_amount > 0) {
      const vatAccount = await getSystemAccount(companyId, 'VAT_INPUT');
      lines.push({
        account_id: vatAccount.id,
        description: `VAT on Purchase`,
        debit_amount: bill.vat_amount,
        credit_amount: 0,
        line_number: 2
      });
    }
    
    // CR: Accounts Payable
    const apAccount = await getSystemAccount(companyId, 'ACCOUNTS_PAYABLE');
    lines.push({
      account_id: apAccount.id,
      description: `Purchase from ${bill.supplier_name}`,
      debit_amount: 0,
      credit_amount: bill.total_amount,
      line_number: 3
    });
    
    const journalEntry = {
      entry_date: bill.bill_date,
      entry_type: 'PURCHASE',
      source_type: 'BILL',
      source_id: bill.id,
      reference: bill.bill_number,
      narration: `Purchase from ${bill.supplier_name}`,
      lines: lines,
      status: 'POSTED'
    };
    
    return await createJournalEntry(companyId, journalEntry, userId);
  } catch (error) {
    console.error('Error posting purchase journal:', error);
    throw error;
  }
}

/**
 * Auto-post journal entry for Payment Received
 */
async function postPaymentReceivedJournal(companyId, payment, userId) {
  try {
    const lines = [];
    
    // DR: Bank Account
    lines.push({
      account_id: payment.bank_account_id,
      description: `Payment from ${payment.customer_name}`,
      debit_amount: payment.amount,
      credit_amount: 0,
      line_number: 1
    });
    
    // CR: Accounts Receivable
    const arAccount = await getSystemAccount(companyId, 'ACCOUNTS_RECEIVABLE');
    lines.push({
      account_id: arAccount.id,
      description: `Payment from ${payment.customer_name}`,
      debit_amount: 0,
      credit_amount: payment.amount,
      line_number: 2
    });
    
    const journalEntry = {
      entry_date: payment.payment_date,
      entry_type: 'RECEIPT',
      source_type: 'PAYMENT',
      source_id: payment.id,
      reference: payment.reference,
      narration: `Payment received from ${payment.customer_name}`,
      lines: lines,
      status: 'POSTED'
    };
    
    return await createJournalEntry(companyId, journalEntry, userId);
  } catch (error) {
    console.error('Error posting payment journal:', error);
    throw error;
  }
}

/**
 * Auto-post journal entry for Payment Made (to supplier)
 */
async function postPaymentMadeJournal(companyId, payment, userId) {
  try {
    const lines = [];
    
    // DR: Accounts Payable
    const apAccount = await getSystemAccount(companyId, 'ACCOUNTS_PAYABLE');
    lines.push({
      account_id: apAccount.id,
      description: `Payment to ${payment.supplier_name}`,
      debit_amount: payment.amount,
      credit_amount: 0,
      line_number: 1
    });
    
    // CR: Bank Account
    lines.push({
      account_id: payment.bank_account_id,
      description: `Payment to ${payment.supplier_name}`,
      debit_amount: 0,
      credit_amount: payment.amount,
      line_number: 2
    });
    
    const journalEntry = {
      entry_date: payment.payment_date,
      entry_type: 'PAYMENT',
      source_type: 'PAYMENT',
      source_id: payment.id,
      reference: payment.reference,
      narration: `Payment made to ${payment.supplier_name}`,
      lines: lines,
      status: 'POSTED'
    };
    
    return await createJournalEntry(companyId, journalEntry, userId);
  } catch (error) {
    console.error('Error posting payment made journal:', error);
    throw error;
  }
}

/**
 * Auto-post journal entry for Expense
 */
async function postExpenseJournal(companyId, expense, userId) {
  try {
    const lines = [];
    
    // DR: Expense Account
    lines.push({
      account_id: expense.expense_account_id,
      description: expense.description,
      debit_amount: expense.subtotal,
      credit_amount: 0,
      line_number: 1
    });
    
    // DR: VAT Input (if VAT applicable)
    if (expense.vat_amount > 0) {
      const vatAccount = await getSystemAccount(companyId, 'VAT_INPUT');
      lines.push({
        account_id: vatAccount.id,
        description: `VAT on ${expense.description}`,
        debit_amount: expense.vat_amount,
        credit_amount: 0,
        line_number: 2
      });
    }
    
    // CR: Bank/Cash/Credit Card
    lines.push({
      account_id: expense.payment_account_id,
      description: expense.description,
      debit_amount: 0,
      credit_amount: expense.total_amount,
      line_number: 3
    });
    
    const journalEntry = {
      entry_date: expense.expense_date,
      entry_type: 'EXPENSE',
      source_type: 'EXPENSE',
      source_id: expense.id,
      reference: expense.reference,
      narration: expense.description,
      lines: lines,
      status: 'POSTED'
    };
    
    return await createJournalEntry(companyId, journalEntry, userId);
  } catch (error) {
    console.error('Error posting expense journal:', error);
    throw error;
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get system default account
 */
async function getSystemAccount(companyId, purpose) {
  try {
    const { data, error } = await supabase
      .from('system_default_accounts')
      .select('account_id, account:chart_of_accounts(*)')
      .eq('company_id', companyId)
      .eq('account_purpose', purpose)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error(`System account not configured: ${purpose}`);
    }
    
    return data.account;
  } catch (error) {
    console.error(`Error fetching system account ${purpose}:`, error);
    throw error;
  }
}

/**
 * Find account by type and name pattern
 */
async function findAccountByType(companyId, accountType, namePattern) {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('account_type_code', accountType)
      .ilike('account_name', `%${namePattern}%`)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error finding account type ${accountType}:`, error);
    throw error;
  }
}

/**
 * Get journal entries for a company
 */
async function getJournalEntries(companyId, filters = {}) {
  try {
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(
          *,
          account:chart_of_accounts(account_code, account_name)
        ),
        creator:profiles!journal_entries_created_by_fkey(name, email)
      `)
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false });
    
    if (filters.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }
    if (filters.entryType) {
      query = query.eq('entry_type', filters.entryType);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    throw error;
  }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
window.journalEngine = {
  validateJournalEntry,
  createJournalEntry,
  postJournalEntry,
  voidJournalEntry,
  getJournalEntries,
  
  // Auto-posting functions
  postSalesJournal,
  postPurchaseJournal,
  postPaymentReceivedJournal,
  postPaymentMadeJournal,
  postExpenseJournal
};

console.log('✅ Journal Engine loaded');
