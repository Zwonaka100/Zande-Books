// Bank Connection with Smart CSV Parsing
let selectedBank = null;
let parsedTransactions = [];
let supabase = null;

// Bank statement format configurations
const BANK_FORMATS = {
    fnb: {
        name: 'First National Bank',
        dateFormat: 'YYYY/MM/DD',
        columns: ['Date', 'Description', 'Amount', 'Balance'],
        skipRows: 5,
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2
    },
    standard: {
        name: 'Standard Bank',
        dateFormat: 'DD/MM/YYYY',
        columns: ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
        skipRows: 3,
        dateColumn: 0,
        descriptionColumn: 1,
        debitColumn: 2,
        creditColumn: 3
    },
    absa: {
        name: 'ABSA Bank',
        dateFormat: 'DD MMM YYYY',
        columns: ['Date', 'Description', 'Amount', 'Balance'],
        skipRows: 4,
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2
    },
    nedbank: {
        name: 'Nedbank',
        dateFormat: 'DD/MM/YYYY',
        columns: ['Date', 'Description', 'Amount', 'Balance'],
        skipRows: 3,
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2
    },
    capitec: {
        name: 'Capitec Bank',
        dateFormat: 'DD-MM-YYYY',
        columns: ['Date', 'Description', 'Amount', 'Balance'],
        skipRows: 1,
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2
    },
    generic: {
        name: 'Generic Bank',
        dateFormat: 'auto',
        columns: ['Date', 'Description', 'Amount'],
        skipRows: 0
    }
};

// Smart categorization rules
const CATEGORIZATION_RULES = {
    income: [
        { keywords: ['salary', 'wage', 'payroll', 'income', 'payment received'], category: 'Salary & Wages' },
        { keywords: ['invoice', 'payment from', 'client payment', 'professional fees'], category: 'Professional Fees' },
        { keywords: ['sales', 'revenue', 'customer payment'], category: 'Sales Revenue' },
        { keywords: ['interest', 'dividend'], category: 'Investment Income' },
        { keywords: ['refund', 'reimbursement'], category: 'Refunds' }
    ],
    expenses: [
        { keywords: ['rent', 'lease'], category: 'Rent' },
        { keywords: ['electricity', 'water', 'utilities', 'municipal'], category: 'Utilities' },
        { keywords: ['sars', 'tax', 'vat payment'], category: 'Tax Payments' },
        { keywords: ['fuel', 'petrol', 'diesel', 'engen', 'shell', 'bp', 'caltex'], category: 'Fuel & Vehicle' },
        { keywords: ['internet', 'vodacom', 'mtn', 'telkom', 'cell c', 'airtime'], category: 'Telephone & Internet' },
        { keywords: ['stationery', 'office supplies', 'takealot'], category: 'Office Supplies' },
        { keywords: ['insurance', 'premiums'], category: 'Insurance' },
        { keywords: ['bank charges', 'service fee', 'transaction fee'], category: 'Bank Charges' },
        { keywords: ['salary payment', 'wages paid', 'payroll'], category: 'Salaries & Wages' },
        { keywords: ['grocery', 'checkers', 'woolworths', 'pick n pay', 'spar', 'makro'], category: 'Groceries' },
        { keywords: ['restaurant', 'food', 'nandos', 'steers', 'kfc', 'mcdonalds'], category: 'Meals & Entertainment' },
        { keywords: ['advertising', 'marketing', 'google ads', 'facebook ads'], category: 'Advertising' },
        { keywords: ['software', 'subscription', 'saas', 'microsoft', 'adobe'], category: 'Software & Subscriptions' },
        { keywords: ['medical', 'pharmacy', 'clicks', 'dischem', 'doctor'], category: 'Medical Expenses' },
        { keywords: ['travel', 'hotel', 'accommodation', 'flight'], category: 'Travel' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
    setupEventListeners();
    setupBankSearch();
});

function initializeSupabase() {
    const SUPABASE_URL = 'https://xfimvzdadqtlzwvlesrx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW12emRhZHF0bHp3dmxlc3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NzU2OTEsImV4cCI6MjA0NzE1MTY5MX0.YNvXE8Xm7YcJvN1HFAMmfYTyxVcHg67lqiqKaOETiKo';
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    });

    // File input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileUpload(file);
    });
}

