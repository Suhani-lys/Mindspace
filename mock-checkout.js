// Mock Checkout Handler

const btnPay = document.getElementById('btn-pay');
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');

if (!userId) {
  alert('Error: User Session ID is missing. Please log in and try again.');
  window.location.href = 'login.html';
}

btnPay.addEventListener('click', async () => {
  btnPay.textContent = 'Processing transaction...';
  btnPay.disabled = true;

  try {
    const res = await fetch('/api/razorpay/mock-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      btnPay.textContent = 'Payment Completed Successfully! ✓';
      btnPay.style.background = '#22c55e';
      
      setTimeout(() => {
        window.location.href = 'resources.html';
      }, 1500);
    } else {
      alert(data.message || 'Payment simulation failed. Please try again.');
      btnPay.textContent = 'Confirm Subscription (Simulated)';
      btnPay.disabled = false;
    }
  } catch (err) {
    console.error('Payment simulation request failed:', err);
    alert('Network error. Unable to verify payment simulation.');
    btnPay.textContent = 'Confirm Subscription (Simulated)';
    btnPay.disabled = false;
  }
});
