-- Organizations and User Profiles Schema
-- This manages business/organization setup and user profile data

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    vat_number VARCHAR(20),
    vat_registered BOOLEAN DEFAULT false,
    industry_type VARCHAR(50),
    business_type VARCHAR(50), -- sole_proprietor, partnership, pty_ltd, cc, trust, nonprofit
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    
    -- Financial Settings
    financial_year_end VARCHAR(10), -- Format: MM-DD (e.g., "02-28")
    base_currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry_type);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- =====================================================
-- 2. USER PROFILES TABLE (Enhanced)
-- =====================================================
-- Drop existing profiles table if it exists and recreate with proper structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- User Information
    full_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    
    -- Role and Permissions
    role VARCHAR(50) DEFAULT 'owner', -- owner, admin, accountant, user
    
    -- Quick Access Fields (denormalized for performance)
    industry_type VARCHAR(50),
    business_name VARCHAR(255),
    vat_registered BOOLEAN DEFAULT false,
    
    -- Preferences
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg',
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- 3. ORGANIZATION MEMBERS (Multi-user support)
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    
    -- Permissions
    can_edit_settings BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_approve_transactions BOOLEAN DEFAULT false,
    
    -- Status
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'active', -- pending, active, suspended
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- =====================================================
-- 4. ONBOARDING PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Progress Tracking
    current_step INTEGER DEFAULT 1,
    completed_steps JSONB DEFAULT '[]'::jsonb,
    total_steps INTEGER DEFAULT 6,
    
    -- Data collected during onboarding
    onboarding_data JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_progress(status);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_updated_at ON onboarding_progress;
CREATE TRIGGER update_onboarding_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. AUTO-CREATE PROFILE ON USER SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        created_by = auth.uid() OR
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
CREATE POLICY "Organization owners can update"
    ON organizations FOR UPDATE
    USING (
        created_by = auth.uid() OR
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'admin')
        )
    );

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Organization Members Policies
DROP POLICY IF EXISTS "Members can view their memberships" ON organization_members;
CREATE POLICY "Members can view their memberships"
    ON organization_members FOR SELECT
    USING (user_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
CREATE POLICY "Admins can manage members"
    ON organization_members FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'admin')
        )
    );

-- Onboarding Progress Policies
DROP POLICY IF EXISTS "Users can manage own onboarding" ON onboarding_progress;
CREATE POLICY "Users can manage own onboarding"
    ON onboarding_progress FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(
    p_user_id UUID,
    p_organization_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_result JSONB;
BEGIN
    -- Create organization
    INSERT INTO organizations (
        name,
        legal_name,
        registration_number,
        vat_number,
        vat_registered,
        industry_type,
        business_type,
        email,
        phone,
        address,
        financial_year_end,
        created_by,
        onboarding_completed
    ) VALUES (
        p_organization_data->>'businessName',
        p_organization_data->>'businessName',
        p_organization_data->>'registrationNumber',
        p_organization_data->>'vatNumber',
        (p_organization_data->>'vatRegistered')::boolean,
        p_organization_data->>'industry',
        p_organization_data->>'businessType',
        p_organization_data->>'email',
        p_organization_data->>'phone',
        p_organization_data->>'address',
        p_organization_data->>'yearEnd',
        p_user_id,
        true
    ) RETURNING id INTO v_org_id;
    
    -- Update profile with organization data
    UPDATE profiles SET
        organization_id = v_org_id,
        business_name = p_organization_data->>'businessName',
        industry_type = p_organization_data->>'industry',
        vat_registered = (p_organization_data->>'vatRegistered')::boolean,
        onboarding_completed = true,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create organization member record
    INSERT INTO organization_members (
        organization_id,
        user_id,
        role,
        can_edit_settings,
        can_manage_users,
        can_approve_transactions,
        status,
        joined_at
    ) VALUES (
        v_org_id,
        p_user_id,
        'owner',
        true,
        true,
        true,
        'active',
        NOW()
    );
    
    -- Update onboarding progress
    UPDATE onboarding_progress SET
        organization_id = v_org_id,
        status = 'completed',
        completed_at = NOW(),
        onboarding_data = p_organization_data
    WHERE user_id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'message', 'Onboarding completed successfully'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE organizations IS 'Stores business/organization information';
COMMENT ON TABLE profiles IS 'User profile data with quick-access fields';
COMMENT ON TABLE organization_members IS 'Multi-user organization membership';
COMMENT ON TABLE onboarding_progress IS 'Tracks user onboarding progress';
