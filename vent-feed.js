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
