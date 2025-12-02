import { app, auth } from "./auth.js";
import {
  getDatabase,
  ref,
  get,
  query,
  orderByKey,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Chart instances
let wellnessChart = null;
let habitsChart = null;
let moodChart = null;
let performanceChart = null;
let currentTimeRange = 'week';
let db = null;

document.addEventListener("DOMContentLoaded", () => {
  db = getDatabase(app);
  
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    console.log("User logged in for analytics:", user.uid);
    loadAnalyticsDataForUser(user.uid, currentTimeRange);
  });

  // Expose function to global scope
  window.loadAnalyticsData = function(timeRange) {
    currentTimeRange = timeRange;
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadAnalyticsDataForUser(user.uid, timeRange);
      }
    });
  };
});

async function loadAnalyticsDataForUser(userId, timeRange = 'week') {
  console.log("Loading analytics for user:", userId, "timeRange:", timeRange);
  
  try {
    // Show loading states
    showLoadingStates();
    
    const [wellnessScores, habitsData, moodsData, streakData] = await Promise.all([
      loadWellnessScores(userId, timeRange),
      loadHabitsData(userId),
      loadMoodsData(userId, timeRange),
      loadStreakData(userId)
    ]);
    
    console.log("Data loaded:", {
      wellnessScores: wellnessScores.length,
      habitsData,
      moodsData,
      streakData
    });
    
    // Hide loading states
    hideLoadingStates();
    
    // Render charts and insights
    renderAllCharts(wellnessScores, habitsData, moodsData, streakData);
    updateInsights(wellnessScores, habitsData, moodsData, streakData);
    
  } catch (error) {
    console.error("Error loading analytics data:", error);
    hideLoadingStates();
    showNoDataStates();
  }
}

function showLoadingStates() {
  // Show all loading indicators
  document.querySelectorAll('.loading-chart').forEach(el => el.style.display = 'flex');
  document.querySelectorAll('canvas').forEach(canvas => canvas.style.display = 'none');
  document.querySelectorAll('.no-data').forEach(el => el.style.display = 'none');
}

function hideLoadingStates() {
  document.querySelectorAll('.loading-chart').forEach(el => el.style.display = 'none');
}

function showNoDataStates() {
  document.querySelectorAll('.no-data').forEach(el => {
    el.style.display = 'flex';
  });
}

