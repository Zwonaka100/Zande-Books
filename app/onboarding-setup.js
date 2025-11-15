// Onboarding setup functionality
let currentStep = 1;
const totalSteps = 6;
let setupData = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeSetup();
    loadSavedData();
    updateProgressBar();
    initializeFeedback();
    addEventListeners();
});

function initializeSetup() {
    // Check if user came from welcome page
    const onboardingStarted = localStorage.getItem('onboarding_started');
    if (!onboardingStarted) {
        // Redirect back to welcome page
        window.location.href = 'onboarding.html';
        return;
    }
    
    // Load current step if returning user
    const savedStep = localStorage.getItem('onboarding_step');
    if (savedStep) {
        currentStep = parseInt(savedStep);
        showStep(currentStep);
    }
}

function addEventListeners() {
    // VAT Registration toggle
    const vatSelect = document.getElementById('vatRegistered');
    if (vatSelect) {
        vatSelect.addEventListener('change', function() {
            const vatNumberGroup = document.getElementById('vatNumberGroup');
            if (this.value === 'yes') {
                vatNumberGroup.style.display = 'block';
            } else {
                vatNumberGroup.style.display = 'none';
            }
        });
    }

    // Financial Year End toggle
    const yearEndSelect = document.getElementById('yearEnd');
    if (yearEndSelect) {
        yearEndSelect.addEventListener('change', function() {
            const customGroup = document.getElementById('customYearEndGroup');
            if (this.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        });
    }

    // Auto-save on input change
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
        input.addEventListener('change', saveFormData);
    });

    // Enter key to proceed
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentStep < totalSteps) {
                nextStep(currentStep);
            } else {
                completeSetup();
            }
        }
    });
}

function nextStep(step) {
    if (validateStep(step)) {
        saveFormData();
        currentStep++;
        if (currentStep <= totalSteps) {
            showStep(currentStep);
            updateProgressBar();
            localStorage.setItem('onboarding_step', currentStep.toString());
            
            // Special handling for COA preview
            if (currentStep === 6) {
                generateCOAPreview();
            }
        }
    }
}

function prevStep(step) {
    currentStep--;
    if (currentStep >= 1) {
        showStep(currentStep);
        updateProgressBar();
        localStorage.setItem('onboarding_step', currentStep.toString());
    }
}

