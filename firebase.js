// ✅ firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

export const auth = getAuth(app);
export const db = getDatabase(app);        
export const firestore = getFirestore(app); 
