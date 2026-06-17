// Resources Screen Paywall Logic - Razorpay Integration

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  let isSubscribed = false;

  // Dynamically load Razorpay SDK if authenticated
  if (token) {
    const rzpScript = document.createElement('script');
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
    rzpScript.async = true;
    document.head.appendChild(rzpScript);
  }

  // Silently check subscription status on page load
  if (token) {
    checkSubscription();
  }

  // Check subscription status
  function checkSubscription() {
    if (!token) {
      isSubscribed = false;
      return Promise.resolve(false);
    }
    return fetch('/api/razorpay/subscription-status')
      .then(res => res.json())
      .then(data => {
        isSubscribed = !!(data.success && data.isSubscribed);
        return isSubscribed;
      })
      .catch(err => {
        console.error('Error fetching subscription status:', err);
        isSubscribed = false;
        return false;
      });
  }


  // Render subscription modal popup
  function showPaywall(mode) {
    // Prevent duplicate modals
    if (document.getElementById('paywall-modal')) return;

    // Create the modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'paywall-modal-backdrop';
    modalBackdrop.id = 'paywall-modal';

    let cardContent = '';
    if (mode === 'unauthenticated') {
      cardContent = `
        <div class="paywall-card">
          <button class="paywall-close-btn" id="paywall-close-btn">&times;</button>
          <div class="paywall-icon">🔒</div>
          <h2 class="paywall-title">MindSpace Premium</h2>
          <p class="paywall-message">
            Subscribe to MindSpace Premium to unlock and access all CBT exercises, guided practices, worksheets, and self-help tools.
          </p>
          <div class="paywall-pricing">₹900.00 / month</div>
          <button id="paywall-action-btn" class="paywall-btn">Sign In to Subscribe</button>
        </div>
      `;
    } else {
      cardContent = `
        <div class="paywall-card">
          <button class="paywall-close-btn" id="paywall-close-btn">&times;</button>
          <div class="paywall-icon">💎</div>
          <h2 class="paywall-title">Unlock Premium Resource</h2>
          <p class="paywall-message">
            Avail of this resource and get unlimited access to guided meditations, cognitive behavioral challenges, and self-help workbooks.
          </p>
          <div class="paywall-pricing">₹900.00 / month</div>
          <button id="paywall-action-btn" class="paywall-btn">Subscribe to Unlock</button>
        </div>
      `;
    }

    modalBackdrop.innerHTML = cardContent;
    document.body.appendChild(modalBackdrop);

    // Bind Close Button
    const closeBtn = document.getElementById('paywall-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hidePaywall);
    }

    // Dismiss modal on clicking outside the card
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        hidePaywall();
      }
    });

    // Bind Subscribe / Sign In button
    const actionBtn = document.getElementById('paywall-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', async () => {
        if (mode === 'unauthenticated') {
          window.location.href = 'login.html';
        } else {
          actionBtn.disabled = true;
          actionBtn.textContent = 'Preparing checkout...';
          try {
            const res = await fetch('/api/razorpay/create-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
              if (data.mock) {
                // Redirect to simulated checkout page
                window.location.href = data.url;
              } else if (data.subscriptionId && data.keyId) {
                // Launch native Razorpay iframe popup
                openRazorpayCheckout(data.keyId, data.subscriptionId, actionBtn);
              } else {
                alert('Invalid response structure from server.');
                actionBtn.disabled = false;
                actionBtn.textContent = 'Subscribe to Unlock';
              }
            } else {
              alert(data.message || 'Unable to open checkout portal.');
              actionBtn.disabled = false;
              actionBtn.textContent = 'Subscribe to Unlock';
            }
          } catch (err) {
            console.error('Failed to initiate checkout:', err);
            alert('Failed to reach payment gateway. Please check your network connection.');
            actionBtn.disabled = false;
            actionBtn.textContent = 'Subscribe to Unlock';
          }
        }
      });
    }
  }

  // Launch Razorpay native payments modal
  function openRazorpayCheckout(keyId, subscriptionId, actionBtn) {
    if (typeof Razorpay === 'undefined') {
      alert('Razorpay script is still loading. Please try again in a moment.');
      actionBtn.disabled = false;
      actionBtn.textContent = 'Subscribe to Unlock';
      return;
    }

    const options = {
      key: keyId,
      subscription_id: subscriptionId,
      name: "MindSpace Premium",
      description: "Monthly mental health premium resources paywall bypass",
      theme: {
        color: "#06B6D4"
      },
      handler: async function (response) {
        actionBtn.textContent = 'Verifying payment...';
        try {
          const res = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const result = await res.json();
          if (res.ok && result.success) {
            isSubscribed = true;
            hidePaywall();
            alert('MindSpace Premium Subscription Activated! 🎉');
            window.location.reload();
          } else {
            alert(result.message || 'Payment signature verification failed.');
            actionBtn.disabled = false;
            actionBtn.textContent = 'Subscribe to Unlock';
          }
        } catch (err) {
          console.error('Payment verification failed:', err);
          alert('Verification error. Please try again.');
          actionBtn.disabled = false;
          actionBtn.textContent = 'Subscribe to Unlock';
        }
      },
      modal: {
        ondismiss: function () {
          actionBtn.disabled = false;
          actionBtn.textContent = 'Subscribe to Unlock';
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  // Remove the paywall modal
  function hidePaywall() {
    const modal = document.getElementById('paywall-modal');
    if (modal) {
      modal.remove();
    }
  }

  // Paywall interceptor check
  function handleResourceClick(e) {
    // If user is already subscribed, let the click proceed to open resource
    if (isSubscribed) {
      const title = e.currentTarget.querySelector('.cat-name, .feat-title, .tool-title')?.textContent || 'Resource';
      alert(`Opening Premium Resource: ${title} 📖`);
      return;
    }

    // Otherwise, block access and launch the paywall modal
    e.preventDefault();
    e.stopPropagation();
    showPaywall(token ? 'unsubscribed' : 'unauthenticated');
  }

  // Attach dynamic handlers to Resource Explore icons, cards, and buttons
  function attachInterceptors() {
    const categories = document.querySelectorAll('.cat-card');
    const featured = document.querySelectorAll('.feat-card');
    const tools = document.querySelectorAll('.tool-btn');
    const recommended = document.querySelectorAll('.rec-item');

    categories.forEach(el => el.addEventListener('click', handleResourceClick));
    featured.forEach(el => el.addEventListener('click', handleResourceClick));
    tools.forEach(el => el.addEventListener('click', handleResourceClick));
    recommended.forEach(el => el.addEventListener('click', handleResourceClick));
  }

  // Run interceptor bindings
  attachInterceptors();
});
