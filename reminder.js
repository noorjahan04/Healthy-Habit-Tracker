import { app, auth } from "./auth.js";
import {
  getDatabase,
  ref,
  get,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getDatabase(app);
let habits = [];

function renderHabits(habits, uid) {
  const list = document.getElementById("habit-list");
  if (!list) return;

  list.innerHTML = "";

  habits.forEach((habit, index) => {
    const li = document.createElement("li");
    li.className = "habit-card";
    li.id = `habit-${index}`;
    li.innerHTML = `
      <strong>${habit.name}</strong>
      <span class="status ${habit.completedToday ? 'done' : 'pending'}">
        ${habit.completedToday ? '✅ Completed' : '⏳ Pending'}
      </span>
    `;
    li.onclick = async () => {
      const habitRef = ref(db, `users/${uid}/habits/${habit.id}`);
      const newStatus = !habit.completedToday;
      await update(habitRef, {
        completedToday: newStatus,
        lastLoggedDate: new Date().toISOString().split('T')[0]
      });
    };
    list.appendChild(li);
  });

  updateProgressBar();
}

function updateProgressBar() {
  const completed = habits.filter(h => h.completedToday).length;
  const total = habits.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const fill = document.getElementById("progressFill");
  const percentText = document.getElementById("progressPercent");

  if (fill && percentText) {
    fill.style.width = percent + "%";
    percentText.textContent = percent + "%";
  }
}

function highlightMissingHabits() {
  habits.forEach((habit, index) => {
    const el = document.getElementById(`habit-${index}`);
    if (el) {
      el.style.backgroundColor = habit.completedToday ? "" : "#fff8c6";
    }
  });
}

function showReminder(message) {
  const modal = document.getElementById("reminderModal");
  const text = document.getElementById("reminderText");
  const closeBtn = document.getElementById("closeModalBtn");

  if (text) text.textContent = message;
  if (modal) modal.style.display = "flex";

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  setTimeout(() => {
    if (modal) modal.style.display = "none";
  }, 10000);
}

function scheduleReminders() {
  setInterval(() => {
    const incomplete = habits.filter(h => !h.completedToday);
    if (incomplete.length > 0) {
      showReminder(`⏰ You have ${incomplete.length} habit(s) to complete!`);
      highlightMissingHabits();
    }
  }, 10000);
}

function setupMarkAll(uid) {
  const markAllBtn = document.getElementById("markAllBtn");
  if (markAllBtn) {
    markAllBtn.onclick = async () => {
      const updates = {};
      const today = new Date().toISOString().split("T")[0];
      habits.forEach((habit) => {
        updates[`users/${uid}/habits/${habit.id}/completedToday`] = true;
        updates[`users/${uid}/habits/${habit.id}/lastLoggedDate`] = today;
        habit.completedToday = true;
      });
      await update(ref(db), updates);
      showReminder("✅ All habits marked as completed!");
      renderHabits(habits, uid);
    };
  }
}
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const habitsRef = ref(db, `users/${uid}/habits`);

  onValue(habitsRef, (snapshot) => {
    const data = snapshot.val() || {};
    habits = Object.entries(data).map(([id, h]) => ({
      id,
      ...h
    }));
    renderHabits(habits, uid);
  });

  setupMarkAll(uid);
  scheduleReminders();
});
