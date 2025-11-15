// scripts/auth.js
// Using globally available supabase from window.supabase
// import { supabase } from './supabase.js'; // Commented out - using global supabase instead

async function isFeatureAllowed(featureName) {
  const supabase = window.supabase;
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // 2. Get their profile
  // Corrected column name from trial_ends to trial_ends_at based on typical Supabase profile table structure
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_trial, trial_ends_at, plan') 
    .eq('id', user.id)
    .single();

  if (error) {
    console.error("Error fetching user profile for feature access:", error.message);
    return false;
  }

  // 3. Check access
  // Ensure trial_ends_at is a valid Date object for comparison
  if (profile.is_trial && profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
    return true; // Full access during trial period
  }
  
  // After trial, check based on plan
  switch(featureName) {
    case 'advanced_reports':
      return profile.plan === 'business' || profile.plan === 'pro';
    case 'payroll':
      return profile.plan === 'pro';
    default:
      // Basic features are allowed for all paying users (or after trial ends if no specific plan)
      // If `profile.plan` is null/undefined after trial, you might want to default to `false` or redirect
      // For now, assuming basic features are always allowed for valid profiles.
      return true; 
  }
}

// Export to window for global access
window.isFeatureAllowed = isFeatureAllowed;
