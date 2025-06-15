import { app, auth } from "./auth.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("analyticsChart");
  if (!canvas) {
    console.error("Canvas element not found.");
    return;
  }

  const db = getDatabase(app);
  let chart;

  function renderChart(labels, data) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas 2D context.");
      return;
    }

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Weekly Habit Completions",
          data: data,
          borderColor: "#8d3bbf",
          backgroundColor: "rgba(141, 59, 191, 0.1)",
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#8d3bbf",
          pointRadius: 6,
        }]
      },
      options: {
        responsive: true,
        animation: {
          duration: 1200,
          easing: "easeInOutCubic"
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Completions"
            }
          },
          x: {
            title: {
              display: true,
              text: "Habits"
            }
          }
        }
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const userId = user.uid;
    const db = getDatabase(app);
    const habitsRef = ref(db, `users/${userId}/habits`);
    const statsRef = ref(db, `users/${userId}/stats`);

    renderChart(["Water", "Workout", "Read", "Sleep", "Yoga"], [5, 3, 6, 4, 2]);

    onValue(habitsRef, (snapshot) => {
      const labels = [];
      let best = null;
      let worst = null;

      snapshot.forEach((child) => {
        const habit = child.val();
        if (habit.name) {
          const data = habit.weeklyData || [0, 0, 0, 0, 0, 0, 0];
          const total = data.reduce((a, b) => a + (parseInt(b) || 0), 0);
          labels.push(habit.name);
          if (best === null || total > best.value) best = { name: habit.name, value: total };
          if (worst === null || total < worst.value) worst = { name: habit.name, value: total };
        }
      });

      const totalEl = document.getElementById("totalHabits");
      const bestEl = document.getElementById("bestHabit");
      const worstEl = document.getElementById("worstHabit");

      if (totalEl) totalEl.textContent = labels.length;
      if (bestEl) bestEl.textContent = best?.name || "--";
      if (worstEl) worstEl.textContent = worst?.name || "--";
    });

    onValue(statsRef, (snap) => {
      const stats = snap.val();
      const wellnessEl = document.getElementById("wellnessScore");
      if (stats && stats.wellnessScore !== undefined && wellnessEl) {
        wellnessEl.textContent = stats.wellnessScore;
        wellnessEl.classList.toggle("danger", stats.wellnessScore < 50);
      }
    });
  });
});
