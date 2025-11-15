-- Bank Transactions and Connections Schema
-- Manages bank account connections and imported transactions

-- =====================================================
-- 1. BANK CONNECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Bank Information
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(50), -- For SA banks: FNB, ABSA, etc.
    account_name VARCHAR(255),
    account_number VARCHAR(50), -- Last 4 digits only for security
    account_type VARCHAR(50), -- checking, savings, credit_card
    
    -- Connection Details
    connection_type VARCHAR(50) DEFAULT 'manual', -- manual, api, plaid, yodlee
    connection_status VARCHAR(50) DEFAULT 'active', -- active, inactive, error
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- Default Account Mapping
    default_gl_account_id UUID REFERENCES chart_of_accounts(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_bank_conn_org ON bank_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_conn_status ON bank_connections(connection_status);

-- =====================================================
-- 2. BANK TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
    
    -- Transaction Details
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR(255), -- Bank reference number
    
    -- Amounts
    amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2), -- Running balance after transaction
    
    -- Categorization
    category VARCHAR(100),
    transaction_type VARCHAR(50), -- income, expense, transfer
    is_reconciled BOOLEAN DEFAULT false,
    
    -- GL Posting
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    gl_account_id UUID REFERENCES chart_of_accounts(id),
    
    -- Matching & Reconciliation
    matched_customer_id UUID REFERENCES customers(id),
    matched_invoice_id VARCHAR(50), -- Will link to invoices when that module is built
    matched_bill_id VARCHAR(50), -- Will link to bills when that module is built
    
    -- Import Information
    import_batch_id UUID,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by UUID REFERENCES auth.users(id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, categorized, posted, ignored
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(bank_connection_id, transaction_date, description, amount)
);

