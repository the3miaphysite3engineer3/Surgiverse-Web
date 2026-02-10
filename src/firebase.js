// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8BUu79_s4HdkhdyQtW8LbGU2zuQVJIWU",
  authDomain: "surgiverse-279e5.firebaseapp.com",
  databaseURL: "https://surgiverse-279e5-default-rtdb.firebaseio.com",
  projectId: "surgiverse-279e5",
  storageBucket: "surgiverse-279e5.appspot.com",
  messagingSenderId: "682276620148",
  appId: "1:682276620148:web:b9e711262fa6df6ec9ce21",
  measurementId: "G-5S41NDYPMC"
};

// Initialize Firebase services conditionally
let app;
let analytics;
let db;
let auth;

if (typeof window !== 'undefined') {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  db = getFirestore(app);
  auth = getAuth(app); // Initialize Firebase Authentication
}

export { app, analytics, db, auth }; // Export auth
