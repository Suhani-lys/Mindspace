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
document.getElementById('save-entry-btn').addEventListener('click',function(){
  if(!jt.value.trim()){jt.focus();return;}
  const orig=this.innerHTML;this.innerHTML='✅ Saved!';this.style.background='#2d7a4f';this.disabled=true;
  setTimeout(()=>{this.innerHTML=orig;this.style.background='';this.disabled=false;},2000);
});
// Save draft
document.getElementById('save-draft-btn').addEventListener('click',function(){const o=this.innerHTML;this.innerHTML='✓ Saved';setTimeout(()=>this.innerHTML=o,1800);});
