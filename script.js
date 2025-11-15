// Generate unique ID
function generateID(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// NOTE: This function for local storage is generally not needed with Supabase Auth
// function setCurrentUser(user) {
//     // Store user with fixed key 'zandeUser'
//     localStorage.setItem('zandeUser', JSON.stringify(user));
//     // Also store with email key for lookup
//     localStorage.setItem('zandeUser_' + user.email, JSON.stringify(user));
// }

// Add to script.js
function validateEmail(email) {
  const re = /^[^\\s@]+@[^\\s@]+\.[^\\s@]+$/;
  return re.test(email);
}

// Removed redundant validation that was inside a commented-out section previously
// if (!validateEmail(email)) {
//   alert("Please enter a valid email address");
//   return;
// }
// if (password.length < 6) {
//   alert("Password must be at least 6 characters");
//   return;
// }


// ===== REGISTRATION =====
// Removed duplicate signupForm event listener. This is now handled in signup.html directly.
// document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
//   e.preventDefault();
  
//   const email = document.getElementById('signupEmail').value;
//   const password = document.getElementById('signupPassword').value;
//   const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
//   const name = document.getElementById('signupName').value;
//   const business = document.getElementById('signupBusiness').value;
  
//   // Validate passwords match
//   if (password !== passwordConfirm) {
//     alert("Passwords don't match");
//     return;
//   }
  
//   // Create user
//   const { data: { user }, error: authError } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       data: {
//         name,
//         business,
//         plan: 'starter'
//       }
//     }
//   });
  
//   if (authError) {
//     alert(`Registration failed: ${authError.message}`);
//     return;
//   }
  
//   // NOTE: Client-side insertion into 'profiles' table is removed.
//   // This should now be handled by a PostgreSQL trigger in your Supabase database
//   // AFTER the user's email has been confirmed.
//   // const { error: dbError } = await supabase
//   //   .from('profiles')
//   //   .insert([{
//   //     id: user.id,
//   //     email,
//   //     name,
//   //     business,
//   //     plan: 'starter'
//   //   }]);
  
//   // if (dbError) {
//   //   alert(`Database error: ${dbError.message}`);
//   // } else {
//   //   alert('Registration successful! Please check your email to confirm your account.');
//   //   // Redirect to login page to prompt for verification
//   //   window.location.href = "login.html?signup=success&email=" + encodeURIComponent(email);
//   // }
// });

// ===== LOGIN =====
// Removed duplicate loginForm event listener. This is now handled in login.html directly.
// document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
//   e.preventDefault();

//   const submitBtn = this.querySelector('button[type="submit"]');
//   submitBtn.disabled = true;
//   submitBtn.textContent = 'Logging in...';
  
//   const email = document.getElementById('loginEmail').value;
//   const password = document.getElementById('loginPassword').value;
  
//   const { data: { session }, error } = await supabase.auth.signInWithPassword({
//     email,
//     password
//   });
  
//   if (error) {
//     alert(`Login failed: ${error.message}`);
//   } else {
//     // Redirect to app
//     window.location.href = "app/app.html";
//   }
// });

// ===== SWITCH BETWEEN LOGIN/REGISTER =====
// These functions might be for a combined login/signup page if you have one.
// Keeping them as they are utility functions.
function showSection(sectionId) {
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-tab="${sectionId.replace('Section', '')}"]`).classList.add('active');
}

// ===== MARKETING NAV BUTTONS (if present) =====
// These buttons should link directly to login.html or signup.html now.
// The logic below is for internal tab switching, removed if not used.
if (document.getElementById('getStartedBtn')) {
  document.getElementById('getStartedBtn').onclick = function(e) {
    e.preventDefault();
    window.location.href = "signup.html"; // Redirect to signup page
  };
}
if (document.getElementById('loginNavBtn')) {
  document.getElementById('loginNavBtn').onclick = function(e) {
    e.preventDefault();
    window.location.href = "login.html"; // Redirect to login page
  };
}
if (document.getElementById('getStartedNav')) {
  document.getElementById('getStartedNav').onclick = function(e) {
    e.preventDefault();
    window.location.href = "signup.html"; // Redirect to signup page
  };
}
if (document.getElementById('loginNavTop')) {
  document.getElementById('loginNavTop').onclick = function(e) {
    e.preventDefault();
    window.location.href = "login.html"; // Redirect to login page
  };
}

  // Modal openers - assuming these still apply to specific marketing modals
  document.getElementById('showInvoicing')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalInvoicing').style.display = 'flex';
  };
  document.getElementById('showVat')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalVat').style.display = 'flex';
  };
  document.getElementById('showMobile')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalMobile').style.display = 'flex';
  };
  // Modal closers
  document.querySelectorAll('.zande-modal-close').forEach(function(btn){
    btn.onclick = function() {
      // Ensure the correct modal ID is passed via data-close attribute
      const modalToCloseId = this.getAttribute('data-close');
      if (modalToCloseId) {
        const modalToClose = document.getElementById(modalToCloseId);
        if (modalToClose) {
            modalToClose.style.display = 'none';
        }
      }
    }
  });
  // Close modal on outside click
  document.querySelectorAll('.zande-modal').forEach(function(modal){
    modal.onclick = function(e) {
      if(e.target === modal) modal.style.display = 'none';
    }
  });

  // Format cellphone input as (+27) (XX) XXX XXXX
document.getElementById('cellInput')?.addEventListener('input', function(e) { // Added optional chaining
  let v = e.target.value.replace(/[^\d]/g, '');
  if (v.startsWith('27')) v = v.slice(2);
  if (v.length > 9) v = v.slice(0, 9);

  // Format as +27 XX XXX XXXX
  let formatted = '+27';
  if (v.length > 0) formatted += ' ';
  if (v.length > 2) {
    formatted += v.slice(0, 2) + ' ' + v.slice(2, 5);
    if (v.length > 5) formatted += ' ' + v.slice(5, 9);
  } else if (v.length > 0) {
    formatted += v;
  }
  e.target.value = formatted.trim();
});

// Check feature access based on plan
// This function requires 'supabase' to be globally available or imported in its context
// For this script.js, it assumes supabase is available via window.supabase if not module imported.
function checkFeatureAccess(feature) {
  // Assuming a getCurrentUser function or similar to retrieve user data
  // For Supabase, you'd get the user session and then query their profile.
  // This function is defined in auth.js as a module, so this one here in script.js
  // is likely a placeholder or legacy. The auth.js version should be used.
  // const user = getCurrentUser(); // This function is not defined here
  // if (!user) return false;
  
  // const plan = user.plan || 'free';
  
  // const featureMatrix = {
  //   dashboard: true,
  //   invoicing: plan !== 'free',
  //   quotes: plan !== 'free',
  //   multiCurrency: plan === 'pro' || plan === 'premium',
  //   payroll: plan === 'premium',
  //   customReports: plan === 'premium',
  //   inventory: plan === 'business' || plan === 'pro' || plan === 'premium',
  //   aiAssistant: plan === 'premium'
  // };
  
  // return featureMatrix[feature] || false;
  
  // Placeholder: Refer to auth.js for the actual implementation
  console.warn("Using placeholder for checkFeatureAccess. Refer to scripts/auth.js for actual logic.");
  return true; 
}

// Add to script.js - for handling URL params on login/signup page.
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  
  // This logic is for the login.html page. Keeping it if login.html includes script.js
  // and has auth-tab elements.
  if (tab === 'signup') {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="signup"]')?.classList.add('active'); // Added optional chaining
    
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('signupForm')?.classList.add('active'); // Added optional chaining
  }
});

// Password reset - depends on window.supabase being available
document.getElementById('forgotPassword')?.addEventListener('click', async function(e) {
  e.preventDefault();
  
  const email = prompt("Enter your email to reset password:");
  if (email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert("Password reset email sent! Check your inbox.");
    }
  }
});

// Payfast webhook logic - this is Deno server-side code and should NOT be in a client-side script.
// This block should be removed from script.js in your actual project.
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE");
// serve(async (req) => {
//   const body = await req.text();
//   const params = new URLSearchParams(body);
//   const signature = params.get('signature');
//   params.delete('signature');
//   const dataString = [...params.entries()]
//     .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
//     .join('&');
//   const computedSignature = crypto.createHmac('md5', PAYFAST_PASSPHRASE)
//     .update(dataString)
//     .digest('hex');
//   if (signature !== computedSignature) {
//     return new Response("Invalid signature", { status: 401 });
//   }
//   const email = params.get('email_address');
//   const plan = params.get('item_name').split(' ')[0].toLowerCase();
//   const { data: user } = await supabase.auth.admin.getUserById(params.get('custom_str1'));
//   await supabase
//     .from('profiles')
//     .update({ plan, is_trial: false })
//     .eq('id', user.id);
//   return new Response("OK", { status: 200 });
// });


// ====== REST OF YOUR APP LOGIC (sales, expenses, COA, etc) GOES HERE ======
// ...existing code...
// Generate unique ID
function generateID(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// NOTE: This function for local storage is generally not needed with Supabase Auth
// function setCurrentUser(user) {
//     // Store user with fixed key 'zandeUser'
//     localStorage.setItem('zandeUser', JSON.stringify(user));
//     // Also store with email key for lookup
//     localStorage.setItem('zandeUser_' + user.email, JSON.stringify(user));
// }

// Add to script.js
function validateEmail(email) {
  const re = /^[^\\s@]+@[^\\s@]+\.[^\\s@]+$/;
  return re.test(email);
}

// Removed redundant validation that was inside a commented-out section previously
// if (!validateEmail(email)) {
//   alert("Please enter a valid email address");
//   return;
// }
// if (password.length < 6) {
//   alert("Password must be at least 6 characters");
//   return;
// }


// ===== REGISTRATION =====
// Removed duplicate signupForm event listener. This is now handled in signup.html directly.
// document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
//   e.preventDefault();
  
//   const email = document.getElementById('signupEmail').value;
//   const password = document.getElementById('signupPassword').value;
//   const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
//   const name = document.getElementById('signupName').value;
//   const business = document.getElementById('signupBusiness').value;
  
//   // Validate passwords match
//   if (password !== passwordConfirm) {
//     alert("Passwords don't match");
//     return;
//   }
  
//   // Create user
//   const { data: { user }, error: authError } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       data: {
//         name,
//         business,
//         plan: 'starter'
//       }
//     }
//   });
  
//   if (authError) {
//     alert(`Registration failed: ${authError.message}`);
//     return;
//   }
  
//   // NOTE: Client-side insertion into 'profiles' table is removed.
//   // This should now be handled by a PostgreSQL trigger in your Supabase database
//   // AFTER the user's email has been confirmed.
//   // const { error: dbError } = await supabase
//   //   .from('profiles')
//   //   .insert([{
//   //     id: user.id,
//   //     email,
//   //     name,
//   //     business,
//   //     plan: 'starter'
//   //   }]);
  
//   // if (dbError) {
//   //   alert(`Database error: ${dbError.message}`);
//   // } else {
//   //   alert('Registration successful! Please check your email to confirm your account.');
//   //   // Redirect to login page to prompt for verification
//   //   window.location.href = "login.html?signup=success&email=" + encodeURIComponent(email);
//   // }
// });

// ===== LOGIN =====
// Removed duplicate loginForm event listener. This is now handled in login.html directly.
// document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
//   e.preventDefault();

//   const submitBtn = this.querySelector('button[type="submit"]');
//   submitBtn.disabled = true;
//   submitBtn.textContent = 'Logging in...';
  
//   const email = document.getElementById('loginEmail').value;
//   const password = document.getElementById('loginPassword').value;
  
//   const { data: { session }, error } = await supabase.auth.signInWithPassword({
//     email,
//     password
//   });
  
//   if (error) {
//     alert(`Login failed: ${error.message}`);
//   } else {
//     // Redirect to app
//     window.location.href = "app/app.html";
//   }
// });

// ===== SWITCH BETWEEN LOGIN/REGISTER =====
// These functions might be for a combined login/signup page if you have one.
// Keeping them as they are utility functions.
function showSection(sectionId) {
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-tab="${sectionId.replace('Section', '')}"]`).classList.add('active');
}

