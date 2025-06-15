import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { app, auth } from "./auth.js";

async function fetchHabitData() {
  const db = getDatabase(app);
  const user = auth.currentUser;

  if (!user) {
    alert("User not logged in");
    return [];
  }

  const userId = user.uid;
  const habitRef = ref(db, `users/${userId}/habits`);

  try {
    const snapshot = await get(habitRef);
    const habits = snapshot.val();
    if (!habits) return [];

    return Object.values(habits).map((h) => ({
      habit: h.name || '',
      status: h.completedToday ? 'Done' : 'Pending',
      date: new Date().toLocaleDateString(),
      mood: h.mood || '-'
    }));
  } catch (error) {
    console.error("Error fetching habit data:", error);
    return [];
  }
}

function exportToCSV(data, filename = "habit_mood_data.csv") {
  if (!data.length) return alert("No data to export");

  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(","));
  const csvContent = [headers, ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function generatePDF(filename = "habit_mood_data.pdf") {
  const data = await fetchHabitData();
  if (!data.length) return alert("No data to export");

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library not found. Please include it via CDN in dashboard.html");
    return;
  }

  const doc = new window.jspdf.jsPDF();
  doc.text("Habit + Mood Report", 10, 10);
  let y = 20;

  data.forEach(row => {
    const line = `${row.date} | ${row.habit} | ${row.status} | ${row.mood}`;
    doc.text(line, 10, y);
    y += 10;
  });

  doc.save(filename);
}

window.generatePDF = generatePDF;

document.getElementById("export-csv-btn")?.addEventListener("click", async () => {
  const data = await fetchHabitData();
  exportToCSV(data);
});

document.getElementById("export-pdf-btn")?.addEventListener("click", () => {
  generatePDF();
});
