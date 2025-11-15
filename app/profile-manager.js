// ========================================
// USER PROFILE & MANAGEMENT SYSTEM
// JavaScript Module for ZandeBooks
// ========================================

class UserProfileManager {
    constructor() {
        this.currentUser = null;
        this.company = null;
        this.subscriptionTiers = {
            starter: { maxUsers: 1, name: 'Starter Plan', price: 'R299/month' },
            business: { maxUsers: 3, name: 'Business Plan', price: 'R599/month' },
            pro: { maxUsers: 7, name: 'Pro Plan', price: 'R999/month' }
        };
        this.initializeProfile();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    async initializeProfile() {
        try {
            await this.loadCurrentUser();
            await this.loadCompanyData();
            this.setupEventListeners();
            this.updateUI();
        } catch (error) {
            console.error('Failed to initialize profile:', error);
        }
    }

    async loadCurrentUser() {
        // In production, this would fetch from Supabase
        // For now, simulate current user data
        this.currentUser = {
            id: 'user-123',
            email: 'user@company.com',
            full_name: 'John Doe',
            role: 'owner',
            avatar_url: null,
            phone: '+27 12 345 6789',
            job_title: 'CEO',
            bio: 'Passionate about growing businesses through technology',
            timezone: 'Africa/Johannesburg',
            language: 'en',
            created_at: '2024-01-15'
        };
    }

    async loadCompanyData() {
        // In production, this would fetch from Supabase
        this.company = {
            id: 'company-123',
            name: 'Demo Company',
            subscription_plan: 'pro',
            subscription_status: 'active',
            max_users: 7,
            current_users: 3,
            subscription_expires_at: '2024-12-31'
        };
    }

    setupEventListeners() {
        // Profile dropdown toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('.profile-trigger') || e.target.closest('.profile-trigger')) {
                this.toggleProfileDropdown();
            } else if (!e.target.closest('.profile-dropdown')) {
                this.closeProfileDropdown();
            }
        });

        // Modal triggers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal]')) {
                this.openModal(e.target.dataset.modal);
            }
            if (e.target.matches('.modal-close') || e.target.matches('.modal-backdrop')) {
                this.closeModal();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'profile-settings-form') {
                e.preventDefault();
                this.saveProfileSettings(new FormData(e.target));
            }
            if (e.target.id === 'invite-user-form') {
                e.preventDefault();
                this.inviteUser(new FormData(e.target));
            }
        });

        // User management actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-user')) {
                this.removeUser(e.target.dataset.userId);
            }
            if (e.target.matches('.resend-invitation')) {
                this.resendInvitation(e.target.dataset.invitationId);
            }
        });
    }

    // ========================================
    // UI MANAGEMENT
    // ========================================

    updateUI() {
        this.updateProfileInfo();
        this.updateSubscriptionInfo();
        this.updateUsersList();
        this.updateInvitationsList();
    }

    updateProfileInfo() {
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        const profileAvatar = document.querySelector('.profile-avatar');

        if (profileName) profileName.textContent = this.currentUser.full_name;
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
        if (profileAvatar) {
            if (this.currentUser.avatar_url) {
                profileAvatar.src = this.currentUser.avatar_url;
            } else {
                profileAvatar.textContent = this.getInitials(this.currentUser.full_name);
            }
        }

        // Update form fields in settings modal
        const settingsForm = document.getElementById('profile-settings-form');
        if (settingsForm) {
            settingsForm.full_name.value = this.currentUser.full_name || '';
            settingsForm.email.value = this.currentUser.email || '';
            settingsForm.phone.value = this.currentUser.phone || '';
            settingsForm.job_title.value = this.currentUser.job_title || '';
            settingsForm.bio.value = this.currentUser.bio || '';
            settingsForm.timezone.value = this.currentUser.timezone || 'Africa/Johannesburg';
            settingsForm.language.value = this.currentUser.language || 'en';
        }
    }

    updateSubscriptionInfo() {
        const tier = this.subscriptionTiers[this.company.subscription_plan];
        const elements = {
            planName: document.querySelector('.current-plan-name'),
            planPrice: document.querySelector('.current-plan-price'),
            userCount: document.querySelector('.user-count'),
            maxUsers: document.querySelector('.max-users'),
            usageProgress: document.querySelector('.usage-progress')
        };

        if (elements.planName) elements.planName.textContent = tier.name;
        if (elements.planPrice) elements.planPrice.textContent = tier.price;
        if (elements.userCount) elements.userCount.textContent = this.company.current_users;
        if (elements.maxUsers) elements.maxUsers.textContent = tier.maxUsers;
        
        if (elements.usageProgress) {
            const percentage = (this.company.current_users / tier.maxUsers) * 100;
            elements.usageProgress.style.width = `${percentage}%`;
            
            // Color coding for usage
            elements.usageProgress.className = 'usage-progress';
            if (percentage > 90) elements.usageProgress.classList.add('usage-high');
            else if (percentage > 70) elements.usageProgress.classList.add('usage-medium');
            else elements.usageProgress.classList.add('usage-low');
        }
    }

    updateUsersList() {
        const container = document.querySelector('.users-list');
        if (!container) return;

        // Sample users data (in production, fetch from Supabase)
        const users = [
            {
                id: 'user-123',
                full_name: 'John Doe',
                email: 'john@company.com',
                role: 'owner',
                avatar_url: null,
                last_active: '2024-01-20T10:30:00Z',
                status: 'active'
            },
            {
                id: 'user-124',
                full_name: 'Jane Smith',
                email: 'jane@company.com',
                role: 'admin',
                avatar_url: null,
                last_active: '2024-01-20T09:15:00Z',
                status: 'active'
            },
            {
                id: 'user-125',
                full_name: 'Bob Johnson',
                email: 'bob@company.com',
                role: 'user',
                avatar_url: null,
                last_active: '2024-01-19T16:45:00Z',
                status: 'active'
            }
        ];

        container.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-avatar">
                    ${user.avatar_url ? 
                        `<img src="${user.avatar_url}" alt="${user.full_name}">` : 
                        `<span class="avatar-initials">${this.getInitials(user.full_name)}</span>`
                    }
                </div>
                <div class="user-info">
                    <div class="user-name">${user.full_name}</div>
                    <div class="user-email">${user.email}</div>
                    <div class="user-meta">
                        <span class="user-role role-${user.role}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                        <span class="user-last-active">Last active: ${this.formatDate(user.last_active)}</span>
                    </div>
                </div>
                <div class="user-actions">
                    ${user.id !== this.currentUser.id ? `
                        <button class="btn-secondary btn-sm edit-user" data-user-id="${user.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="m18.5 2.5 3 3L13 14l-4 1 1-4 8.5-8.5z"></path>
                            </svg>
                            Edit
                        </button>
                        <button class="btn-danger btn-sm remove-user" data-user-id="${user.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            </svg>
                            Remove
                        </button>
                    ` : '<span class="current-user-badge">You</span>'}
                </div>
            </div>
        `).join('');
    }

    updateInvitationsList() {
        const container = document.querySelector('.invitations-list');
        if (!container) return;

        // Sample invitations data (in production, fetch from Supabase)
        const invitations = [
            {
                id: 'inv-1',
                email: 'alice@company.com',
                full_name: 'Alice Williams',
                role: 'user',
                status: 'pending',
                expires_at: '2024-01-27T12:00:00Z',
                invited_by: 'John Doe',
                invitation_message: 'Welcome to our team!'
            }
        ];

        if (invitations.length === 0) {
            container.innerHTML = '<div class="empty-state">No pending invitations</div>';
            return;
        }

        container.innerHTML = invitations.map(invitation => `
            <div class="invitation-item">
                <div class="invitation-info">
                    <div class="invitation-name">${invitation.full_name}</div>
                    <div class="invitation-email">${invitation.email}</div>
                    <div class="invitation-meta">
                        <span class="invitation-role role-${invitation.role}">${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}</span>
                        <span class="invitation-expires">Expires: ${this.formatDate(invitation.expires_at)}</span>
                    </div>
                </div>
                <div class="invitation-actions">
                    <button class="btn-secondary btn-sm resend-invitation" data-invitation-id="${invitation.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2.8 0 5.3 1.3 7 3.4"></path>
                            <path d="m21 4-3 3-3-3"></path>
                        </svg>
                        Resend
                    </button>
                    <button class="btn-danger btn-sm cancel-invitation" data-invitation-id="${invitation.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cancel
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // DROPDOWN MANAGEMENT
    // ========================================

    toggleProfileDropdown() {
        const dropdown = document.querySelector('.profile-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    closeProfileDropdown() {
        const dropdown = document.querySelector('.profile-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    // ========================================
    // MODAL MANAGEMENT
    // ========================================

    openModal(modalId) {
        this.closeModal(); // Close any open modals first
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Focus first input if available
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }

    // ========================================
    // PROFILE ACTIONS
    // ========================================

    async saveProfileSettings(formData) {
        try {
            this.showLoading('Saving profile settings...');
            
            const profileData = {
                full_name: formData.get('full_name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                job_title: formData.get('job_title'),
                bio: formData.get('bio'),
                timezone: formData.get('timezone'),
                language: formData.get('language')
            };

            // In production, save to Supabase
            await this.simulateApiCall();
            
            // Update local data
            Object.assign(this.currentUser, profileData);
            
            this.hideLoading();
            this.showSuccess('Profile settings saved successfully!');
            this.closeModal();
            this.updateUI();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to save profile settings: ' + error.message);
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            this.showLoading('Changing password...');
            
            // In production, use Supabase auth
            await this.simulateApiCall();
            
            this.hideLoading();
            this.showSuccess('Password changed successfully!');
            this.closeModal();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to change password: ' + error.message);
        }
    }

    async uploadAvatar(file) {
        try {
            this.showLoading('Uploading avatar...');
            
            // In production, upload to Supabase storage
            await this.simulateApiCall();
            
            // Simulate getting URL back
            const avatarUrl = URL.createObjectURL(file);
            this.currentUser.avatar_url = avatarUrl;
            
            this.hideLoading();
            this.showSuccess('Avatar uploaded successfully!');
            this.updateUI();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to upload avatar: ' + error.message);
        }
    }

    // ========================================
    // USER MANAGEMENT ACTIONS
    // ========================================

    async inviteUser(formData) {
        try {
            // Check subscription limits
            const tier = this.subscriptionTiers[this.company.subscription_plan];
            if (this.company.current_users >= tier.maxUsers) {
                this.showError(`You've reached the maximum user limit for your ${tier.name}. Please upgrade to invite more users.`);
                return;
            }

            this.showLoading('Sending invitation...');
            
            const invitationData = {
                email: formData.get('email'),
                full_name: formData.get('full_name'),
                role: formData.get('role'),
                invitation_message: formData.get('invitation_message')
            };

            // In production, create invitation in Supabase
            await this.simulateApiCall();
            
            this.hideLoading();
            this.showSuccess(`Invitation sent to ${invitationData.email}!`);
            this.closeModal();
            
            // Reset form
            document.getElementById('invite-user-form').reset();
            this.updateInvitationsList();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to send invitation: ' + error.message);
        }
    }

    async removeUser(userId) {
        if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading('Removing user...');
            
            // In production, update user status in Supabase
            await this.simulateApiCall();
            
            this.company.current_users--;
            
            this.hideLoading();
            this.showSuccess('User removed successfully');
            this.updateUI();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to remove user: ' + error.message);
        }
    }

    async resendInvitation(invitationId) {
        try {
            this.showLoading('Resending invitation...');
            
            // In production, resend via Supabase
            await this.simulateApiCall();
            
            this.hideLoading();
            this.showSuccess('Invitation resent successfully!');
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to resend invitation: ' + error.message);
        }
    }

    // ========================================
    // SUBSCRIPTION ACTIONS
    // ========================================

    async upgradeSubscription(newPlan) {
        try {
            this.showLoading('Upgrading subscription...');
            
            // In production, handle payment and update subscription
            await this.simulateApiCall();
            
            const oldTier = this.subscriptionTiers[this.company.subscription_plan];
            const newTier = this.subscriptionTiers[newPlan];
            
            this.company.subscription_plan = newPlan;
            this.company.max_users = newTier.maxUsers;
            
            this.hideLoading();
            this.showSuccess(`Successfully upgraded to ${newTier.name}!`);
            this.updateUI();
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to upgrade subscription: ' + error.message);
        }
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async simulateApiCall() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    // ========================================
    // NOTIFICATION SYSTEM
    // ========================================

    showLoading(message) {
        // Create or update loading indicator
        let loading = document.querySelector('.loading-indicator');
        if (!loading) {
            loading = document.createElement('div');
            loading.className = 'loading-indicator';
            document.body.appendChild(loading);
        }
        loading.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.querySelector('.loading-indicator');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// ========================================
// INITIALIZE ON DOM LOAD
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize user profile manager
    window.userProfileManager = new UserProfileManager();
    
    // Make functions globally available for onclick handlers
    window.toggleProfileDropdown = () => window.userProfileManager.toggleProfileDropdown();
    window.openModal = (modalId) => window.userProfileManager.openModal(modalId);
    window.closeModal = () => window.userProfileManager.closeModal();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProfileManager;
}