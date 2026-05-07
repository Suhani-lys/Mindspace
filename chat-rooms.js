// Chat Rooms — MindSpace

const roomCards = document.querySelectorAll('.room-card');
const chatWindow = document.getElementById('chat-window');
const chName = document.getElementById('ch-name');
const chCount = document.getElementById('ch-count');
const chIcon = document.getElementById('ch-icon');
const messagesArea = document.getElementById('messages-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const backBtn = document.getElementById('back-btn');
const safeClose = document.getElementById('safe-close');
const safeBanner = document.querySelector('.safe-banner');
const typingIndicator = document.getElementById('typing-indicator');

// Room tab switching
document.querySelectorAll('.rtab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
  });
});

// Join room
roomCards.forEach(card => {
  const joinBtn = card.querySelector('.join-btn');

  function openRoom() {
    roomCards.forEach(c => c.classList.remove('active-room'));
    card.classList.add('active-room');

    chName.textContent = card.dataset.name;
    chCount.textContent = card.dataset.online;
    chIcon.textContent = card.dataset.icon;

    chatWindow.classList.add('open');
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  card.addEventListener('click', openRoom);
  joinBtn.addEventListener('click', e => { e.stopPropagation(); openRoom(); });
});

// Back button (mobile)
backBtn.addEventListener('click', () => {
  chatWindow.classList.remove('open');
});

// Dismiss safe banner
safeClose.addEventListener('click', () => {
  safeBanner.style.display = 'none';
});

// Send message
function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const row = document.createElement('div');
  row.className = 'msg-row you';
  row.innerHTML = `
    <div class="msg-wrap">
      <div class="msg-meta you-meta"><span class="msg-time">${getTime()}</span><span class="msg-name">You</span></div>
      <div class="msg-bubble you-bubble">${escapeHtml(text)}</div>
      <div class="msg-react you-react">💜 0</div>
    </div>`;
  messagesArea.appendChild(row);
  chatInput.value = '';
  messagesArea.scrollTop = messagesArea.scrollHeight;

  // Simulate typing + reply
  typingIndicator.style.display = 'flex';
  setTimeout(() => {
    typingIndicator.style.display = 'none';
    const replies = [
      "That really resonates with me 💜",
      "You're not alone in feeling this way.",
      "Thank you for sharing that. It takes courage.",
      "Sending you warmth and support 🌸",
      "We're all here for each other. Keep going 💪"
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const replyRow = document.createElement('div');
    replyRow.className = 'msg-row other';
    replyRow.innerHTML = `
      <div class="msg-avatar">👤</div>
      <div class="msg-wrap">
        <div class="msg-meta"><span class="msg-name">Anonymous</span><span class="msg-time">${getTime()}</span></div>
        <div class="msg-bubble other-bubble">${escapeHtml(reply)}</div>
        <div class="msg-react">💜 1</div>
      </div>`;
    messagesArea.appendChild(replyRow);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }, 1800);
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

// React to messages
messagesArea.addEventListener('click', e => {
  const react = e.target.closest('.msg-react');
  if (!react) return;
  const parts = react.textContent.trim().split(' ');
  const count = parseInt(parts[1] || '0') + 1;
  react.textContent = `💜 ${count}`;
});

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Hide typing indicator initially
typingIndicator.style.display = 'none';
