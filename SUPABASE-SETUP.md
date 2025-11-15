# SUPABASE INTEGRATION GUIDE
# How to Connect Your Existing Supabase to ZandeBooks

This guide will help you integrate the new user management system with your existing Supabase project.

## 🚀 Quick Setup Options

### Option 1: Supabase Dashboard (Easiest)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Open your ZandeBooks project
3. Go to SQL Editor
4. Copy and paste the migration scripts from this folder
5. Run them one by one

### Option 2: Supabase CLI (Recommended for Production)
```bash
# Install Supabase CLI (choose one method):

# Method 1: Using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Method 2: Using npm (local project)
npm install supabase --save-dev
npx supabase --version

# Method 3: Download binary from GitHub
# https://github.com/supabase/cli/releases
```

### Option 3: Direct SQL Execution (Manual)
Use your preferred PostgreSQL client to connect and run the migrations.

## 📁 Migration Files to Run (In Order)

1. **user-management-schema.sql** - Enhanced user & subscription management
2. **rls-policies.sql** - Row Level Security policies  
3. **functions.sql** - PostgreSQL functions for business logic
4. **seed-data.sql** - Sample data for testing

## 🔧 Environment Setup

### 1. Update Your Project Environment Variables

Create/update your `.env` file:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
APP_NAME=ZandeBooks
APP_VERSION=2.0.0
ENVIRONMENT=production

# Subscription Plans
STARTER_PLAN_PRICE_ID=price_starter_monthly
BUSINESS_PLAN_PRICE_ID=price_business_monthly  
PRO_PLAN_PRICE_ID=price_pro_monthly
```

### 2. Update Your Supabase JavaScript Configuration

File: `scripts/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database helpers
export const database = {
  // Users & Authentication
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Subscription Management
  async checkSubscriptionStatus(companyId) {
    const { data, error } = await supabase
      .from('companies')
      .select('subscription_plan, subscription_status, subscription_expires_at, max_users')
      .eq('id', companyId)
      .single()
    
    if (error) throw error
    return data
  },

  // User Management
  async inviteUser(companyId, userData) {
    const { data, error } = await supabase.rpc('create_user_invitation', {
      company_uuid: companyId,
      user_email: userData.email,
      user_name: userData.full_name,
      user_role: userData.role,
      invited_by_uuid: (await this.getCurrentUser()).id,
      invitation_msg: userData.message
    })
    
    if (error) throw error
    return data
  },

  // Company Management
  async updateCompanySubscription(companyId, newPlan) {
    const { data, error } = await supabase.rpc('update_subscription_plan', {
      company_uuid: companyId,
      new_plan: newPlan
    })
    
    if (error) throw error
    return data
  }
}
```

## 🗄️ Database Migration Steps

### Step 1: Backup Your Current Data
```sql
-- Create backup of existing tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE companies_backup AS SELECT * FROM companies;
-- Add other important tables as needed
```

### Step 2: Run Migration Scripts

Execute each SQL file in your Supabase SQL Editor:

1. **user-management-schema.sql** - Adds new columns and tables
2. **rls-policies.sql** - Sets up security policies
3. **functions.sql** - Adds business logic functions

### Step 3: Verify Data Integrity
```sql
-- Check that existing data is preserved
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM companies;

-- Verify new columns exist
\d users
\d companies
```

## 🔐 Authentication Flow Update

### New Authentication Logic:
1. User signs up/logs in through marketing site
2. System checks subscription status
3. If subscribed → redirect to app
4. If not subscribed → redirect to plans page
5. App checks subscription on every load

### Implementation:
```javascript
// In your auth.js
export async function requireSubscription() {
  const user = await database.getCurrentUser()
  if (!user) {
    window.location.href = '../login.html'
    return false
  }

  const profile = await database.getUserProfile(user.id)
  const subscription = await database.checkSubscriptionStatus(profile.company_id)
  
  if (!subscription || subscription.subscription_status !== 'active') {
    window.location.href = '../Plans.html'
    return false
  }

  return true
}
```

## 📋 Testing Checklist

After migration, test these features:

- [ ] User can log in and access app
- [ ] Business name shows in top right
- [ ] Subscription status displays correctly
- [ ] User invitation system works
- [ ] Role-based permissions work
- [ ] Profile settings can be updated
- [ ] Non-subscribers are redirected to plans page

## 🆘 Troubleshooting

### Common Issues:

1. **Migration fails**: Check for existing column conflicts
2. **RLS blocks queries**: Verify user authentication
3. **Functions don't work**: Check PostgreSQL version compatibility
4. **Auth redirects fail**: Verify environment variables

### Need Help?
- Check Supabase logs in Dashboard > Logs
- Test queries in SQL Editor first
- Use browser dev tools to debug JavaScript errors

## 🚀 Next Steps

After successful migration:
1. Update marketing site to integrate with new auth flow
2. Set up payment webhooks for subscription management
3. Configure email templates for user invitations
4. Set up monitoring and analytics
5. Deploy to production

---

Would you like me to help you with any specific step?