// Replace save entry click handler

// Load journal entries
async function loadJournalEntries() {
  try {
    const res = await fetch('/api/journal');
    const entries = await res.json();
    const list = document.querySelector('.pe-list');
    if(!list || entries.length === 0) return;
    list.innerHTML = '';
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'pe-item';
      item.innerHTML = `
        <span class="pe-mood">${getMoodEmoji(entry.mood)}</span>
        <div class="pe-info">
          <div class="pe-ititle">${entry.text.substring(0,40)}...</div>
          <div class="pe-itext">${entry.text.substring(0,80)}...</div>
        </div>
        <div class="pe-meta">
          <span class="pe-date">${new Date(entry.createdAt).toLocaleDateString()}</span>
          <span class="pe-tag-mood">${entry.mood || ''}</span>
        </div>
      `;
      list.appendChild(item);
    });
  } catch(e){ console.error(e); }
}

function getMoodEmoji(mood) {
  const map = {'Very Sad':'😢','Sad':'😕','Neutral':'😐','Good':'😊','Happy':'😄'};
  return map[mood] || '😐';
}

loadJournalEntries();
// Mode select
document.querySelectorAll('.mode-card').forEach(c=>{
  c.addEventListener('click',()=>{document.querySelectorAll('.mode-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');});
});
// Mood select
document.querySelectorAll('.mood-btn').forEach(b=>{
  b.addEventListener('click',()=>{document.querySelectorAll('.mood-btn').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');});
});
// Tags
document.querySelectorAll('.j-tag:not(.add-tag-btn)').forEach(t=>{t.addEventListener('click',()=>t.classList.toggle('sel'));});
// Word count
const jt=document.getElementById('journal-text');
const wc=document.getElementById('word-count');
jt.addEventListener('input',()=>{const w=jt.value.trim().split(/\s+/).filter(Boolean).length;wc.textContent=w+' word'+(w!==1?'s':'');});
// Save entry
document.getElementById('save-entry-btn').addEventListener('click', async function(){
  if(!jt.value.trim()){jt.focus();return;}
  
  const mood = document.querySelector('.mood-btn.sel')?.dataset.m || '';
  const tags = [...document.querySelectorAll('.j-tag.sel:not(.add-tag-btn)')].map(t=>t.dataset.t);

  try {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ text: jt.value.trim(), mood, tags })
    });
    const data = await res.json();
    if(data.success){
      const orig=this.innerHTML;
      this.innerHTML='✅ Saved!';
      this.style.background='#2d7a4f';
      this.disabled=true;
      loadJournalEntries();
      setTimeout(()=>{this.innerHTML=orig;this.style.background='';this.disabled=false;},2000);
    }
  } catch(e){ console.error(e); }
});

// Save draft
document.getElementById('save-draft-btn').addEventListener('click',function(){const o=this.innerHTML;this.innerHTML='✓ Saved';setTimeout(()=>this.innerHTML=o,1800);});

// Speech Recognition Web Speech API
const micBtn = document.getElementById('mic-btn');
const micStatusText = document.getElementById('mic-status-text');

if (micBtn && micStatusText) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // If Web Speech API not supported, hide button
    micBtn.style.display = 'none';
  } else {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let recognizing = false;

    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (recognizing) {
        recognition.stop();
      } else {
        jt.value = '';
        recognition.start();
      }
    });

    recognition.onstart = () => {
      recognizing = true;
      micStatusText.textContent = 'Listening...';
      micBtn.style.color = '#ef4444'; // red indicator
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = async () => {
      recognizing = false;
      micStatusText.textContent = 'Record Voice';
      micBtn.style.color = 'var(--purple)';

      const text = jt.value.trim();
      if (!text) return;

      try {
        micStatusText.textContent = 'Analyzing Mood...';
        const response = await fetch('/api/ml/predict-emotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const result = await response.json();
        if (result.success && result.emotion) {
          let moodToSelect = 'Neutral';
          const emotion = result.emotion;
          
          if (emotion === 'hopeful') {
            moodToSelect = 'Happy';
          } else if (emotion === 'sad' || emotion === 'lonely') {
            moodToSelect = 'Sad';
          } else if (emotion === 'angry') {
            moodToSelect = 'Sad';
          } else if (emotion === 'anxious' || emotion === 'overwhelmed') {
            moodToSelect = 'Very Sad';
          } else {
            moodToSelect = 'Neutral';
          }

          const btn = Array.from(document.querySelectorAll('.mood-btn')).find(b => b.dataset.m === moodToSelect);
          if (btn) {
            document.querySelectorAll('.mood-btn').forEach(x => x.classList.remove('sel'));
            btn.classList.add('sel');
          }
        }
      } catch (err) {
        console.error('Failed to auto-predict emotion:', err);
      } finally {
        micStatusText.textContent = 'Record Voice';
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      jt.value = (finalTranscript + interimTranscript).trim();
      jt.dispatchEvent(new Event('input'));
    };
  }
}
