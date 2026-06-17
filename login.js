// Auth Forms Handling

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');

const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');

// Tab Toggling
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.add('active-form-section');
  formRegister.classList.remove('active-form-section');
  clearErrors();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.add('active-form-section');
  formLogin.classList.remove('active-form-section');
  clearErrors();
});

function clearErrors() {
  loginError.textContent = '';
  registerError.textContent = '';
  registerSuccess.textContent = '';
}

// Handle Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Save details to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // Redirect to main page
      window.location.href = 'index.html';
    } else {
      loginError.textContent = data.message || 'Login failed. Please try again.';
    }
  } catch (err) {
    console.error('Login request failed:', err);
    loginError.textContent = 'Network error. Please check your connection.';
  }
});

// Handle Registration
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  registerSuccess.textContent = '';

  const username = registerUsernameInput.value.trim();
  const password = registerPasswordInput.value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      registerSuccess.textContent = 'Account created successfully! Switching to login...';
      registerUsernameInput.value = '';
      registerPasswordInput.value = '';

      // Auto-switch to login tab
      setTimeout(() => {
        tabLogin.click();
        loginUsernameInput.value = username;
        loginPasswordInput.focus();
      }, 1500);
    } else {
      registerError.textContent = data.message || 'Registration failed.';
    }
  } catch (err) {
    console.error('Registration request failed:', err);
    registerError.textContent = 'Network error. Please check your connection.';
  }
});
