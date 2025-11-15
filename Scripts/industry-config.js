/**
 * ========================================
 * ZANDE BOOKS - INDUSTRY CONFIGURATION LOADER
 * Loads industry-specific feature configurations
 * ========================================
 */

(function() {
  'use strict';

  const industryConfig = {
    currentIndustry: null,
    features: {},
    isLoaded: false,
    
    /**
     * Load industry configuration for current user
     */
    async loadConfig() {
      try {
        if (!window.supabase) {
          console.error('Supabase client not initialized');
          return false;
        }

        // Get current user's profile
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        if (userError || !user) {
          console.warn('No authenticated user found');
          return false;
        }

        // Get profile with industry type
        const { data: profile, error: profileError } = await window.supabase
          .from('profiles')
          .select('industry_type, business_name, vat_registered')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          return false;
        }

        // Default to GENERAL if no industry set
        this.currentIndustry = profile?.industry_type || 'GENERAL';

        // Load features for this industry
        const { data: features, error: featuresError } = await window.supabase
          .from('industry_features')
          .select('*')
          .in('industry_type', ['ALL', this.currentIndustry])
          .eq('is_enabled', true)
          .order('sort_order');

        if (featuresError) {
          console.error('Error loading industry features:', featuresError);
          return false;
        }

        // Build feature map
        this.features = {};
        features.forEach(feature => {
          // Industry-specific features override ALL features
          if (feature.industry_type !== 'ALL' || !this.features[feature.feature_code]) {
            this.features[feature.feature_code] = {
              enabled: feature.is_enabled,
              required: feature.is_required,
              displayName: feature.display_name,
              icon: feature.menu_icon,
              sortOrder: feature.sort_order
            };
          }
        });

        this.isLoaded = true;
        console.log(`Industry config loaded: ${this.currentIndustry}`, this.features);
        return true;

      } catch (error) {
        console.error('Error loading industry config:', error);
        return false;
      }
    },

    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(featureCode) {
      return this.features[featureCode]?.enabled === true;
    },

    /**
     * Get display name for a feature
     */
    getFeatureDisplayName(featureCode) {
      return this.features[featureCode]?.displayName || featureCode;
    },

    /**
     * Get icon for a feature
     */
    getFeatureIcon(featureCode) {
      return this.features[featureCode]?.icon || '';
    },

    /**
     * Get all enabled features sorted by order
     */
    getEnabledFeatures() {
      return Object.entries(this.features)
        .filter(([code, config]) => config.enabled)
        .sort((a, b) => (a[1].sortOrder || 999) - (b[1].sortOrder || 999))
        .map(([code, config]) => ({
          code,
          ...config
        }));
    },

    /**
     * Get feature configuration
     */
    getFeatureConfig(featureCode) {
      return this.features[featureCode] || null;
    },

    /**
     * Reload configuration (useful after profile update)
     */
    async reload() {
      this.isLoaded = false;
      this.features = {};
      return await this.loadConfig();
    },

    /**
     * Get industry type
     */
    getIndustryType() {
      return this.currentIndustry;
    },

    /**
     * Get industry display name
     */
    getIndustryDisplayName() {
      const industryNames = {
        'SERVICES': 'Services',
        'RETAIL': 'Retail',
        'RESTAURANT': 'Restaurant',
        'MANUFACTURING': 'Manufacturing',
        'CONSTRUCTION': 'Construction',
        'HEALTHCARE': 'Healthcare',
        'LEGAL': 'Legal Services',
        'REALESTATE': 'Real Estate',
        'TRANSPORT': 'Transportation',
        'WHOLESALE': 'Wholesale',
        'ECOMMERCE': 'E-Commerce',
        'NONPROFIT': 'Nonprofit',
        'GENERAL': 'General Business'
      };
      return industryNames[this.currentIndustry] || this.currentIndustry;
    }
  };

  // Export to global scope
  window.industryConfig = industryConfig;

  console.log('Industry config module loaded');
})();