// ===== MARKETING NAV BUTTONS (if present) =====
// These buttons should link directly to login.html or signup.html now.
// The logic below is for internal tab switching, removed if not used.
if (document.getElementById('getStartedBtn')) {
  document.getElementById('getStartedBtn').onclick = function(e) {
    e.preventDefault();
    window.location.href = "signup.html"; // Redirect to signup page
  };
}
if (document.getElementById('loginNavBtn')) {
  document.getElementById('loginNavBtn').onclick = function(e) {
    e.preventDefault();
    window.location.href = "login.html"; // Redirect to login page
  };
}
if (document.getElementById('getStartedNav')) {
  document.getElementById('getStartedNav').onclick = function(e) {
    e.preventDefault();
    window.location.href = "signup.html"; // Redirect to signup page
  };
}
if (document.getElementById('loginNavTop')) {
  document.getElementById('loginNavTop').onclick = function(e) {
    e.preventDefault();
    window.location.href = "login.html"; // Redirect to login page
  };
}

  // Modal openers - assuming these still apply to specific marketing modals
  document.getElementById('showInvoicing')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalInvoicing').style.display = 'flex';
  };
  document.getElementById('showVat')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalVat').style.display = 'flex';
  };
  document.getElementById('showMobile')?.onclick = function(e) { // Added optional chaining
    e.preventDefault();
    document.getElementById('modalMobile').style.display = 'flex';
  };
  // Modal closers
  document.querySelectorAll('.zande-modal-close').forEach(function(btn){
    btn.onclick = function() {
      // Ensure the correct modal ID is passed via data-close attribute
      const modalToCloseId = this.getAttribute('data-close');
      if (modalToCloseId) {
        const modalToClose = document.getElementById(modalToCloseId);
        if (modalToClose) {
            modalToClose.style.display = 'none';
        }
      }
    }
  });
  // Close modal on outside click
  document.querySelectorAll('.zande-modal').forEach(function(modal){
    modal.onclick = function(e) {
      if(e.target === modal) modal.style.display = 'none';
    }
  });

  // Format cellphone input as (+27) (XX) XXX XXXX
