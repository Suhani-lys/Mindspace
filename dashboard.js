// Dashboard — MindSpace
// Suggest item buttons
document.querySelectorAll('.si-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const title = this.closest('.suggest-item').querySelector('.si-title').textContent;
    this.textContent = 'Done ✓';
    this.style.background = 'rgba(80,200,140,0.12)';
    this.style.borderColor = 'rgba(80,200,140,0.4)';
    this.style.color = '#50c88c';
  });
});
