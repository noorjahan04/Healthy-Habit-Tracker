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

  const habitList = document.getElementById("habit-list");
  const progressFill = document.getElementById("progressFill");
  const progressPercent = document.getElementById("progressPercent");
  const profilePic = document.getElementById("profilePic");
  const themeToggle = document.getElementById("themeToggle");
  const moodList = document.getElementById("mood-history-list");
  const moodSummary = document.getElementById("mood-summary");

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

    const userId = user.uid;
    const userRef = ref(db, `users/${userId}`);
    const habitsRef = ref(db, `users/${userId}/habits`);
    const moodsRef = ref(db, `users/${userId}/moods`);
    const statsRef = ref(db, `users/${userId}/stats`);

    onValue(userRef, (snap) => {
      const data = snap.val();
      if (data?.profile?.photoURL) {
        profilePic.style.backgroundImage = `url('${data.profile.photoURL}')`;
      }
    });

    onValue(habitsRef, (snap) => {
      habitList.innerHTML = "";
      let completedCount = 0;
      let totalCount = 0;
      const habits = snap.val();

      if (!habits) {
        habitList.innerHTML = "<li>No habits yet. Add one!</li>";
        return;
      }

      for (const key in habits) {
        const habit = habits[key];
        totalCount++;
        if (habit.completedToday) completedCount++;

        const li = document.createElement("li");
        li.className = "habit-card";
        li.innerHTML = `
          <div class="habit-main">
            <strong>${habit.name}</strong> - 
            <span class="status ${habit.completedToday ? "done" : "pending"}">
              ${habit.completedToday ? "Done" : "Pending"}
            </span>
          </div>
          <div class="habit-actions">
            <button class="edit-btn" data-id="${key}">Edit</button>
            <button class="delete-btn" data-id="${key}">Delete</button>
          </div>
        `;

        li.querySelector(".habit-main").addEventListener("click", (e) => {
          if (e.target.closest(".habit-actions")) return;
          const habitRef = ref(db, `users/${userId}/habits/${key}`);
          const newStatus = !habit.completedToday;

          update(habitRef, {
            completedToday: newStatus
          }).then(() => updateStats(userId));
        });

        li.querySelector(".edit-btn").addEventListener("click", () => {
          const newName = prompt("Enter new habit name:", habit.name);
          if (newName && newName.trim()) {
            update(ref(db, `users/${userId}/habits/${key}`), {
              name: newName.trim()
            });
          }
        });

        li.querySelector(".delete-btn").addEventListener("click", () => {
          if (confirm(`Delete habit "${habit.name}"?`)) {
            remove(ref(db, `users/${userId}/habits/${key}`)).then(() => updateStats(userId));
          }
        });

        habitList.appendChild(li);
      }

      const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
      progressFill.style.width = `${percent}%`;
      progressPercent.textContent = `${percent}%`;
    });

    onValue(moodsRef, (snap) => {
      moodList.innerHTML = "";
      const moods = snap.val();
      if (!moods) {
        moodList.innerHTML = "<li>No mood history yet.</li>";
        moodSummary.textContent = "Summary: No data available.";
        return;
      }

      let moodCounts = {};
      Object.entries(moods).forEach(([key, mood]) => {
        const emoji = mood.mood;
        const note = mood.note || "No note";
        moodCounts[emoji] = (moodCounts[emoji] || 0) + 1;

        const li = document.createElement("li");

        li.innerHTML = `
          <div class="mood-history-content">
            <strong>${key}</strong>
            <span>:</span>
            <span class="emoji">${emoji}</span>
            <span>-</span>
            <em>${note}</em>
          </div>
          <button class="delete-btn" onclick="deleteMood('${key}')">Delete</button>
        `;

        moodList.appendChild(li);
      });

      const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      const topMood = sorted[0];
      moodSummary.textContent = topMood
        ? `Summary: Mostly feeling "${topMood[0]}" (${topMood[1]} times)`
        : "Summary: No mood trends yet.";
    });

    onValue(statsRef, (snap) => {
      const stats = snap.val() || {};
      const categoryScores = stats.categoryScores || {
        fitness: 0,
        nutrition: 0,
        sleep: 0,
        mindfulness: 0
      };
      renderWellnessChart(categoryScores);
    });

    window.deleteMood = function (key) {
      if (confirm("Delete this mood?")) {
        remove(ref(db, `users/${userId}/moods/${key}`));
      }
    };
  });

  function renderWellnessChart(scores) {
    const wellnessChartCanvas = document.getElementById("wellnessChart");
    if (!wellnessChartCanvas) {
      console.error("Wellness chart canvas not found.");
      return;
    }

    const ctx = wellnessChartCanvas.getContext("2d");
    if (window.wellnessChartInstance) window.wellnessChartInstance.destroy();

    window.wellnessChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Fitness", "Nutrition", "Sleep", "Mindfulness"],
        datasets: [{
          data: [
            scores.fitness || 0,
            scores.nutrition || 0,
            scores.sleep || 0,
            scores.mindfulness || 0
          ],
          backgroundColor: ["#4caf50", "#ff9800", "#2196f3", "#9c27b0"],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }

  function updateStats(userId) {
    const habitsRef = ref(getDatabase(app), `users/${userId}/habits`);
    const statsRef = ref(getDatabase(app), `users/${userId}/stats`);

    get(habitsRef).then((snap) => {
      const habits = snap.val();
      if (!habits) return;

      let currentStreak = 0;
      let missedCount = 0;

      for (const key in habits) {
        const habit = habits[key];
        if (habit.completedToday) currentStreak++;
        else missedCount++;
      }

      update(statsRef, {
        currentStreak,
        missedCount
      });
    });
  }

  window.logoutUser = function () {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  };

  window.downloadPDF = () => {
    if (typeof generatePDF === "function") {
      generatePDF();
    } else {
      alert("📄 PDF export not available.");
    }
  };
});
