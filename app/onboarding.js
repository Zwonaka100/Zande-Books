// Onboarding page functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeFeedback();
});

function startOnboarding() {
    // Store that user has started onboarding
    localStorage.setItem('onboarding_started', 'true');
    localStorage.setItem('onboarding_step', '1');
    
    // Redirect to onboarding flow (we'll create this next)
    window.location.href = 'onboarding-setup.html';
}

function initializeFeedback() {
    const feedbackButtons = document.querySelectorAll('.feedback-btn');
    
    feedbackButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            feedbackButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get rating
            const rating = this.dataset.rating;
            
            // Store feedback
            storeFeedback(rating);
            
            // Show thank you message
            showFeedbackThankYou(this);
        });
    });
}

function storeFeedback(rating) {
    const feedback = {
        rating: rating,
        timestamp: new Date().toISOString(),
        page: 'onboarding-welcome'
    };
    
    // Store in localStorage (in production, send to backend)
    const allFeedback = JSON.parse(localStorage.getItem('user_feedback') || '[]');
    allFeedback.push(feedback);
    localStorage.setItem('user_feedback', JSON.stringify(allFeedback));
    
    console.log('Feedback stored:', feedback);
}

function showFeedbackThankYou(button) {
    const originalContent = button.innerHTML;
    button.innerHTML = '✓';
    
    setTimeout(() => {
        button.innerHTML = originalContent;
    }, 1500);
}

// Check if user is returning
function checkReturningUser() {
    const hasStarted = localStorage.getItem('onboarding_started');
    const currentStep = localStorage.getItem('onboarding_step');
    
    if (hasStarted && currentStep) {
        // Show "Continue setup" option
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.textContent = 'Continue setup';
        }
    }
}

// Initialize on load
checkReturningUser();

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Press Enter to start
    if (e.key === 'Enter') {
        startOnboarding();
    }
});
