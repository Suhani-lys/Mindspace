// Chat Rooms — MindSpace

const socket = io();

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

let activeRoom = 'exam';
let typingTimeout;
typingIndicator.style.display = 'none';

// Room tab switching
document.querySelectorAll('.rtab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
  });
});

// Join default room on load
socket.emit('join_room', activeRoom);

// Join room selection handler
roomCards.forEach(card => {
  const joinBtn = card.querySelector('.join-btn');

  function openRoom() {
    roomCards.forEach(c => c.classList.remove('active-room'));
    card.classList.add('active-room');

    activeRoom = card.dataset.room;
    chName.textContent = card.dataset.name;
    chCount.textContent = card.dataset.online;
    chIcon.textContent = card.dataset.icon;

    // Clear list and add generic welcome message
    messagesArea.innerHTML = `
      <div style="text-align: center; margin: 15px 0; color: var(--t3); font-size: 11.5px; letter-spacing: 0.5px;">
        🔒 Joined #${card.dataset.name} Room
      </div>
    `;

    socket.emit('join_room', activeRoom);

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

  socket.emit('send_message', {
    room: activeRoom,
    message: text,
    sender: 'You'
  });

  chatInput.value = '';
  socket.emit('stop_typing', { room: activeRoom });
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    sendMessage();
  } else {
    // Emit typing
    socket.emit('typing', { room: activeRoom });
    
    // Throttle stop typing
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { room: activeRoom });
    }, 1000);
  }
});

// React to messages
messagesArea.addEventListener('click', e => {
  const react = e.target.closest('.msg-react');
  if (!react) return;
  const parts = react.textContent.trim().split(' ');
  const count = parseInt(parts[1] || '0') + 1;
  react.textContent = `💜 ${count}`;
});

// Listeners
socket.on('receive_message', (data) => {
  const isMe = data.senderId === socket.id;
  const row = document.createElement('div');
  
  if (isMe) {
    row.className = 'msg-row you';
    row.innerHTML = `
      <div class="msg-wrap">
        <div class="msg-meta you-meta">
          <span class="msg-time">${getTime()}</span>
          <span class="msg-name">You</span>
        </div>
        <div class="msg-bubble you-bubble ${data.flagged ? 'flagged-bubble' : ''}" style="${data.flagged ? 'color: #ef4444; border: 1px dashed rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); font-style: italic;' : ''}">${escapeHtml(data.message)}</div>
        <div class="msg-react you-react">💜 0</div>
      </div>`;
  } else {
    row.className = 'msg-row other';
    row.innerHTML = `
      <div class="msg-avatar">👤</div>
      <div class="msg-wrap">
        <div class="msg-meta">
          <span class="msg-name">${data.flagged ? 'System' : 'Anonymous'}</span>
          <span class="msg-time">${getTime()}</span>
        </div>
        <div class="msg-bubble other-bubble ${data.flagged ? 'flagged-bubble' : ''}" style="${data.flagged ? 'color: #ef4444; border: 1px dashed rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); font-style: italic;' : ''}">${escapeHtml(data.message)}</div>
        <div class="msg-react">💜 0</div>
      </div>`;
  }

  messagesArea.appendChild(row);
  messagesArea.scrollTop = messagesArea.scrollHeight;
});

// Crisis warning handler
socket.on('crisis_warning', (data) => {
  const card = document.createElement('div');
  card.className = 'crisis-card';
  card.style.cssText = `
    background: rgba(220, 50, 80, 0.08);
    border: 1px solid rgba(220, 50, 80, 0.25);
    border-radius: 10px;
    padding: 14px 16px;
    margin: 15px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  
  let hotlinesHtml = '';
  data.hotlines.forEach(h => {
    hotlinesHtml += `<div style="font-weight: 600; font-size: 12.5px; color: #f87171;">📞 ${h.name}: ${h.number}</div>`;
  });

  card.innerHTML = `
    <div style="font-size: 13.5px; font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 6px;">
      🆘 Crisis Support Resources
    </div>
    <div style="font-size: 12.5px; color: var(--t2); line-height: 1.5;">
      ${escapeHtml(data.message)}
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
      ${hotlinesHtml}
    </div>
  `;
  messagesArea.appendChild(card);
  messagesArea.scrollTop = messagesArea.scrollHeight;
});

socket.on('typing', () => {
  typingIndicator.style.display = 'flex';
  messagesArea.scrollTop = messagesArea.scrollHeight;
});

socket.on('stop_typing', () => {
  typingIndicator.style.display = 'none';
});

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
