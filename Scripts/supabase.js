
// scripts/supabase.js - Enhanced ZandeBooks Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xfimvzdadqtlzwvlesrx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW12emRhZHF0bHp3dmxlc3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDM4NTcsImV4cCI6MjA2NTQxOTg1N30.E5saIeM0tF02g-jnMYlU0F5mCRCYM-UFWeHybHgu0y4';

// Initialize Supabase client with enhanced config
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ========================================
// DATABASE HELPERS FOR ZANDEBOOKS
// ========================================

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

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
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

  async updateSubscriptionPlan(companyId, newPlan) {
    const { data, error } = await supabase.rpc('update_subscription_plan', {
      company_uuid: companyId,
      new_plan: newPlan
    })
    
    if (error) throw error
    return data
  },

  // User Management
  async inviteUser(companyId, userData) {
    const currentUser = await this.getCurrentUser()
    const { data, error } = await supabase.rpc('create_user_invitation', {
      company_uuid: companyId,
      user_email: userData.email,
      user_name: userData.full_name,
      user_role: userData.role,
      invited_by_uuid: currentUser.id,
      invitation_msg: userData.message
    })
    
    if (error) throw error
    return data
  },

  async getPendingInvitations(companyId) {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
    
    if (error) throw error
    return data
  },

  async getCompanyUsers(companyId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
    
    if (error) throw error
    return data
  },

  // Company Management
  async getCompanySettings(companyId) {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .single()
    
    if (error) throw error
    return data
  },

  async updateCompanySettings(companyId, settings) {
    const { data, error } = await supabase
      .from('company_settings')
      .upsert({ company_id: companyId, ...settings })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Dashboard Statistics
  async getDashboardStats(companyId) {
    const { data, error } = await supabase.rpc('get_company_dashboard_stats', {
      company_uuid: companyId
    })
    
    if (error) throw error
    return data
  }
}

// ========================================
// AUTHENTICATION HELPERS
// ========================================

export const auth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async requireSubscription() {
    const user = await database.getCurrentUser()
    if (!user) {
      window.location.href = '../login.html'
      return false
    }

    const profile = await database.getUserProfile(user.id)
    if (!profile.company_id) {
      window.location.href = '../Plans.html'
      return false
    }

    const subscription = await database.checkSubscriptionStatus(profile.company_id)
    
    if (!subscription || subscription.subscription_status !== 'active') {
      window.location.href = '../Plans.html'
      return false
    }

    return { user, profile, subscription }
  }
}

// Make available globally
window.supabase = supabase;
window.database = database;
window.auth = auth;

