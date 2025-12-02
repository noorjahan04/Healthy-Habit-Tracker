import { app, auth } from "./auth.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  get,
  remove
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const db = getDatabase(app);
  let currentUserId = null;

  const habitList = document.getElementById("habit-list");
  const progressPercent = document.getElementById("progressPercent");
  const completedHabits = document.getElementById("completedHabits");
  const currentStreak = document.getElementById("currentStreak");
  const moodSummary = document.getElementById("mood-summary");
  const moodList = document.getElementById("mood-history-list");

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
  }
  
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    currentUserId = user.uid;
    console.log("User logged in:", currentUserId);
    
    // Load all data
    loadAllData(currentUserId);
  });

  function loadAllData(userId) {
    loadHabits(userId);
    loadMoods(userId);
    loadStats(userId);
    // Calculate and store wellness score
    calculateAndStoreWellnessScore(userId);
  }

  // Add this function to calculate and store wellness score
  async function calculateAndStoreWellnessScore(userId) {
    try {
      // Get all data needed for wellness calculation
      const [habitsSnap, moodsSnap, statsSnap] = await Promise.all([
        get(ref(db, `users/${userId}/habits`)),
        get(ref(db, `users/${userId}/moods`)),
        get(ref(db, `users/${userId}/stats`))
      ]);
      
      const habits = habitsSnap.val() || {};
      const moods = moodsSnap.val() || {};
      const stats = statsSnap.val() || {};
      
      let totalScore = 0;
      
      // 1. Habit Completion (50 points)
      if (habits) {
        const totalHabits = Object.keys(habits).length;
        let completedHabits = 0;
        
        for (const habitId in habits) {
          if (habits[habitId].completedToday) {
            completedHabits++;
          }
        }
        
        const habitCompletionRate = totalHabits > 0 ? completedHabits / totalHabits : 0;
        totalScore += habitCompletionRate * 50;
      }
      
      // 2. Mood Analysis (30 points)
      if (moods) {
        const moodEntries = Object.values(moods);
        if (moodEntries.length > 0) {
          // Calculate average mood score
          let moodSum = 0;
          const moodScores = {
            '😊': 10, '😄': 10, '😍': 10, '🤩': 10,
            '😐': 6, '😌': 7, '🙂': 8, '😴': 5,
            '😟': 3, '😢': 2, '😠': 2, '😰': 3, '😔': 3,
          };
          
          moodEntries.forEach(mood => {
            const emoji = mood.mood || '😐';
            moodSum += moodScores[emoji] || 5;
          });
          
          const avgMoodScore = moodSum / moodEntries.length;
          totalScore += (avgMoodScore / 10) * 30;
        }
      }
      
      // 3. Consistency Streak (20 points)
      const streak = stats.currentStreak || 0;
      const streakScore = Math.min(streak, 5) * 4; // Max 20 points for 5+ day streak
      totalScore += streakScore;
      
      // Round the score and ensure it doesn't exceed 100
      const finalScore = Math.min(Math.round(totalScore), 100);
      
      // Store the wellness score
      const today = new Date().toISOString().split('T')[0];
      const wellnessRef = ref(db, `users/${userId}/wellnessScores/${today}`);
      
      await update(wellnessRef, {
        score: finalScore,
        habits: habits ? Object.keys(habits).length : 0,
        date: today,
        timestamp: new Date().toISOString()
      });
      
      console.log("Wellness score calculated and stored:", finalScore);
      
      // Update the dashboard display with the new score
      updateDashboardWellnessScore(finalScore, habits);
      
    } catch (error) {
      console.error("Error calculating wellness score:", error);
    }
  }

  // Function to update dashboard wellness score display
  function updateDashboardWellnessScore(score, habits) {
    // Update the wellness circle progress
    const circleProgress = document.querySelector('.circle-progress');
    if (circleProgress) {
      circleProgress.style.setProperty('--progress', `${score}%`);
    }
    
    // Update the percentage text
    if (progressPercent) {
      progressPercent.textContent = `${score}%`;
    }
    
    // Update completed habits count if available
    if (habits && completedHabits) {
      let completedCount = 0;
      for (const habitId in habits) {
        if (habits[habitId].completedToday) {
          completedCount++;
        }
      }
      completedHabits.textContent = completedCount;
    }
  }

  function loadHabits(userId) {
    console.log("Loading habits for user:", userId);
    const habitsRef = ref(db, `users/${userId}/habits`);
    
    onValue(habitsRef, (snap) => {
      console.log("Habits snapshot received:", snap.val());
      habitList.innerHTML = "";
      let completedCount = 0;
      let totalCount = 0;
      const habits = snap.val();

      if (!habits || Object.keys(habits).length === 0) {
        habitList.innerHTML = `
          <li class="empty-state">
            <i class="fas fa-tasks"></i>
            <p>No habits yet. <a href="add-habit.html">Add one!</a></p>
          </li>
        `;
        updateWellnessScore(0, 0);
        return;
      }

      for (const habitId in habits) {
        const habit = habits[habitId];
        totalCount++;
        if (habit.completedToday) completedCount++;

        // Create habit item
        const li = createHabitItem(habitId, habit, userId);
        habitList.appendChild(li);
      }

      updateWellnessScore(completedCount, totalCount);
      
      // After loading habits, calculate wellness score
      calculateAndStoreWellnessScore(userId);
      
    }, (error) => {
      console.error("Error loading habits:", error);
      habitList.innerHTML = `
        <li class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load habits. Please refresh the page.</p>
        </li>
      `;
    });
  }

  function createHabitItem(habitId, habit, userId) {
    const li = document.createElement("li");
    li.className = "habit-card";
    li.dataset.habitId = habitId;
    
    const isCompleted = habit.completedToday || false;
    const statusText = isCompleted ? "Done" : "Pending";
    const statusClass = isCompleted ? "done" : "pending";
    
    li.innerHTML = `
      <div class="habit-main">
        <div class="habit-left">
          <div class="habit-checkbox ${isCompleted ? 'checked' : ''}">
            <i class="fas fa-check"></i>
          </div>
          <div>
            <strong class="habit-name">${habit.name || 'Unnamed Habit'}</strong>
            <div class="habit-time">Daily</div>
          </div>
        </div>
        <span class="status ${statusClass}">
          ${statusText}
        </span>
      </div>
      <div class="habit-actions">
        <button class="edit-btn" data-habit-id="${habitId}">Edit</button>
        <button class="delete-btn" data-habit-id="${habitId}">Delete</button>
      </div>
    `;

    // Add event listeners
    addHabitEventListeners(li, habitId, habit, userId, isCompleted);
    
    return li;
  }

  function addHabitEventListeners(li, habitId, habit, userId, isCompleted) {
    // Toggle completion
    const habitMain = li.querySelector(".habit-main");
    habitMain.addEventListener("click", (e) => {
      if (e.target.closest(".habit-actions")) return;
      
      const newStatus = !isCompleted;
      const habitRef = ref(db, `users/${userId}/habits/${habitId}`);
      
      update(habitRef, {
        completedToday: newStatus,
        lastUpdated: new Date().toISOString()
      }).then(() => {
        console.log("Habit toggled:", habitId);
        // Recalculate wellness score
        calculateAndStoreWellnessScore(userId);
        // Show visual feedback
        showNotification(`Habit marked as ${newStatus ? "completed" : "pending"}!`);
      }).catch((error) => {
        console.error("Error toggling habit:", error);
        showNotification("Failed to update habit", "error");
      });
    });

    // Edit habit
    const editBtn = li.querySelector(".edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const newName = prompt("Enter new habit name:", habit.name);
      if (newName && newName.trim()) {
        const habitRef = ref(db, `users/${userId}/habits/${habitId}`);
        update(habitRef, {
          name: newName.trim(),
          lastUpdated: new Date().toISOString()
        }).then(() => {
          console.log("Habit edited:", habitId);
          showNotification("Habit updated successfully!");
        }).catch((error) => {
          console.error("Error editing habit:", error);
          showNotification("Failed to update habit", "error");
        });
      }
    });

    // Delete habit
    const deleteBtn = li.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const habitName = habit.name || "this habit";
      console.log("Attempting to delete habit:", habitId, habitName);
      
      if (confirm(`Are you sure you want to delete "${habitName}"?`)) {
        const habitRef = ref(db, `users/${userId}/habits/${habitId}`);
        
        console.log("Firebase reference path:", habitRef.toString());
        
        remove(habitRef)
          .then(() => {
            console.log("Successfully deleted habit from Firebase:", habitId);
            // Recalculate wellness score after deletion
            calculateAndStoreWellnessScore(userId);
            showNotification(`"${habitName}" deleted successfully!`);
            
            // Remove from UI immediately
            li.remove();
            
            // Update habit counts
            updateHabitCounts(userId);
          })
          .catch((error) => {
            console.error("Firebase delete error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            showNotification(`Failed to delete: ${error.message}`, "error");
          });
      }
    });
  }

  function updateHabitCounts(userId) {
    const habitsRef = ref(db, `users/${userId}/habits`);
    get(habitsRef).then((snap) => {
      const habits = snap.val();
      let completedCount = 0;
      let totalCount = 0;
      
      if (habits) {
        for (const habitId in habits) {
          totalCount++;
          if (habits[habitId].completedToday) completedCount++;
        }
      }
      
      updateWellnessScore(completedCount, totalCount);
    });
  }

  function loadMoods(userId) {
    const moodsRef = ref(db, `users/${userId}/moods`);
    
    onValue(moodsRef, (snap) => {
      moodList.innerHTML = "";
      const moods = snap.val();
      
      if (!moods) {
        moodList.innerHTML = `
          <li class="empty-state">
            <i class="fas fa-smile"></i>
            <p>No mood history yet. <a href="mood.html">Add one!</a></p>
          </li>
        `;
        moodSummary.textContent = "Summary: No data available.";
        return;
      }

      let moodCounts = {};
      Object.entries(moods).forEach(([key, mood]) => {
        const emoji = mood.mood || "😐";
        const note = mood.note || "No note";
        const date = mood.date || key;
        
        moodCounts[emoji] = (moodCounts[emoji] || 0) + 1;

        const li = createMoodItem(key, date, emoji, note, userId);
        moodList.appendChild(li);
      });

      // Calculate mood summary
      const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      const topMood = sorted[0];
      moodSummary.textContent = topMood
        ? `Summary: Mostly feeling "${topMood[0]}" (${topMood[1]} times)`
        : "Summary: No mood trends yet.";
        
      // After loading moods, recalculate wellness score
      calculateAndStoreWellnessScore(userId);
      
    }, (error) => {
      console.error("Error loading moods:", error);
      showNotification("Failed to load moods", "error");
    });
  }

  function createMoodItem(moodId, date, emoji, note, userId) {
    const li = document.createElement("li");
    li.className = "mood-item";
    
    li.innerHTML = `
      <div class="mood-history-content">
        <strong>${date}</strong>
        <span>:</span>
        <span class="emoji">${emoji}</span>
        <span>-</span>
        <em>${note}</em>
      </div>
      <button class="mood-delete-btn" data-mood-id="${moodId}">Delete</button>
    `;

    // Add delete event listener for mood
    const deleteBtn = li.querySelector(".mood-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      
      if (confirm("Delete this mood entry?")) {
        const moodRef = ref(db, `users/${userId}/moods/${moodId}`);
        
        remove(moodRef)
          .then(() => {
            console.log("Mood deleted:", moodId);
            // Recalculate wellness score after deletion
            calculateAndStoreWellnessScore(userId);
            showNotification("Mood entry deleted!");
            li.remove();
          })
          .catch((error) => {
            console.error("Error deleting mood:", error);
            showNotification("Failed to delete mood", "error");
          });
      }
    });

    return li;
  }

  function loadStats(userId) {
    const statsRef = ref(db, `users/${userId}/stats`);
    
    onValue(statsRef, (snap) => {
      const stats = snap.val() || {};
      if (currentStreak) {
        currentStreak.textContent = `${stats.currentStreak || 0} days`;
      }
    });
  }

  function updateWellnessScore(completed, total) {
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Update wellness circle
    const circleProgress = document.querySelector('.circle-progress');
    if (circleProgress) {
      circleProgress.style.setProperty('--progress', `${percent}%`);
    }
    
    // Update percentages
    if (progressPercent) {
      progressPercent.textContent = `${percent}%`;
    }
    
    // Update completed count
    if (completedHabits) {
      completedHabits.textContent = completed;
    }
  }

  function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Style notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#F44336'};
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      z-index: 3000;
      animation: slideIn 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 300px;
    `;
    
    // Add CSS for animations
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Add CSS styles
  const style = document.createElement('style');
  style.textContent = `
    .empty-state, .error-state {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      list-style: none;
    }
    
    .empty-state i, .error-state i {
      font-size: 3rem;
      margin-bottom: 15px;
      opacity: 0.5;
    }
    
    .empty-state a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    
    .empty-state a:hover {
      text-decoration: underline;
    }
    
    .error-state {
      color: var(--danger);
    }
    
    .habit-checkbox {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;
      margin-right: 12px;
    }
    
    .habit-checkbox.checked {
      background: var(--success);
      border-color: var(--success);
      color: white;
    }
    
    .habit-checkbox i {
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .habit-checkbox.checked i {
      opacity: 1;
    }
    
    .habit-time {
      font-size: 0.85rem;
      color: #666;
      margin-top: 3px;
    }
    
    body.dark-mode .habit-time {
      color: #aaa;
    }
    
    .habit-left {
      display: flex;
      align-items: center;
    }
    
    .habit-name {
      font-size: 1.05rem;
      font-weight: 600;
    }
    
    .status {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin: 0 10px;
      white-space: nowrap;
    }
    
    .status.done {
      background: rgba(76, 175, 80, 0.15);
      color: var(--success);
    }
    
    .status.pending {
      background: rgba(255, 152, 0, 0.15);
      color: var(--warning);
    }
    
    .mood-delete-btn {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-weight: bold;
      white-space: nowrap;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }
    
    .mood-delete-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      color: var(--danger);
    }
    
    body.dark-mode .mood-delete-btn {
      color: #e0e0e0;
    }
    
    .mood-history-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .emoji {
      font-size: 1.3rem;
      min-width: 28px;
      text-align: center;
    }
    
    .habit-actions {
      display: flex;
      gap: 8px;
    }
    
    .habit-actions button {
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }
    
    .edit-btn {
      background: #f0f0f0;
      color: #333;
    }
    
    .edit-btn:hover {
      background: #e0e0e0;
    }
    
    .delete-btn {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }
    
    .delete-btn:hover {
      background: rgba(244, 67, 54, 0.2);
    }
  `;
  document.head.appendChild(style);
});