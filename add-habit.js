
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  get,
  child
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_Z51Nz75o-IjMoKpMHGr6pvlxjLd4nLY",
  authDomain: "authentication-2df46.firebaseapp.com",
  databaseURL: "https://authentication-2df46-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "authentication-2df46",
  storageBucket: "authentication-2df46.appspot.com",
  messagingSenderId: "878508241019",
  appId: "1:878508241019:web:53b3492da3e31d2159f2de"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function validateHabit(habit) {
  if (!habit || typeof habit !== "object") return false;
  if (!habit.name || habit.name.trim().length < 2) return false;
  if (!habit.category || typeof habit.category !== "string") return false;
  if (!habit.goal || habit.goal.trim().length < 2) return false;
  if (!habit.type || (habit.type !== "Daily" && habit.type !== "Weekly")) return false;
  if (!habit.uid || typeof habit.uid !== "string") return false;
  return true;
}

export async function addHabit(habit) {
  if (!validateHabit(habit)) throw new Error("Invalid habit data");

  const habitRef = ref(db, `users/${habit.uid}/habits`);
  const newHabitRef = push(habitRef);
  await set(newHabitRef, {
    name: habit.name.trim(),
    category: habit.category,
    goal: habit.goal.trim(),
    type: habit.type,
    steps: habit.steps || null,
    reminder: habit.reminder || null,
    current: 0,
    streak: 0,
    lastLogged: null,
    createdAt: Date.now()
  });

  return newHabitRef.key;
}

export async function editHabit(uid, habitId, updates) {
  if (!uid || !habitId) throw new Error("Invalid user or habit ID");

  const updateData = {};
  if (updates.name) updateData.name = updates.name.trim();
  if (updates.category) updateData.category = updates.category;
  if (updates.goal) updateData.goal = updates.goal.trim();
  if (updates.type) updateData.type = updates.type;
  if (updates.steps !== undefined) updateData.steps = updates.steps;
  if (updates.reminder !== undefined) updateData.reminder = updates.reminder;

  const habitRef = ref(db, `users/${uid}/habits/${habitId}`);
  await update(habitRef, updateData);
}

export async function deleteHabit(uid, habitId) {
  if (!uid || !habitId) throw new Error("Invalid user or habit ID");

  const habitRef = ref(db, `users/${uid}/habits/${habitId}`);
  await remove(habitRef);
}

export async function getHabits(uid) {
  if (!uid) throw new Error("User ID is required");

  const snapshot = await get(child(ref(db), `users/${uid}/habits`));
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.entries(data).map(([id, habit]) => ({ id, ...habit }));
}

export { app };