document.getElementById('cellInput')?.addEventListener('input', function(e) { // Added optional chaining
  let v = e.target.value.replace(/[^\d]/g, '');
  if (v.startsWith('27')) v = v.slice(2);
  if (v.length > 9) v = v.slice(0, 9);

  // Format as +27 XX XXX XXXX
  let formatted = '+27';
  if (v.length > 0) formatted += ' ';
  if (v.length > 2) {
    formatted += v.slice(0, 2) + ' ' + v.slice(2, 5);
    if (v.length > 5) formatted += ' ' + v.slice(5, 9);
  } else if (v.length > 0) {
    formatted += v;
  }
  e.target.value = formatted.trim();
});

// Check feature access based on plan
// This function requires 'supabase' to be globally available or imported in its context
// For this script.js, it assumes supabase is available via window.supabase if not module imported.
function checkFeatureAccess(feature) {
  // Assuming a getCurrentUser function or similar to retrieve user data
  // For Supabase, you'd get the user session and then query their profile.
  // This function is defined in auth.js as a module, so this one here in script.js
  // is likely a placeholder or legacy. The auth.js version should be used.
  // const user = getCurrentUser(); // This function is not defined here
  // if (!user) return false;
  
  // const plan = user.plan || 'free';
  
  // const featureMatrix = {
  //   dashboard: true,
  //   invoicing: plan !== 'free',
  //   quotes: plan !== 'free',
  //   multiCurrency: plan === 'pro' || plan === 'premium',
  //   payroll: plan === 'premium',
  //   customReports: plan === 'premium',
  //   inventory: plan === 'business' || plan === 'pro' || plan === 'premium',
  //   aiAssistant: plan === 'premium'
  // };
  
  // return featureMatrix[feature] || false;
  
  // Placeholder: Refer to auth.js for the actual implementation
  console.warn("Using placeholder for checkFeatureAccess. Refer to scripts/auth.js for actual logic.");
  return true; 
}