function goBack() {
    window.location.href = 'onboarding.html';
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.setup-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = currentStepElement.querySelector('.form-input, .form-select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

function updateProgressBar() {
    const progress = (currentStep / totalSteps) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function validateStep(step) {
    let isValid = true;
    
    switch(step) {
        case 1:
            const businessName = document.getElementById('businessName');
            const businessNameError = document.getElementById('businessNameError');
            
            if (!businessName.value.trim()) {
                businessName.classList.add('error');
                businessNameError.textContent = 'Please enter your business name';
                isValid = false;
            } else {
                businessName.classList.remove('error');
                businessNameError.textContent = '';
            }
            break;
            
        case 2:
            const industry = document.getElementById('industry');
            const industryError = document.getElementById('industryError');
            
            if (!industry.value) {
                industry.classList.add('error');
                industryError.textContent = 'Please select your industry';
                isValid = false;
            } else {
                industry.classList.remove('error');
                industryError.textContent = '';
            }
            break;
            
        // Other steps are optional, but we could add validation
    }
    
    return isValid;
}

function saveFormData() {
    setupData = {
        businessName: document.getElementById('businessName')?.value || '',
        industry: document.getElementById('industry')?.value || '',
        businessType: document.getElementById('businessType')?.value || '',
        vatRegistered: document.getElementById('vatRegistered')?.value || 'no',
        vatNumber: document.getElementById('vatNumber')?.value || '',
        registrationNumber: document.getElementById('registrationNumber')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        address: document.getElementById('address')?.value || '',
        yearEnd: document.getElementById('yearEnd')?.value || '02-28',
        customYearEnd: document.getElementById('customYearEnd')?.value || ''
    };
    
    localStorage.setItem('onboarding_data', JSON.stringify(setupData));
}

function loadSavedData() {
    const savedData = localStorage.getItem('onboarding_data');
    if (savedData) {
        setupData = JSON.parse(savedData);
        
        // Populate form fields
        Object.keys(setupData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = setupData[key];
            }
        });
        
        // Trigger change events for conditional fields
        const vatSelect = document.getElementById('vatRegistered');
        if (vatSelect) {
            vatSelect.dispatchEvent(new Event('change'));
        }
        
        const yearEndSelect = document.getElementById('yearEnd');
        if (yearEndSelect) {
            yearEndSelect.dispatchEvent(new Event('change'));
        }
    }
}

function generateCOAPreview() {
    const industry = setupData.industry || 'other';
    const vatRegistered = setupData.vatRegistered === 'yes';
    
    // Sample COA based on industry
    const coaTemplates = {
        retail: [
            { name: 'Cash on Hand', type: 'Asset' },
            { name: 'Inventory', type: 'Asset' },
            { name: 'Sales Revenue', type: 'Revenue' },
            { name: 'Cost of Goods Sold', type: 'Expense' },
            { name: 'Rent Expense', type: 'Expense' },
            { name: 'Utilities', type: 'Expense' }
        ],
        restaurant: [
            { name: 'Cash on Hand', type: 'Asset' },
            { name: 'Food Inventory', type: 'Asset' },
            { name: 'Food Sales', type: 'Revenue' },
            { name: 'Beverage Sales', type: 'Revenue' },
            { name: 'Food Costs', type: 'Expense' },
            { name: 'Kitchen Equipment', type: 'Asset' }
        ],
        professional: [
            { name: 'Cash on Hand', type: 'Asset' },
            { name: 'Accounts Receivable', type: 'Asset' },
            { name: 'Professional Fees', type: 'Revenue' },
            { name: 'Office Supplies', type: 'Expense' },
            { name: 'Professional Liability Insurance', type: 'Expense' },
            { name: 'Software Subscriptions', type: 'Expense' }
        ],
        default: [
            { name: 'Cash on Hand', type: 'Asset' },
            { name: 'Accounts Receivable', type: 'Asset' },
            { name: 'Sales Revenue', type: 'Revenue' },
            { name: 'Operating Expenses', type: 'Expense' },
            { name: 'Rent', type: 'Expense' },
            { name: 'Salaries', type: 'Expense' }
        ]
    };
    
    let accounts = coaTemplates[industry] || coaTemplates.default;
    
    // Add VAT accounts if registered
    if (vatRegistered) {
        accounts.push(
            { name: 'VAT Input', type: 'Asset' },
            { name: 'VAT Output', type: 'Liability' }
        );
    }
    
    // Render preview
    const previewList = document.getElementById('coaPreview');
    const accountCountBadge = document.getElementById('accountCountBadge');
    
    if (previewList && accountCountBadge) {
        previewList.innerHTML = accounts.map(account => `
            <div class="preview-item">
                <span class="preview-item-name">${account.name}</span>
                <span class="preview-item-type">${account.type}</span>
            </div>
        `).join('');
        
        accountCountBadge.textContent = `${accounts.length} accounts`;
    }
}

async function completeSetup() {
    saveFormData();
    
    // Show loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Setting up...';
    btn.disabled = true;
    
    try {
        // Save to Supabase
        const success = await saveToDatabase();
        
        if (success) {
            // Mark onboarding as complete
            localStorage.setItem('onboarding_complete', 'true');
            localStorage.removeItem('onboarding_step');
            
            // Redirect to main app
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 500);
        } else {
            throw new Error('Failed to save data');
        }
    } catch (error) {
        console.error('Setup error:', error);
        alert('There was an error completing setup. Please try again.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function saveToDatabase() {
    try {
        // Initialize Supabase client
        const SUPABASE_URL = 'https://xfimvzdadqtlzwvlesrx.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaW12emRhZHF0bHp3dmxlc3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NzU2OTEsImV4cCI6MjA0NzE1MTY5MX0.YNvXE8Xm7YcJvN1HFAMmfYTyxVcHg67lqiqKaOETiKo';
        
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('No authenticated user:', userError);
            alert('Please log in to complete setup');
            window.location.href = 'login.html';
            return false;
        }
        
        // Prepare organization data
        const organizationData = {
            businessName: setupData.businessName,
            industry: setupData.industry,
            businessType: setupData.businessType,
            vatRegistered: setupData.vatRegistered === 'yes',
            vatNumber: setupData.vatNumber || null,
            registrationNumber: setupData.registrationNumber || null,
            email: setupData.email || user.email,
            phone: setupData.phone || null,
            address: setupData.address || null,
            yearEnd: setupData.yearEnd || '02-28'
        };
        
        console.log('Saving onboarding data:', organizationData);
        
        // Call the complete_onboarding function
        const { data: result, error: functionError } = await supabase
            .rpc('complete_onboarding', {
                p_user_id: user.id,
                p_organization_data: organizationData
            });
        
        if (functionError) {
            console.error('Error calling complete_onboarding:', functionError);
            
            // Fallback: Try direct insert if function fails
            console.log('Attempting fallback direct insert...');
            
            // Create organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([{
                    name: setupData.businessName,
                    legal_name: setupData.businessName,
                    registration_number: setupData.registrationNumber,
                    vat_number: setupData.vatNumber,
                    vat_registered: setupData.vatRegistered === 'yes',
                    industry_type: setupData.industry,
                    business_type: setupData.businessType,
                    email: setupData.email,
                    phone: setupData.phone,
                    address: setupData.address,
                    financial_year_end: setupData.yearEnd || '02-28',
                    created_by: user.id,
                    onboarding_completed: true
                }])
                .select()
                .single();
            
            if (orgError) {
                console.error('Organization insert error:', orgError);
                throw orgError;
            }
            
            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    organization_id: org.id,
                    business_name: setupData.businessName,
                    industry_type: setupData.industry,
                    vat_registered: setupData.vatRegistered === 'yes',
                    onboarding_completed: true
                })
                .eq('id', user.id);
            
            if (profileError) {
                console.error('Profile update error:', profileError);
                throw profileError;
            }
            
            console.log('Fallback save successful');
        } else {
            console.log('Onboarding completed successfully:', result);
        }
        
        return true;
        
    } catch (error) {
        console.error('Database save error:', error);
        return false;
    }
}

function initializeFeedback() {
    const feedbackButtons = document.querySelectorAll('.feedback-btn');
    
    feedbackButtons.forEach(button => {
        button.addEventListener('click', function() {
            feedbackButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const rating = this.dataset.rating;
            storeFeedback(rating);
            showFeedbackThankYou(this);
        });
    });
}

function storeFeedback(rating) {
    const feedback = {
        rating: rating,
        step: currentStep,
        timestamp: new Date().toISOString()
    };
    
    const allFeedback = JSON.parse(localStorage.getItem('user_feedback') || '[]');
    allFeedback.push(feedback);
    localStorage.setItem('user_feedback', JSON.stringify(allFeedback));
}

function showFeedbackThankYou(button) {
    const originalContent = button.innerHTML;
    button.innerHTML = '✓';
    
    setTimeout(() => {
        button.innerHTML = originalContent;
    }, 1500);
}
