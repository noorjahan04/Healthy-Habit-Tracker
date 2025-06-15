import { app, auth } from "./auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getDatabase(app);
let lastSuggestions = []; 

function average(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function speakSuggestions(suggestions) {
  const utterance = new SpeechSynthesisUtterance();
  utterance.lang = "en-US";
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;
  utterance.text = "Here are your AI suggestions: " + suggestions.join(". ");

  try {

    speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("🔇 Autoplay blocked. Waiting for user gesture.");
    const resume = () => {
      speechSynthesis.speak(utterance);
      document.removeEventListener("click", resume);
    };
    document.addEventListener("click", resume);
  }
}

function displaySuggestionsInDashboard(suggestions) {
  const listEl = document.getElementById("suggestion-list");
  if (!listEl) {
    console.warn("❌ suggestion-list element not found in DOM.");
    return;
  }

  listEl.innerHTML = "";
  suggestions.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    li.style.marginBottom = "8px";
    listEl.appendChild(li);
  });

  const sound = document.getElementById("aiSound");
  if (sound) {
    sound.play().catch(err => console.warn("🔇 Sound autoplay blocked:", err));
  }

  speakSuggestions(suggestions);
}

function analyzeData(data) {
  const avgSleep = average(data.sleepHours);
  const avgSteps = average(data.steps);
  const avgWater = average(data.waterIntake);

  const suggestions = [];
  if (avgSleep < 7) suggestions.push("🛌 Try to get at least 7 hours of sleep for better health.");
  if (avgSteps < 7000) suggestions.push("🚶‍♂️ Aim for 7,000+ steps daily for better fitness.");
  if (avgWater < 2) suggestions.push("💧 Drink at least 2 liters of water daily.");
  if (suggestions.length === 0) suggestions.push("🎉 Excellent! Keep up your healthy habits.");

  return suggestions;
}

async function fetchUserStats(uid) {
  const stats = { sleepHours: [], steps: [], waterIntake: [] };

  try {
    const habitsRef = ref(db, `users/${uid}/habits`);
    const snapshot = await get(habitsRef);

    if (snapshot.exists()) {
      const habits = snapshot.val();
      Object.values(habits).forEach(habit => {
        if (habit.sleepHours !== undefined) stats.sleepHours.push(Number(habit.sleepHours));
        if (habit.steps !== undefined) stats.steps.push(Number(habit.steps));
        if (habit.waterIntake !== undefined) stats.waterIntake.push(Number(habit.waterIntake));
      });
    }

    return stats;
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return stats;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn("⚠️ User not logged in.");
    return;
  }

  try {
    const stats = await fetchUserStats(user.uid);
    const suggestions = analyzeData(stats);
    lastSuggestions = suggestions; // Save for replay
    displaySuggestionsInDashboard(suggestions);
  } catch (err) {
    console.error("❌ Error during AI suggestion flow:", err);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const replayBtn = document.getElementById("replayAiBtn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      if (lastSuggestions.length > 0) {
        speakSuggestions(lastSuggestions);
      } else {
        alert("Suggestions not loaded yet.");
      }
    });
  }
});
