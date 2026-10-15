'use strict';

/**
 * CNG CONNECT — ANPR Intelligence & Inspection Platform
 * Login Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('rememberMe');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('error');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const pwToggleIcon = document.getElementById('pwToggleIcon');

  // Restore remembered email
  const savedEmail = localStorage.getItem('cng_remember_email');
  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
  }

  // Toggle password visibility
  if (btnTogglePassword && passwordInput && pwToggleIcon) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (isPassword) {
        // Show open eye icon
        pwToggleIcon.innerHTML = `
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
        btnTogglePassword.setAttribute('title', 'Hide password');
      } else {
        // Show eye-off icon
        pwToggleIcon.innerHTML = `
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" y1="2" x2="22" y2="22"/>
        `;
        btnTogglePassword.setAttribute('title', 'Show password');
      }
    });
  }

  // Helper to show error
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        showError('Please enter both your work email and password.');
        return;
      }

      // Handle remember me
      if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('cng_remember_email', email);
      } else {
        localStorage.removeItem('cng_remember_email');
      }

      // Button loading state
      const originalBtnHtml = loginBtn.innerHTML;
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span>Signing in securely...</span>';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Invalid email or password.');
        }

        // On success redirect to dashboard
        window.location.href = '/';
      } catch (err) {
        showError(err.message || 'Authentication failed. Please verify your credentials.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnHtml;
      }
    });
  }
});
