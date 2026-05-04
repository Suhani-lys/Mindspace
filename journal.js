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
