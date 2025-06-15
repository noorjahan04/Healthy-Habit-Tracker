import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

const moodListEl = document.getElementById("mood-history-list");

function renderMoodHistory(moods, uid) {
  moodListEl.innerHTML = "";

  if (moods.length === 0) {
    moodListEl.innerHTML = `<li class="mood-history-item">No mood entries yet.</li>`;
    return;
  }
  moods.sort((a, b) => b.date.localeCompare(a.date));

  moods.forEach((mood, index) => {
    const label = `mood${index + 1}`;
    const note = mood.note ? ` - <em>${mood.note}</em>` : "";

    const li = document.createElement("li");
    li.className = "mood-history-item";
    li.innerHTML = `
      <strong>${label}</strong>: 
      <span class="emoji">${mood.mood}</span>${note}
      <button class="delete-btn" data-id="${mood.date}">Delete</button>
    `;

    li.querySelector(".delete-btn").addEventListener("click", () => {
      const confirmDelete = confirm(`Delete ${label}?`);
      if (confirmDelete) {
        const moodRef = ref(db, `users/${uid}/moods/${mood.date}`);
        remove(moodRef);
      }
    });

    moodListEl.appendChild(li);
  });
}
onAuthStateChanged(auth, (user) => {
  if (user) {
    const moodsRef = ref(db, `users/${user.uid}/moods`);

    onValue(moodsRef, (snapshot) => {
      const data = snapshot.val();
      const moods = [];

      if (data) {
        Object.entries(data).forEach(([date, mood]) => {
          moods.push({
            date,
            ...mood
          });
        });
      }

      renderMoodHistory(moods, user.uid);
    });
  } else {
    moodListEl.innerHTML = "<li>Please log in to see your mood history.</li>";
  }
});