function setupBankSearch() {
    const searchInput = document.getElementById('bankSearch');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const bankCards = document.querySelectorAll('.bank-card');
        
        bankCards.forEach(card => {
            const bankName = card.querySelector('.bank-name').textContent.toLowerCase();
            if (bankName.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function selectBank(bankId) {
    selectedBank = bankId;
    showScreen('uploadScreen');
    
    const bankName = BANK_FORMATS[bankId]?.name || BANK_FORMATS[bankId] || 'your bank';
    document.getElementById('selectedBankName').textContent = bankName;
    document.getElementById('bankInstructionName').textContent = bankName;
    
    loadBankInstructions(bankId);
}

function loadBankInstructions(bankId) {
    const instructionsMap = {
        fnb: [
            'Log in to FNB Online Banking',
            'Go to "My Accounts" and select your account',
            'Click "Download Statements"',
            'Select date range and choose "CSV" format',
            'Download and upload the file here'
        ],
        standard: [
            'Log in to Standard Bank Online',
            'Navigate to "Accounts" > "Statements"',
            'Select your account and date range',
            'Click "Export" and choose "CSV"',
            'Save the file and upload it here'
        ],
        capitec: [
            'Open Capitec App or Online Banking',
            'Go to "Transact" > "Statements"',
            'Select date range (last 3 months recommended)',
            'Choose "Download as CSV"',
            'Upload the downloaded file'
        ],
        default: [
            'Log in to your online banking',
            'Navigate to account statements',
            'Select a date range (last 1-3 months)',
            'Download statement in CSV format',
            'Upload the CSV file here'
        ]
    };
    
    const steps = instructionsMap[bankId] || instructionsMap.default;
    const container = document.getElementById('instructionSteps');
    
    container.innerHTML = steps.map((step, index) => `
        <div class="instruction-step">
            <div class="step-number">${index + 1}</div>
            <div class="step-text">${step}</div>
        </div>
    `).join('');
}

async function handleFileUpload(file) {
    if (!file) return;
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        alert('Please upload a CSV or TXT file');
        return;
    }
    
    showScreen('processingScreen');
    
    try {
        const content = await readFileContent(file);
        const transactions = parseCSV(content, selectedBank);
        
        if (transactions.length === 0) {
            throw new Error('No transactions found in file');
        }
        
        // Categorize transactions
        parsedTransactions = transactions.map(categorizeTransaction);
        
        // Animate processing stats
        animateProcessingStats(parsedTransactions);
        
        // Wait a bit for effect, then show review
        setTimeout(() => {
            showReviewScreen(parsedTransactions);
        }, 2000);
        
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file: ' + error.message);
        backToUpload();
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function parseCSV(content, bankId) {
    const lines = content.split('\n').filter(line => line.trim());
    const format = BANK_FORMATS[bankId] || BANK_FORMATS.generic;
    
    // Skip header rows
    const dataLines = lines.slice(format.skipRows);
    
    const transactions = [];
    
    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const columns = parseCSVLine(line);
        
        if (columns.length < 3) continue;
        
        try {
            const transaction = extractTransaction(columns, format);
            if (transaction && transaction.amount !== 0) {
                transactions.push(transaction);
            }
        } catch (error) {
            console.warn('Error parsing line:', line, error);
        }
    }
    
    return transactions;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function extractTransaction(columns, format) {
    // Auto-detect columns if generic format
    if (format === BANK_FORMATS.generic) {
        return autoDetectTransaction(columns);
    }
    
    const dateCol = format.dateColumn || 0;
    const descCol = format.descriptionColumn || 1;
    
    let amount = 0;
    
    if (format.amountColumn !== undefined) {
        amount = parseAmount(columns[format.amountColumn]);
    } else if (format.debitColumn !== undefined && format.creditColumn !== undefined) {
        const debit = parseAmount(columns[format.debitColumn]);
        const credit = parseAmount(columns[format.creditColumn]);
        amount = credit - debit;
    }
    
    return {
        date: parseDate(columns[dateCol]),
        description: columns[descCol].replace(/"/g, '').trim(),
        amount: amount,
        balance: columns[format.balanceColumn] ? parseAmount(columns[format.balanceColumn]) : null
    };
}

function autoDetectTransaction(columns) {
    // Simple auto-detection logic
    let dateCol = -1, descCol = -1, amountCol = -1;
    
    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        
        // Check if date
        if (dateCol === -1 && /\d{2,4}[-/]\d{1,2}[-/]\d{2,4}/.test(col)) {
            dateCol = i;
        }
        // Check if amount
        else if (amountCol === -1 && /^-?\d+\.?\d*$/.test(col.replace(/[,\s]/g, ''))) {
            amountCol = i;
        }
        // Description is usually the longest text field
        else if (descCol === -1 && col.length > 10) {
            descCol = i;
        }
    }
    
    if (dateCol === -1 || amountCol === -1 || descCol === -1) {
        return null;
    }
    
    return {
        date: parseDate(columns[dateCol]),
        description: columns[descCol].trim(),
        amount: parseAmount(columns[amountCol])
    };
}

function parseDate(dateStr) {
    // Try various date formats
    dateStr = dateStr.replace(/"/g, '').trim();
    
    // YYYY/MM/DD or YYYY-MM-DD
    let match = dateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
        return new Date(match[1], match[2] - 1, match[3]);
    }
    
    // DD/MM/YYYY or DD-MM-YYYY
    match = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (match) {
        return new Date(match[3], match[2] - 1, match[1]);
    }
    
    // Fallback
    return new Date(dateStr);
}

function parseAmount(amountStr) {
    if (!amountStr) return 0;
    
    // Remove quotes, spaces, and currency symbols
    const cleaned = amountStr.replace(/["'\s,R]/g, '').trim();
    const amount = parseFloat(cleaned);
    
    return isNaN(amount) ? 0 : amount;
}

function categorizeTransaction(transaction) {
    const description = transaction.description.toLowerCase();
    const isIncome = transaction.amount > 0;
    
    let category = 'Uncategorized';
    let accountCode = '1000'; // Default: Bank Account
    
    const rules = isIncome ? CATEGORIZATION_RULES.income : CATEGORIZATION_RULES.expenses;
    
    for (const rule of rules) {
        if (rule.keywords.some(keyword => description.includes(keyword))) {
            category = rule.category;
            break;
        }
    }
    
    return {
        ...transaction,
        category: category,
        type: isIncome ? 'income' : 'expense',
        accountCode: accountCode
    };
}

function animateProcessingStats(transactions) {
    const totalTransactions = transactions.length;
    const categorized = transactions.filter(t => t.category !== 'Uncategorized').length;
    const timeSaved = (totalTransactions * 0.05).toFixed(1); // 3 minutes per transaction
    
    animateNumber('transactionsFound', 0, totalTransactions, 1000);
    animateNumber('transactionsCategorized', 0, categorized, 1200);
    
    setTimeout(() => {
        document.getElementById('timesSaved').textContent = `${timeSaved} hrs`;
    }, 1400);
}

function animateNumber(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

function showReviewScreen(transactions) {
    showScreen('reviewScreen');
    
    // Calculate totals
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netCashFlow = income - expenses;
    
    document.getElementById('reviewCount').textContent = transactions.length;
    document.getElementById('confirmCount').textContent = transactions.length;
    document.getElementById('totalIncome').textContent = `R ${income.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    document.getElementById('totalExpenses').textContent = `R ${expenses.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    document.getElementById('netCashFlow').textContent = `R ${netCashFlow.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    
    // Populate table
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = transactions.slice(0, 50).map(t => `
        <tr>
            <td>${t.date.toLocaleDateString('en-ZA')}</td>
            <td>${t.description}</td>
            <td><span class="category-badge">${t.category}</span></td>
            <td class="${t.amount > 0 ? 'amount-positive' : 'amount-negative'}">
                ${t.amount > 0 ? '+' : ''}R ${Math.abs(t.amount).toFixed(2)}
            </td>
            <td>Business Bank Account</td>
        </tr>
    `).join('');
}

async function confirmTransactions() {
    showScreen('processingScreen');
    document.getElementById('processingStatus').textContent = 'Saving transactions to your account...';
    
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            throw new Error('No authenticated user');
        }
        
        // Get user's organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        
        if (!profile?.organization_id) {
            throw new Error('No organization found');
        }
        
        // Create or get bank connection
        let bankConnectionId = await getOrCreateBankConnection(profile.organization_id, selectedBank);
        
        // Prepare transactions for import
        const transactionsData = parsedTransactions.map(t => ({
            date: t.date.toISOString().split('T')[0],
            description: t.description,
            amount: t.amount,
            balance: t.balance,
            category: t.category,
            type: t.type
        }));
        
        // Call import function
        const { data: result, error } = await supabase
            .rpc('import_bank_transactions', {
                p_organization_id: profile.organization_id,
                p_bank_connection_id: bankConnectionId,
                p_transactions: transactionsData,
                p_file_name: 'bank_statement.csv'
            });
        
        if (error) {
            console.error('Import error:', error);
            throw error;
        }
        
        console.log('Import successful:', result);
        showSuccessScreen(parsedTransactions);
        
    } catch (error) {
        console.error('Error saving transactions:', error);
        alert('Error saving transactions: ' + error.message);
        showReviewScreen(parsedTransactions);
    }
}

async function getOrCreateBankConnection(organizationId, bankId) {
    const bankName = BANK_FORMATS[bankId]?.name || 'Unknown Bank';
    
    // Check if connection exists
    const { data: existing } = await supabase
        .from('bank_connections')
        .select('id, default_gl_account_id')
        .eq('organization_id', organizationId)
        .eq('bank_code', bankId)
        .single();
    
    if (existing) {
        return existing.id;
    }
    
    // Create bank account in Chart of Accounts first
    const glAccountId = await createBankAccountInCOA(organizationId, bankName);
    
    // Create new connection
    const { data: newConnection, error } = await supabase
        .from('bank_connections')
        .insert([{
            organization_id: organizationId,
            bank_name: bankName,
            bank_code: bankId,
            connection_type: 'manual',
            connection_status: 'active',
            default_gl_account_id: glAccountId
        }])
        .select()
        .single();
    
    if (error) {
        throw error;
    }
    
    return newConnection.id;
}

async function createBankAccountInCOA(organizationId, bankName) {
    // Check if bank account already exists
    const { data: existingAccount } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('account_name', `${bankName} - Current Account`)
        .single();
    
    if (existingAccount) {
        return existingAccount.id;
    }
    
    // Get the Bank account type
    const { data: bankAccountType } = await supabase
        .from('account_types')
        .select('id')
        .eq('name', 'Bank')
        .single();
    
    if (!bankAccountType) {
        throw new Error('Bank account type not found in system');
    }
    
    // Create bank account in COA
    const { data: newAccount, error } = await supabase
        .from('chart_of_accounts')
        .insert([{
            organization_id: organizationId,
            account_type_id: bankAccountType.id,
            account_code: '1000', // Bank accounts typically start at 1000
            account_name: `${bankName} - Current Account`,
            description: `Bank account for ${bankName}`,
            is_active: true,
            normal_balance: 'debit'
        }])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating bank account in COA:', error);
        throw error;
    }
    
    console.log('Created bank account in COA:', newAccount);
    return newAccount.id;
}

function showSuccessScreen(transactions) {
    showScreen('successScreen');
    
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const timeSaved = (transactions.length * 0.05).toFixed(1);
    
    document.getElementById('successIncome').textContent = `R ${income.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    document.getElementById('successExpenses').textContent = `R ${expenses.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
    document.getElementById('successCount').textContent = transactions.length;
    document.getElementById('finalTimeSaved').textContent = `${timeSaved} hours`;
}

// Navigation functions
function showScreen(screenId) {
    document.querySelectorAll('.bank-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function backToSelection() {
    showScreen('bankSelectionScreen');
    selectedBank = null;
}

function backToUpload() {
    showScreen('uploadScreen');
}

function skipBankConnection() {
    if (confirm('Skip bank connection? You can always connect your bank later from settings.')) {
        goToDashboard();
    }
}

function uploadAnother() {
    document.getElementById('fileInput').value = '';
    backToUpload();
}

function goToDashboard() {
    window.location.href = 'app.html';
}
