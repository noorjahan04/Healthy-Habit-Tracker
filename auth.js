import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_Z51Nz75o-IjMoKpMHGr6pvlxjLd4nLY",
  authDomain: "authentication-2df46.firebaseapp.com",
  projectId: "authentication-2df46",
  storageBucket: "authentication-2df46.appspot.com",
  messagingSenderId: "878508241019",
  appId: "1:878508241019:web:53b3492da3e31d2159f2de",
  measurementId: "G-HL1G6ESF04",
  databaseURL: "https://authentication-2df46-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

getDatabase(app);

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function googleLogin() {
  return signInWithPopup(auth, provider);
}

export { app, auth };