CREATE INDEX IF NOT EXISTS idx_bank_trans_org ON bank_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_trans_connection ON bank_transactions(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_trans_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_trans_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_trans_batch ON bank_transactions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_trans_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_trans_customer ON bank_transactions(matched_customer_id);

-- =====================================================
-- 3. IMPORT BATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
    
    -- Batch Information
    file_name VARCHAR(255),
    file_type VARCHAR(50), -- csv, txt, ofx
    total_transactions INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    duplicate_transactions INTEGER DEFAULT 0,
    
    -- Date Range
    date_from DATE,
    date_to DATE,
    
    -- Processing
    status VARCHAR(50) DEFAULT 'processing', -- processing, completed, failed
    error_message TEXT,
    
    -- Auto-categorization Stats
    auto_categorized INTEGER DEFAULT 0,
    manual_review_needed INTEGER DEFAULT 0,
    
    -- Metadata
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_batches_org ON import_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_date ON import_batches(imported_at);

-- =====================================================
-- 4. CATEGORIZATION RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule Definition
    rule_name VARCHAR(255) NOT NULL,
    keywords TEXT[], -- Array of keywords to match
    description_pattern VARCHAR(500), -- Regex pattern for matching
    
    -- Actions
    category VARCHAR(100) NOT NULL,
    gl_account_id UUID REFERENCES chart_of_accounts(id),
    transaction_type VARCHAR(50), -- income, expense
    
    -- Conditions
    amount_min DECIMAL(15, 2),
    amount_max DECIMAL(15, 2),
    
    -- Customer Matching
    auto_match_customer BOOLEAN DEFAULT false,
    matched_customer_id UUID REFERENCES customers(id),
    
    -- Rule Priority & Status
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    is_active BOOLEAN DEFAULT true,
    times_applied INTEGER DEFAULT 0,
    
    -- Learning
    confidence_score DECIMAL(3, 2) DEFAULT 1.00, -- 0.00 to 1.00
    last_applied_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cat_rules_org ON categorization_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_cat_rules_active ON categorization_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_cat_rules_priority ON categorization_rules(priority DESC);

-- =====================================================
-- 5. BANK RECONCILIATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    
    -- Reconciliation Period
    reconciliation_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Balances
    opening_balance DECIMAL(15, 2) NOT NULL,
    closing_balance DECIMAL(15, 2) NOT NULL,
    statement_balance DECIMAL(15, 2) NOT NULL,
    
    -- Reconciliation Status
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, balanced, unbalanced, approved
    difference DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Transactions
    total_deposits DECIMAL(15, 2) DEFAULT 0.00,
    total_withdrawals DECIMAL(15, 2) DEFAULT 0.00,
    reconciled_transactions INTEGER DEFAULT 0,
    unreconciled_transactions INTEGER DEFAULT 0,
    
    -- Approval
    reconciled_by UUID REFERENCES auth.users(id),
    reconciled_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_org ON bank_reconciliations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_connection ON bank_reconciliations(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON bank_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_bank_recon_date ON bank_reconciliations(reconciliation_date);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_bank_connections_updated_at ON bank_connections;
CREATE TRIGGER update_bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cat_rules_updated_at ON categorization_rules;
CREATE TRIGGER update_cat_rules_updated_at
    BEFORE UPDATE ON categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_recon_updated_at ON bank_reconciliations;
CREATE TRIGGER update_bank_recon_updated_at
    BEFORE UPDATE ON bank_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- Bank Connections Policies
DROP POLICY IF EXISTS "Users can view their org bank connections" ON bank_connections;
CREATE POLICY "Users can view their org bank connections"
    ON bank_connections FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their org bank connections" ON bank_connections;
CREATE POLICY "Users can manage their org bank connections"
    ON bank_connections FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Bank Transactions Policies
DROP POLICY IF EXISTS "Users can view their org transactions" ON bank_transactions;
CREATE POLICY "Users can view their org transactions"
    ON bank_transactions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their org transactions" ON bank_transactions;
CREATE POLICY "Users can manage their org transactions"
    ON bank_transactions FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Import Batches Policies
DROP POLICY IF EXISTS "Users can view their org import batches" ON import_batches;
CREATE POLICY "Users can view their org import batches"
    ON import_batches FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their org import batches" ON import_batches;
CREATE POLICY "Users can manage their org import batches"
    ON import_batches FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Categorization Rules Policies (similar pattern)
DROP POLICY IF EXISTS "Users can manage their org cat rules" ON categorization_rules;
CREATE POLICY "Users can manage their org cat rules"
    ON categorization_rules FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Bank Reconciliations Policies (similar pattern)
DROP POLICY IF EXISTS "Users can manage their org reconciliations" ON bank_reconciliations;
CREATE POLICY "Users can manage their org reconciliations"
    ON bank_reconciliations FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to import bank transactions
CREATE OR REPLACE FUNCTION import_bank_transactions(
    p_organization_id UUID,
    p_bank_connection_id UUID,
    p_transactions JSONB,
    p_file_name VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
    v_batch_id UUID;
    v_transaction JSONB;
    v_successful INTEGER := 0;
    v_failed INTEGER := 0;
    v_duplicates INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Create import batch
    INSERT INTO import_batches (
        organization_id,
        bank_connection_id,
        file_name,
        file_type,
        total_transactions,
        status
    ) VALUES (
        p_organization_id,
        p_bank_connection_id,
        p_file_name,
        'csv',
        jsonb_array_length(p_transactions),
        'processing'
    ) RETURNING id INTO v_batch_id;
    
    -- Process each transaction
    FOR v_transaction IN SELECT * FROM jsonb_array_elements(p_transactions)
    LOOP
        BEGIN
            INSERT INTO bank_transactions (
                organization_id,
                bank_connection_id,
                transaction_date,
                description,
                amount,
                balance,
                category,
                transaction_type,
                import_batch_id,
                status
            ) VALUES (
                p_organization_id,
                p_bank_connection_id,
                (v_transaction->>'date')::DATE,
                v_transaction->>'description',
                (v_transaction->>'amount')::DECIMAL,
                (v_transaction->>'balance')::DECIMAL,
                v_transaction->>'category',
                v_transaction->>'type',
                v_batch_id,
                'categorized'
            );
            
            v_successful := v_successful + 1;
            
        EXCEPTION
            WHEN unique_violation THEN
                v_duplicates := v_duplicates + 1;
            WHEN OTHERS THEN
                v_failed := v_failed + 1;
        END;
    END LOOP;
    
    -- Update batch status
    UPDATE import_batches SET
        successful_imports = v_successful,
        failed_imports = v_failed,
        duplicate_transactions = v_duplicates,
        status = 'completed',
        completed_at = NOW()
    WHERE id = v_batch_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'total', jsonb_array_length(p_transactions),
        'successful', v_successful,
        'failed', v_failed,
        'duplicates', v_duplicates
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE bank_connections IS 'Stores bank account connection information';
COMMENT ON TABLE bank_transactions IS 'Imported bank transactions with smart categorization';
COMMENT ON TABLE import_batches IS 'Tracks CSV import batches';
COMMENT ON TABLE categorization_rules IS 'Smart rules for auto-categorizing transactions';
COMMENT ON TABLE bank_reconciliations IS 'Bank statement reconciliation records';
