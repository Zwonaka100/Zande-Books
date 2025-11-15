// ========================================
// SUBSCRIPTION ACCESS CONTROL
// Ensures only paid subscribers access the app
// ========================================

class SubscriptionAccessControl {
    constructor() {
        this.checkAccess();
    }

    async checkAccess() {
        try {
            // Check if user is logged in
            const isLoggedIn = this.checkAuthStatus();
            if (!isLoggedIn) {
                this.redirectToLogin();
                return;
            }

            // Check subscription status
            const subscriptionStatus = await this.checkSubscriptionStatus();
            if (!subscriptionStatus.isActive) {
                this.redirectToSubscription(subscriptionStatus.reason);
                return;
            }

            // User has valid access - initialize app
            this.initializeApp();
            
        } catch (error) {
            console.error('Access control error:', error);
            this.redirectToLogin();
        }
    }

    checkAuthStatus() {
        // In production, check Supabase auth
        // For now, simulate checking for auth token
        const authToken = localStorage.getItem('zandebooks_auth_token');
        const userSession = localStorage.getItem('zandebooks_user_session');
        
        return authToken && userSession;
    }

    async checkSubscriptionStatus() {
        // In production, check with Supabase/payment provider
        // For demo, simulate subscription check
        const userSubscription = localStorage.getItem('zandebooks_subscription');
        
        if (!userSubscription) {
            return {
                isActive: false,
                reason: 'no_subscription',
                message: 'No active subscription found'
            };
        }

        const subscription = JSON.parse(userSubscription);
        const now = new Date();
        const expiryDate = new Date(subscription.expires_at);

        if (expiryDate < now) {
            return {
                isActive: false,
                reason: 'expired',
                message: 'Your subscription has expired'
            };
        }

        if (subscription.status !== 'active') {
            return {
                isActive: false,
                reason: 'inactive',
                message: 'Your subscription is not active'
            };
        }

        return {
            isActive: true,
            plan: subscription.plan,
            expires_at: subscription.expires_at
        };
    }

    redirectToLogin() {
        // Redirect to marketing site login page
        window.location.href = '../login.html?redirect=app';
    }

    redirectToSubscription(reason) {
        // Show subscription required message
        document.body.innerHTML = `
            <div class="subscription-required">
                <div class="subscription-modal">
                    <div class="subscription-icon">🔒</div>
                    <h2>Subscription Required</h2>
                    <p>${this.getSubscriptionMessage(reason)}</p>
                    <div class="subscription-actions">
                        <a href="../Plans.html" class="btn btn-primary">Choose a Plan</a>
                        <a href="../login.html" class="btn btn-secondary">Sign In</a>
                    </div>
                </div>
            </div>
            <style>
                .subscription-required {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .subscription-modal {
                    background: white;
                    padding: 3rem;
                    border-radius: 1rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    text-align: center;
                    max-width: 400px;
                    margin: 2rem;
                }
                .subscription-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                .subscription-modal h2 {
                    color: #1f2937;
                    margin-bottom: 1rem;
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                .subscription-modal p {
                    color: #6b7280;
                    margin-bottom: 2rem;
                    line-height: 1.6;
                }
                .subscription-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                .btn {
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-primary {
                    background: #0ea5e9;
                    color: white;
                }
                .btn-primary:hover {
                    background: #0284c7;
                }
                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                }
                .btn-secondary:hover {
                    background: #e5e7eb;
                }
            </style>
        `;
    }

    getSubscriptionMessage(reason) {
        switch (reason) {
            case 'no_subscription':
                return 'You need an active subscription to access ZandeBooks Professional. Choose a plan that fits your business needs.';
            case 'expired':
                return 'Your subscription has expired. Renew your subscription to continue using ZandeBooks Professional.';
            case 'inactive':
                return 'Your subscription is currently inactive. Please update your payment method or contact support.';
            default:
                return 'A valid subscription is required to access ZandeBooks Professional.';
        }
    }

    initializeApp() {
        // App has valid access - set up business branding
        this.setupBusinessBranding();
        
        // Show success message
        console.log('✅ Access granted - Welcome to ZandeBooks Professional');
    }

    setupBusinessBranding() {
        // Get business information from subscription/user data
        const businessData = this.getBusinessData();
        
        // Update business name in header
        const businessNameEl = document.getElementById('businessName');
        if (businessNameEl && businessData.name) {
            businessNameEl.textContent = businessData.name;
        }

        // Update page title
        document.title = `${businessData.name} - ZandeBooks Professional`;
        
        // Add welcome class to body
        document.body.classList.add('app-initialized');
    }

    getBusinessData() {
        // In production, fetch from Supabase
        // For demo, return sample data
        const userData = localStorage.getItem('zandebooks_user_data');
        if (userData) {
            const user = JSON.parse(userData);
            return {
                name: user.company_name || 'Your Business',
                industry: user.industry || 'General',
                founded: user.founded || new Date().getFullYear()
            };
        }

        return {
            name: 'Demo Company Pty Ltd',
            industry: 'Technology',
            founded: 2024
        };
    }
}

// ========================================
// DEMO SETUP (Remove in production)
// ========================================

function setupDemoAccess() {
    // Set up demo user with active subscription
    const demoUser = {
        id: 'demo-user-123',
        email: 'demo@company.com',
        full_name: 'Demo User',
        company_name: 'Demo Company Pty Ltd',
        industry: 'Technology'
    };

    const demoSubscription = {
        plan: 'pro',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        max_users: 7
    };

    localStorage.setItem('zandebooks_auth_token', 'demo-token-123');
    localStorage.setItem('zandebooks_user_session', JSON.stringify({ 
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }));
    localStorage.setItem('zandebooks_user_data', JSON.stringify(demoUser));
    localStorage.setItem('zandebooks_subscription', JSON.stringify(demoSubscription));
}

// ========================================
// INITIALIZE ON DOM LOAD
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // For demo purposes, set up demo access
    // Remove this in production
    if (!localStorage.getItem('zandebooks_auth_token')) {
        setupDemoAccess();
    }
    
    // Initialize access control
    new SubscriptionAccessControl();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionAccessControl;
}