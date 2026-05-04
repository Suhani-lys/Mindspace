async function loadPosts() {
  try {
    const response = await fetch('/posts');
    const posts = await response.json();
    
    if (posts.length === 0) return;

    const main = document.querySelector('.main');
    const feedTabs = document.querySelector('.feed-tabs');

    // Remove static cards
    document.querySelectorAll('.vent-card').forEach(c => c.remove());

    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'vent-card';
      card.innerHTML = `
        <div class="vc-top">
          <div class="vc-left">
            <div class="avatar av-purple">😶</div>
            <div>
              <div class="vc-meta">
                <span class="vc-name">Anonymous</span>
                <span class="vc-dot">·</span>
                <span class="vc-time">${new Date(post.createdAt).toLocaleDateString()}</span>
                <span class="vc-dot">·</span>
                <span class="vc-cat">${post.predictedEmotion || 'General'}</span>
              </div>
            </div>
          </div>
          <button class="more-btn">⋯</button>
        </div>
        <p class="vc-text">${post.message}</p>
        <div class="vc-actions-row">
          <div class="vc-left-actions">
            <button class="action-btn like-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> 0
            </button>
          </div>
          <button class="save-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Save
          </button>
        </div>
      `;
      main.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

loadPosts();

// Tabs
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');});
});
// Like toggle
document.querySelectorAll('.like-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const liked=btn.classList.toggle('liked');
    const svg=btn.querySelector('svg path');
    svg.style.fill=liked?'#f87171':'none';
    const parts=btn.innerHTML.split(/(?<=\d)/);
    const num=parseInt(btn.textContent.match(/\d+/)[0]);
    btn.innerHTML=btn.innerHTML.replace(/\d+/,liked?num+1:num-1);
    if(liked)btn.querySelector('svg path').style.fill='#f87171';
  });
});
// Save toggle
document.querySelectorAll('.save-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const saved=btn.classList.toggle('saved');
    btn.innerHTML=saved?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="#9B6EFF" stroke-width="1.8" stroke-linecap="round"/></svg> Saved':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Save';
  });
});
