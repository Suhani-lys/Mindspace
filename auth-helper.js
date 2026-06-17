// Global MindSpace Authentication Helper

// 1. Fetch Interceptor: Attach JWT Bearer Token to all requests
const originalFetch = window.originalFetch || window.fetch;
window.originalFetch = originalFetch;

window.fetch = function(url, options = {}) {
  const token = localStorage.getItem('token');
  if (token) {
    if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      if (!options.headers.has('Authorization') && !options.headers.has('authorization')) {
        options.headers.set('Authorization', 'Bearer ' + token);
      }
    } else {
      options.headers = options.headers || {};
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = 'Bearer ' + token;
      }
    }
  }
  return originalFetch(url, options).then(response => {
    // Auto-logout and redirect if token is expired/invalid
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      const protectedPages = ['dashboard.html', 'journal.html', 'new-vent.html', 'chat-rooms.html', 'vent-feed.html'];
      const currentPage = window.location.pathname.split('/').pop();
      if (protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
      }
    }
    return response;
  });
};

// 2. Handle redirects and user icon profile popup triggers
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  
  const protectedPages = ['dashboard.html', 'journal.html', 'new-vent.html', 'chat-rooms.html', 'vent-feed.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (!token && protectedPages.includes(currentPage)) {
    window.location.href = 'login.html';
    return;
  }

  // Find the user logo icon on the navigation panel
  const logoIcon = document.querySelector('.logo-icon') || document.querySelector('.tnav-logo-icon') || document.querySelector('.sb-logo-icon');
  
  if (logoIcon) {
    logoIcon.style.cursor = 'pointer';
    
    // Add green online status dot to the user icon if logged in
    if (token) {
      logoIcon.style.position = 'relative';
      const statusDot = document.createElement('span');
      statusDot.id = 'auth-status-dot';
      statusDot.style.cssText = `
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 8px;
        height: 8px;
        background: #22c55e;
        border: 1.5px solid #09090b;
        border-radius: 50%;
        display: block;
      `;
      logoIcon.appendChild(statusDot);
    }

    logoIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!token) {
        window.location.href = 'login.html';
        return;
      }

      // Toggle profile dropdown
      let dropdown = document.getElementById('profile-dropdown');
      if (dropdown) {
        dropdown.remove();
      } else {
        dropdown = document.createElement('div');
        dropdown.id = 'profile-dropdown';
        
        // Aligns dropdown correctly under the top navigation logo icon
        const rect = logoIcon.getBoundingClientRect();
        dropdown.style.cssText = `
          position: absolute;
          top: ${rect.bottom + window.scrollY + 8}px;
          left: ${rect.left + window.scrollX}px;
          background: #111116;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 12px 14px;
          z-index: 1000;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 160px;
          font-family: 'Inter', sans-serif;
        `;

        dropdown.innerHTML = `
          <div style="font-size: 10px; color: var(--t3); text-transform: uppercase; letter-spacing: 0.5px;">Logged in as</div>
          <div style="font-size: 13.5px; font-weight: 600; color: var(--t1); margin-bottom: 4px;">👤 ${username}</div>
          <div id="dropdown-sub-status" style="font-size: 11px; color: #06B6D4; font-weight: 600; margin-bottom: 4px;">Loading tier...</div>
          <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.05); margin-bottom: 4px;"></div>
          <a href="dashboard.html" style="font-size: 12.5px; color: var(--t2); text-decoration: none; padding: 4px 0; display: block; transition: color 0.15s;">Dashboard</a>
          <a href="#" id="dropdown-sub-btn" style="display: none; font-size: 12.5px; color: #06B6D4; font-weight: 600; text-decoration: none; padding: 4px 0; transition: color 0.15s;">Subscribe to Premium 💎</a>
          <a href="#" id="logout-btn" style="font-size: 12.5px; color: #f87171; text-decoration: none; padding: 4px 0; display: block; transition: color 0.15s;">Logout</a>
        `;

        document.body.appendChild(dropdown);

        // Fetch subscription status dynamically
        fetch('/api/razorpay/subscription-status')
          .then(res => res.json())
          .then(data => {
            const statusEl = document.getElementById('dropdown-sub-status');
            const subBtn = document.getElementById('dropdown-sub-btn');
            
            if (data.success && data.isSubscribed) {
              if (statusEl) statusEl.innerHTML = 'Tier: Premium Member 💎';
            } else {
              if (statusEl) statusEl.innerHTML = 'Tier: Free Plan 👤';
              if (subBtn) {
                subBtn.style.display = 'block';
                subBtn.addEventListener('click', async (e) => {
                  e.preventDefault();
                  subBtn.textContent = 'Redirecting...';
                  try {
                    const res = await fetch('/api/razorpay/create-subscription', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const checkoutData = await res.json();
                    
                    if (res.ok && checkoutData.success) {
                      if (checkoutData.mock) {
                        window.location.href = checkoutData.url;
                      } else if (checkoutData.subscriptionId && checkoutData.keyId) {
                        if (typeof Razorpay !== 'undefined') {
                          const options = {
                            key: checkoutData.keyId,
                            subscription_id: checkoutData.subscriptionId,
                            name: "MindSpace Premium",
                            description: "Monthly mental health premium resources paywall bypass",
                            theme: { color: "#06B6D4" },
                            handler: async function (response) {
                              subBtn.textContent = 'Verifying...';
                              const verifyRes = await fetch('/api/razorpay/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  razorpay_payment_id: response.razorpay_payment_id,
                                  razorpay_subscription_id: response.razorpay_subscription_id,
                                  razorpay_signature: response.razorpay_signature
                                })
                              });
                              if (verifyRes.ok) {
                                alert('MindSpace Premium Subscription Activated! 🎉');
                                window.location.reload();
                              }
                            }
                          };
                          const rzp = new Razorpay(options);
                          rzp.open();
                        } else {
                          window.location.href = 'resources.html';
                        }
                      }
                    } else {
                      alert('Checkout initialization failed.');
                      window.location.reload();
                    }
                  } catch (err) {
                    console.error('Profile dropdown checkout error:', err);
                  }
                });
              }
            }
          })
          .catch(() => {
            const statusEl = document.getElementById('dropdown-sub-status');
            if (statusEl) statusEl.innerHTML = 'Tier: Free Plan 👤';
          });
      }
    });
  }

  // Handle actions and dismiss dropdowns on click outside
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'logout-btn') {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = 'index.html';
    } else {
      const dropdown = document.getElementById('profile-dropdown');
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.remove();
      }
    }
  });
});
