/**
 * ========================================
 * ZANDE BOOKS - INDUSTRY UI ADAPTER
 * Dynamically shows/hides features based on industry
 * ========================================
 */

(function() {
  'use strict';

  const industryUI = {
    /**
     * Apply industry-specific UI adaptations
     */
    async applyAdaptations() {
      try {
        // Ensure config is loaded
        if (!window.industryConfig?.isLoaded) {
          console.warn('Industry config not loaded, loading now...');
          await window.industryConfig.loadConfig();
        }

        if (!window.industryConfig.isLoaded) {
          console.error('Failed to load industry config');
          return false;
        }

        console.log('Applying industry UI adaptations...');

        // Apply sidebar adaptations
        this.adaptSidebar();

        // Apply section visibility
        this.adaptSections();

        // Apply terminology changes
        this.adaptTerminology();

        // Apply form field adaptations
        this.adaptFormFields();

        console.log('Industry UI adaptations applied successfully');
        return true;

      } catch (error) {
        console.error('Error applying industry adaptations:', error);
        return false;
      }
    },

    /**
     * Adapt sidebar menu items
     */
    adaptSidebar() {
      const sidebar = document.querySelector('.sidebar-menu');
      if (!sidebar) {
        console.warn('Sidebar not found');
        return;
      }

      // Find all menu items with data-feature attribute
      const menuItems = sidebar.querySelectorAll('[data-feature]');
      
      menuItems.forEach(item => {
        const featureCode = item.getAttribute('data-feature');
        const config = window.industryConfig.getFeatureConfig(featureCode);

        if (!config || !config.enabled) {
          // Hide disabled features
          item.style.display = 'none';
          item.classList.add('feature-hidden');
        } else {
          // Show enabled features
          item.style.display = '';
          item.classList.remove('feature-hidden');

          // Update display name if different
          if (config.displayName) {
            const textElement = item.querySelector('.menu-text');
            if (textElement) {
              textElement.textContent = config.displayName;
            }
          }

          // Update icon if provided
          if (config.icon) {
            const iconElement = item.querySelector('.menu-icon');
            if (iconElement) {
              iconElement.textContent = config.icon;
            }
          }
        }
      });

      console.log('Sidebar adapted');
    },

    /**
     * Adapt main content sections
     */
    adaptSections() {
      const sections = document.querySelectorAll('.content-section[data-feature]');
      
      sections.forEach(section => {
        const featureCode = section.getAttribute('data-feature');
        const config = window.industryConfig.getFeatureConfig(featureCode);

        if (!config || !config.enabled) {
          section.style.display = 'none';
          section.classList.add('feature-hidden');
        } else {
          // Section visibility is managed by navigation, just ensure it's not force-hidden
          section.classList.remove('feature-hidden');
        }
      });

      console.log('Sections adapted');
    },

    /**
     * Adapt terminology throughout the app
     */
    adaptTerminology() {
      // Map of feature codes to CSS class selectors
      const terminologyMap = {
        'customers': ['.customer-label', '[data-terminology="customers"]'],
        'suppliers': ['.supplier-label', '[data-terminology="suppliers"]'],
        'products': ['.product-label', '[data-terminology="products"]'],
        'sales': ['.sales-label', '[data-terminology="sales"]'],
        'purchases': ['.purchase-label', '[data-terminology="purchases"]']
      };

      // Update all terminology elements
      Object.entries(terminologyMap).forEach(([featureCode, selectors]) => {
        const config = window.industryConfig.getFeatureConfig(featureCode);
        if (config && config.displayName) {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              // Replace text content (for labels)
              if (element.tagName === 'LABEL' || element.classList.contains('label')) {
                element.textContent = config.displayName;
              }
              // Update placeholder (for inputs)
              if (element.tagName === 'INPUT' && element.placeholder) {
                element.placeholder = element.placeholder.replace(
                  new RegExp(featureCode, 'gi'),
                  config.displayName
                );
              }
            });
          });
        }
      });

      console.log('Terminology adapted');
    },

    /**
     * Adapt form fields based on industry
     */
    adaptFormFields() {
      const industryType = window.industryConfig.getIndustryType();

      // Hide/show specific form fields based on industry
      switch (industryType) {
        case 'SERVICES':
          this.hideFields(['.inventory-field', '.stock-field']);
          break;
        
        case 'RESTAURANT':
          this.hideFields(['.customer-field-on-sale']);
          this.showFields(['.table-number-field']);
          break;
        
        case 'MANUFACTURING':
          this.showFields(['.batch-number-field', '.production-date-field']);
          break;
        
        case 'NONPROFIT':
          this.showFields(['.donor-field', '.grant-field', '.restricted-fund-field']);
          break;
      }

      console.log('Form fields adapted');
    },

    /**
     * Hide form fields
     */
    hideFields(selectors) {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = 'none';
          el.classList.add('field-hidden');
        });
      });
    },

    /**
     * Show form fields
     */
    showFields(selectors) {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.display = '';
          el.classList.remove('field-hidden');
        });
      });
    },

    /**
     * Refresh UI adaptations (call after DOM changes)
     */
    refresh() {
      this.applyAdaptations();
    },

    /**
     * Check if a feature should be visible
     */
    isFeatureVisible(featureCode) {
      return window.industryConfig.isFeatureEnabled(featureCode);
    },

    /**
     * Get display name for a feature
     */
    getDisplayName(featureCode) {
      return window.industryConfig.getFeatureDisplayName(featureCode);
    },

    /**
     * Show industry badge (useful for debugging/admin)
     */
    showIndustryBadge() {
      const industryType = window.industryConfig.getIndustryType();
      const displayName = window.industryConfig.getIndustryDisplayName();
      
      // Create badge element
      const badge = document.createElement('div');
      badge.className = 'industry-badge';
      badge.textContent = displayName;
      badge.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: #667eea;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
        opacity: 0.7;
      `;
      
      document.body.appendChild(badge);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        badge.style.transition = 'opacity 0.5s';
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 500);
      }, 3000);
    }
  };

  // Export to global scope
  window.industryUI = industryUI;

  console.log('Industry UI adapter loaded');
})();