// Add to script.js - for handling URL params on login/signup page.
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  
  // This logic is for the login.html page. Keeping it if login.html includes script.js
  // and has auth-tab elements.
  if (tab === 'signup') {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="signup"]')?.classList.add('active'); // Added optional chaining
    
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('signupForm')?.classList.add('active'); // Added optional chaining
  }
});

// Password reset - depends on window.supabase being available
document.getElementById('forgotPassword')?.addEventListener('click', async function(e) {
  e.preventDefault();
  
  const email = prompt("Enter your email to reset password:");
  if (email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert("Password reset email sent! Check your inbox.");
    }
  }
});

// Payfast webhook logic - this is Deno server-side code and should NOT be in a client-side script.
// This block should be removed from script.js in your actual project.
// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE");
// serve(async (req) => {
//   const body = await req.text();
//   const params = new URLSearchParams(body);
//   const signature = params.get('signature');
//   params.delete('signature');
//   const dataString = [...params.entries()]
//     .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
//     .join('&');
//   const computedSignature = crypto.createHmac('md5', PAYFAST_PASSPHRASE)
//     .update(dataString)
//     .digest('hex');
//   if (signature !== computedSignature) {
//     return new Response("Invalid signature", { status: 401 });
//   }
//   const email = params.get('email_address');
//   const plan = params.get('item_name').split(' ')[0].toLowerCase();
//   const { data: user } = await supabase.auth.admin.getUserById(params.get('custom_str1'));
//   await supabase
//     .from('profiles')
//     .update({ plan, is_trial: false })
//     .eq('id', user.id);
//   return new Response("OK", { status: 200 });
// });


// ====== REST OF YOUR APP LOGIC (sales, expenses, COA, etc) GOES HERE ======
// ...existing code...
