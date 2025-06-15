# 🌿 Healthy Habit Tracker


**Healthy Habit Tracker** is a comprehensive wellness-focused web app designed to help users create, track, and maintain positive habits in their everyday lives. It offers powerful tools like a real-time dashboard, wellness scoring, habit analytics, mood tracking, smart reminders, and even an AI-powered chatbot to keep you motivated and on track.

From setting personalized goals to analyzing your wellness score and receiving automated reminders, this app supports a holistic approach to health improvement across multiple categories including fitness, nutrition, hydration, sleep, and mindfulness.

---

## 🎯 Project Objectives

- Enable users to build and maintain sustainable habits.
- Track progress through real-time analytics and wellness scores.
- Empower users to reflect on their emotions with mood tracking.
- Provide habit suggestions using a built-in AI chatbot assistant.
- Allow secure authentication and individual data storage with Firebase.
- Make habit building easy, visually appealing, and accessible.

---

## 💻 Tech Stack

### Frontend:
- HTML5
- CSS3 (Responsive with Flexbox/Grid)
- JavaScript (Vanilla DOM)

### Backend:
- Firebase v10+ Modular SDK
  - Firebase Authentication
  - Firebase Realtime Database

### Libraries / Tools:
- FontAwesome Icons
- Chart.js (for analytics)
- FileSaver.js or jsPDF (PDF export)
- OpenAI / Custom AI Logic (Chatbot)
- Live Clock
- Responsive Media

---

## 🔗 Live Demo

> 🌐 [Live App](https://healthy-habit-tracker.netlify.app/) 

---

## 📁 Project Structure & File Overview

│
├── home.html # Home Page (intro, benefits, chatbot access)
├── login.html # User login/register via Firebase
├── dashboard.html # Main dashboard (analytics, wellness, mood)
├── add-habit.html # Page to add new habit
├── analytics.html # Habit and category-based insights
├── chatboat.html # AI chatbot for suggestions/help
│
├── css/
│ └── dashboard.css # Styling for dashboard and layout
│
├── js/
│ ├── auth.js # Handles Firebase login, logout
│ ├── firebase.js # Firebase config and initialization
│ ├── dashboard.js # Loads and updates habit dashboard
│ ├── add-habit.js # Handles new habit form and Firestore integration
│ ├── analytics.js # Visual charts and performance graphs
│ ├── ai.js # AI habit suggestion chatbot logic
│ ├── export.js # Export dashboard as PDF
│ ├── mood.js # Daily mood tracking and display
│ ├── mood-history.js # Mood history rendering
│ ├── reminder.js # Habit reminders with Firebase notifications
│
├── assets/
│ ├── silence.mp3 # Used for silent notification sound
│ 
│
└── README.md # Project documentation



---

## ⭐ Key Features

- 🔐 Firebase Authentication (Login / Signup / Logout)
- ➕ Add, Edit, Delete Habits across categories
- 📅 Daily / Weekly tracking and streak system
- 📊 Analytics with category performance & line/bar charts
- 🧠 Real-time **Wellness Score**
- 🔔 Firebase-based Habit Reminders
- 😄 Mood Tracking with emoji and journal input
- 🧑‍⚕️ AI Chatbot for Habit Suggestions
- 🌙 Dark Mode Toggle
- 📤 Export Dashboard as PDF
- ⏱️ Live Clock in Footer
- 📱 Responsive UI for all devices

---

## 🌟 Unique Features

- 🤖 AI-Powered Chatbot: Suggests new habits based on mood, goals, or time of day
- 📈 Real-time Wellness Score & Charts: Shows trends, weaknesses, best habits
- 🔔 Firebase-triggered Smart Reminders
- 📤 PDF Export: Download your dashboard progress anytime
- 📱 Looks and works great on mobile, tablet, and desktop
- 🧩 Modular and well-separated JS files for easy maintenance
- 🧘‍♀️ Multiple categories supported (fitness, mindfulness, sleep, hydration, nutrition)

---

## 🔮 Future Enhancements

- 📤 Email Daily Summary of Progress
- 🧠 AI Habit Generator from user history
- 🔗 Health Device Integration (Google Fit, Apple Health)
- 🎙️ Voice-based habit logging
- 🗓️ Calendar View of habit history
- 🔐 OTP Login / Two-Factor Authentication
- 📡 Offline mode with local storage sync

---
