// Emotion selection
document.querySelectorAll('.em-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.em-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
  });
});

// Category pills (multi-select)
document.querySelectorAll('.cat-pill').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('sel'));
});

// Character counter
const ta = document.getElementById('vent-text');
const cn = document.getElementById('char-now');
ta.addEventListener('input', () => {
  cn.textContent = ta.value.length;
  cn.style.color = ta.value.length > 1800 ? '#e8a7ff' : '';
});

// Tags
const tagsField = document.getElementById('tags-field');
const tagInput  = document.getElementById('tag-input');
let tags = [];

tagInput.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
    e.preventDefault();
    const t = tagInput.value.trim().replace(/,$/,'');
    if (!tags.includes(t) && tags.length < 8) { tags.push(t); renderTags(); }
    tagInput.value = '';
  }
  if (e.key === 'Backspace' && !tagInput.value && tags.length) {
    tags.pop(); renderTags();
  }
});
tagsField.addEventListener('click', () => tagInput.focus());

function renderTags() {
  tagsField.querySelectorAll('.tag-chip').forEach(c => c.remove());
  tags.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${t}<button class="tag-rm" data-i="${i}">×</button>`;
    tagsField.insertBefore(chip, tagInput);
  });
  tagsField.querySelectorAll('.tag-rm').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); tags.splice(+b.dataset.i,1); renderTags(); });
  });
}

// Post Vent
document.getElementById('btn-post').addEventListener('click', function() {
  if (!ta.value.trim()) {
    ta.focus();
    ta.style.borderColor = 'rgba(220,80,80,0.4)';
    setTimeout(() => ta.style.borderColor = '', 1800);
    return;
  }
  this.textContent = 'Posted ✓';
  this.style.background = '#2d7a4f';
  this.disabled = true;
  setTimeout(() => {
    this.innerHTML = 'Post Vent <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.style.background = '';
    this.disabled = false;
  }, 2500);
});

// Save Draft
document.getElementById('btn-draft').addEventListener('click', function() {
  const orig = this.innerHTML;
  this.textContent = 'Saved ✓';
  setTimeout(() => this.innerHTML = orig, 1800);
});

// ── AI Support Chat ──────────────────────────────────────────
const aiResponses = [
  "I hear you. It takes courage to express what you're feeling, and I want you to know that your feelings are completely valid. 💜",
  "That sounds really tough. Remember, it's okay to not be okay sometimes. You don't have to have everything figured out right now.",
  "I'm here with you. Sometimes just putting feelings into words can help lighten the weight. What's been the hardest part for you?",
  "You're not alone in this. Many people feel exactly the way you do, and there's always a path forward, even when it doesn't feel that way.",
  "Thank you for sharing that with me. Your feelings matter, and taking this step to talk about them shows real strength.",
  "It's okay to take things one moment at a time. You don't have to solve everything right now. I'm here whenever you need to talk.",
  "I understand. Feeling overwhelmed can make everything feel impossible. But you've already taken a brave step by reaching out. 💜"
];
let aiIndex = 0;
const aiChat = document.getElementById('ai-chat');
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send-btn');

function addMsg(text, isUser) {
  const div = document.createElement('div');
  div.className = 'ai-msg ' + (isUser ? 'user' : 'bot');
  div.innerHTML = `<div class="ai-msg-av">${isUser ? '🫂' : '🤖'}</div><div class="ai-msg-bub">${text}</div>`;
  aiChat.appendChild(div);
  aiChat.scrollTop = aiChat.scrollHeight;
}

function showTyping() {
  const t = document.createElement('div');
  t.className = 'ai-msg bot';
  t.id = 'ai-typing';
  t.innerHTML = '<div class="ai-msg-av">🤖</div><div class="ai-typing"><span></span><span></span><span></span></div>';
  aiChat.appendChild(t);
  aiChat.scrollTop = aiChat.scrollHeight;
  return t;
}

function sendAI(text) {
  if (!text.trim()) return;
  addMsg(text, true);
  aiInput.value = '';
  const typing = showTyping();
  setTimeout(() => {
    typing.remove();
    addMsg(aiResponses[aiIndex % aiResponses.length], false);
    aiIndex++;
  }, 1200 + Math.random() * 600);
}

aiSend.addEventListener('click', () => sendAI(aiInput.value));
aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAI(aiInput.value); });

document.querySelectorAll('.aip-qbtn').forEach(btn => {
  btn.addEventListener('click', () => sendAI(btn.dataset.msg));
});

// Scroll AI to bottom on "Talk to AI" quick action
const qaAI = document.getElementById('qa-ai');
if (qaAI) qaAI.addEventListener('click', () => {
  document.getElementById('ai-support-card').scrollIntoView({ behavior: 'smooth' });
  aiInput.focus();
});

