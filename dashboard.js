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

async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    if (!data.success) return;

    // 1. Update summary cards
    document.getElementById('vents-count-value').textContent = data.ventsCount;
    document.getElementById('journals-count-value').textContent = data.journalsCount;
    document.getElementById('calm-days-value').textContent = data.calmDays;
    
    // Update most frequent mood
    const moodEmojis = {
      'Very Sad': '😢',
      'Sad': '😕',
      'Neutral': '😐',
      'Good': '😊',
      'Calm': '😊',
      'Happy': '😄'
    };
    
    document.getElementById('frequent-mood-value').textContent = data.mostFrequentMood;
    document.getElementById('frequent-mood-emoji').textContent = moodEmojis[data.mostFrequentMood] || '😐';
    document.getElementById('frequent-mood-pct').textContent = `${data.frequentMoodPercentage}% of the time`;

    // 2. Update streak and progress ring
    const streak = data.streak;
    document.getElementById('progress-pct').textContent = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;
    document.getElementById('progress-note').textContent = streak > 0 ? `Current streak: ${streak} days 🔥` : 'Start a check-in today!';
    
    const maxStreakForProgress = 7;
    const progressPercent = Math.min((streak / maxStreakForProgress) * 100, 100);
    const circle = document.getElementById('progress-circle');
    if (circle) {
      const offset = 314 * (1 - progressPercent / 100);
      circle.setAttribute('stroke-dashoffset', offset);
    }

    // 3. Render Chart.js
    const ctx = document.getElementById('moodChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.timeline.labels,
        datasets: [{
          label: 'Mood Level',
          data: data.timeline.data,
          borderColor: '#06B6D4',
          borderWidth: 2.5,
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
            gradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#06B6D4',
          pointBorderColor: '#111116',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 5,
            bottom: 5,
            left: 5,
            right: 5
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const score = context.raw;
                if (score >= 4.5) return '😄 Happy';
                if (score >= 3.5) return '😌 Calm';
                if (score >= 2.5) return '😐 Neutral';
                if (score >= 1.5) return '😟 Anxious';
                return '😢 Sad';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { display: false }
          },
          y: {
            min: 1,
            max: 5,
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
              drawTicks: false
            },
            ticks: { display: false }
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to load analytics dashboard:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