async function loadWellnessScores(userId, timeRange) {
  const wellnessRef = ref(db, `users/${userId}/wellnessScores`);
  const snapshot = await get(wellnessRef);
  const allScores = snapshot.val() || {};
  
  console.log("All wellness scores:", allScores);
  
  if (Object.keys(allScores).length === 0) {
    // Show no data state for wellness chart
    document.getElementById('wellnessChartNoData').style.display = 'flex';
    document.getElementById('wellnessChart').style.display = 'none';
    return [];
  }
  
  // Filter by time range
  const filteredScores = filterByTimeRange(allScores, timeRange);
  
  // Convert to array and sort by date
  const scoresArray = Object.entries(filteredScores)
    .map(([date, data]) => ({
      date,
      score: data.score || 0,
      habits: data.habits || 0
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return scoresArray;
}

async function loadHabitsData(userId) {
  const habitsRef = ref(db, `users/${userId}/habits`);
  const snapshot = await get(habitsRef);
  const habits = snapshot.val() || {};
  
  console.log("All habits:", habits);
  
  if (Object.keys(habits).length === 0) {
    // Show no data state for habits chart
    document.getElementById('habitsChartNoData').style.display = 'flex';
    document.getElementById('habitsChart').style.display = 'none';
    return {
      habits: [],
      totalCompleted: 0,
      totalHabits: 0,
      completionRate: 0
    };
  }
  
  // Calculate completion rates
  const habitStats = [];
  let totalCompleted = 0;
  let totalHabits = 0;
  
  for (const habitId in habits) {
    const habit = habits[habitId];
    const completionRate = habit.completionRate || (habit.completedToday ? 100 : 0);
    
    habitStats.push({
      name: habit.name || 'Unnamed Habit',
      completionRate: completionRate,
      streak: habit.streak || 0,
      completedToday: habit.completedToday || false
    });
    
    totalHabits++;
    if (habit.completedToday) totalCompleted++;
  }
  
  return {
    habits: habitStats,
    totalCompleted,
    totalHabits,
    completionRate: totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) : 0
  };
}

async function loadMoodsData(userId, timeRange) {
  const moodsRef = ref(db, `users/${userId}/moods`);
  const snapshot = await get(moodsRef);
  const allMoods = snapshot.val() || {};
  
  console.log("All moods:", allMoods);
  
  if (Object.keys(allMoods).length === 0) {
    // Show no data state for mood chart
    document.getElementById('moodChartNoData').style.display = 'flex';
    document.getElementById('moodChart').style.display = 'none';
    return {
      distribution: {},
      totalMoods: 0,
      topMood: '😐',
      topMoodPercentage: 0
    };
  }
  
  // Filter by time range
  const filteredMoods = filterByTimeRange(allMoods, timeRange);
  
  // Calculate mood distribution
  const moodDistribution = {};
  let totalMoods = 0;
  
  Object.values(filteredMoods).forEach(mood => {
    const emoji = mood.mood || '😐';
    moodDistribution[emoji] = (moodDistribution[emoji] || 0) + 1;
    totalMoods++;
  });
  
  // Find top mood
  let topMood = '😐';
  let topCount = 0;
  
  for (const [emoji, count] of Object.entries(moodDistribution)) {
    if (count > topCount) {
      topMood = emoji;
      topCount = count;
    }
  }
  
  return {
    distribution: moodDistribution,
    totalMoods,
    topMood,
    topMoodPercentage: totalMoods > 0 ? Math.round((topCount / totalMoods) * 100) : 0
  };
}

async function loadStreakData(userId) {
  const statsRef = ref(db, `users/${userId}/stats`);
  const snapshot = await get(statsRef);
  const stats = snapshot.val() || {};
  
  return {
    currentStreak: stats.currentStreak || 0,
    bestStreak: stats.bestStreak || 0,
    weeklyTrend: stats.weeklyTrend || 0
  };
}

function filterByTimeRange(data, timeRange) {
  const now = new Date();
  const filtered = {};
  
  for (const [key, value] of Object.entries(data)) {
    try {
      // Try to parse date from key (could be date string or timestamp)
      let date;
      if (key.includes('-')) {
        // Format: YYYY-MM-DD
        date = new Date(key);
      } else if (typeof value === 'object' && value.timestamp) {
        // Use timestamp from data
        date = new Date(value.timestamp);
      } else {
        // Try to parse as date
        date = new Date(key);
      }
      
      if (isNaN(date.getTime())) {
        continue; // Skip invalid dates
      }
      
      let shouldInclude = false;
      
      switch (timeRange) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          shouldInclude = date >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          shouldInclude = date >= monthAgo;
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          shouldInclude = date >= yearAgo;
          break;
        default:
          shouldInclude = true;
      }
      
      if (shouldInclude) {
        filtered[key] = value;
      }
    } catch (error) {
      console.warn("Error parsing date:", key, error);
    }
  }
  
  console.log(`Filtered ${Object.keys(data).length} to ${Object.keys(filtered).length} for ${timeRange}`);
  return filtered;
}

function renderAllCharts(wellnessScores, habitsData, moodsData, streakData) {
  console.log("Rendering charts with data:", {
    wellnessScoresLength: wellnessScores.length,
    habitsCount: habitsData.habits.length,
    moodsCount: moodsData.totalMoods
  });
  
  if (wellnessScores.length > 0) {
    renderWellnessChart(wellnessScores);
  }
  
  if (habitsData.totalHabits > 0) {
    renderHabitsChart(habitsData);
  }
  
  if (moodsData.totalMoods > 0) {
    renderMoodChart(moodsData);
  }
  
  if (habitsData.habits.length > 0) {
    renderPerformanceChart(habitsData);
  }
}

function renderWellnessChart(scores) {
  const canvas = document.getElementById('wellnessChart');
  const ctx = canvas.getContext('2d');
  
  // Destroy previous chart if exists
  if (wellnessChart) {
    wellnessChart.destroy();
  }
  
  // Show canvas
  canvas.style.display = 'block';
  document.getElementById('wellnessChartNoData').style.display = 'none';
  
  const dates = scores.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const wellnessValues = scores.map(item => item.score);
  
  // Calculate trend
  let trend = '→';
  let trendClass = 'neutral';
  
  if (wellnessValues.length >= 2) {
    const first = wellnessValues[0];
    const last = wellnessValues[wellnessValues.length - 1];
    const diff = last - first;
    
    if (diff > 0) {
      trend = '↗';
      trendClass = 'up';
    } else if (diff < 0) {
      trend = '↘';
      trendClass = 'down';
    }
    
    document.getElementById('trendIndicator').textContent = `${trend} ${diff >= 0 ? '+' : ''}${diff}`;
    document.getElementById('trendIndicator').className = `widget-badge ${trendClass}`;
  } else {
    document.getElementById('trendIndicator').textContent = 'No trend';
  }
  
  wellnessChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Wellness Score',
        data: wellnessValues,
        borderColor: '#8d3bbf',
        backgroundColor: 'rgba(141, 59, 191, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8d3bbf',
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Score: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderHabitsChart(habitsData) {
  const canvas = document.getElementById('habitsChart');
  const ctx = canvas.getContext('2d');
  
  if (habitsChart) {
    habitsChart.destroy();
  }
  
  // Show canvas
  canvas.style.display = 'block';
  document.getElementById('habitsChartNoData').style.display = 'none';
  
  // Update completion rate badge
  document.getElementById('completionRate').textContent = `${habitsData.completionRate}%`;
  
  const completed = habitsData.totalCompleted;
  const pending = habitsData.totalHabits - completed;
  
  habitsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [completed, pending],
        backgroundColor: [
          '#4CAF50',
          '#FF9800'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderMoodChart(moodsData) {
  const canvas = document.getElementById('moodChart');
  const ctx = canvas.getContext('2d');
  
  if (moodChart) {
    moodChart.destroy();
  }
  
  // Show canvas
  canvas.style.display = 'block';
  document.getElementById('moodChartNoData').style.display = 'none';
  
  // Update top mood badge
  document.getElementById('topMood').textContent = 
    `${moodsData.topMood} ${moodsData.topMoodPercentage}%`;
  
  const moodLabels = Object.keys(moodsData.distribution);
  const moodCounts = Object.values(moodsData.distribution);
  
  // Mood colors mapping
  const moodColors = {
    '😊': '#FFD700', // Gold
    '😄': '#4CAF50', // Green
    '😍': '#FF4081', // Pink
    '🤩': '#FF5722', // Deep Orange
    '🙂': '#8BC34A', // Light Green
    '😐': '#9E9E9E', // Gray
    '😌': '#03A9F4', // Blue
    '😴': '#673AB7', // Purple
    '😟': '#FF9800', // Orange
    '😢': '#2196F3', // Light Blue
    '😠': '#F44336', // Red
    '😰': '#795548', // Brown
    '😔': '#607D8B'  // Blue Grey
  };
  
  const backgroundColors = moodLabels.map(emoji => moodColors[emoji] || '#9E9E9E');
  
  moodChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: moodLabels,
      datasets: [{
        label: 'Count',
        data: moodCounts,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderPerformanceChart(habitsData) {
  const canvas = document.getElementById('performanceChart');
  const ctx = canvas.getContext('2d');
  
  if (performanceChart) {
    performanceChart.destroy();
  }
  
  // Show canvas
  canvas.style.display = 'block';
  document.getElementById('performanceChartNoData').style.display = 'none';
  
  // Sort habits by completion rate
  const topHabits = [...habitsData.habits]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);
  
  if (topHabits.length === 0) {
    document.getElementById('performanceChartNoData').style.display = 'flex';
    canvas.style.display = 'none';
    return;
  }
  
  const habitNames = topHabits.map(h => h.name.length > 15 ? h.name.substring(0, 12) + '...' : h.name);
  const completionRates = topHabits.map(h => h.completionRate);
  
  // Update best streak badge
  const bestStreak = Math.max(...topHabits.map(h => h.streak));
  document.getElementById('bestStreak').textContent = `${bestStreak} days`;
  
  performanceChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: habitNames,
      datasets: [{
        label: 'Completion Rate (%)',
        data: completionRates,
        backgroundColor: 'rgba(106, 237, 193, 0.2)',
        borderColor: '#6aedc1',
        borderWidth: 2,
        pointBackgroundColor: '#6aedc1',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '%';
            }
          },
          pointLabels: {
            font: {
              size: 11
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function updateInsights(wellnessScores, habitsData, moodsData, streakData) {
  // Current Streak
  document.getElementById('currentStreakInsight').textContent = 
    `${streakData.currentStreak} days`;
  
  // Average Completion
  document.getElementById('avgCompletion').textContent = 
    `${habitsData.completionRate}%`;
  
  // Consistency Score (average wellness score for the period)
  const avgWellness = wellnessScores.length > 0 
    ? Math.round(wellnessScores.reduce((sum, item) => sum + item.score, 0) / wellnessScores.length)
    : 0;
  document.getElementById('consistencyScore').textContent = avgWellness;
  
  // Best Day
  if (wellnessScores.length > 0) {
    const bestDay = wellnessScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    document.getElementById('bestDayScore').textContent = bestDay.score;
    const bestDate = new Date(bestDay.date);
    document.getElementById('bestDayDate').textContent = 
      bestDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
  }
  
  // Calculate trends
  if (wellnessScores.length >= 2) {
    const firstScore = wellnessScores[0].score;
    const lastScore = wellnessScores[wellnessScores.length - 1].score;
    const trend = lastScore - firstScore;
    
    document.getElementById('completionTrend').textContent = 
      `${trend >= 0 ? '+' : ''}${trend} points from start`;
    document.getElementById('completionTrend').className = 
      trend >= 0 ? 'trend-up' : 'trend-down';
  }
}

// For debugging
window.debugAnalytics = function() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Debug analytics for user:", user.uid);
      
      // Check all data paths
      const paths = ['habits', 'moods', 'stats', 'wellnessScores'];
      paths.forEach(path => {
        get(ref(db, `users/${user.uid}/${path}`)).then(snap => {
          console.log(`${path}:`, snap.val());
        });
      });
    }
  });
};