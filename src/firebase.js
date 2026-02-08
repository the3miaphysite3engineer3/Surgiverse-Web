// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8BUu79_s4HdkhdyQtW8LbGU2zuQVJIWU",
  authDomain: "surgiverse-279e5.firebaseapp.com",
  databaseURL: "https://surgiverse-279e5-default-rtdb.firebaseio.com",
  projectId: "surgiverse-279e5",
  storageBucket: "surgiverse-279e5.firebasestorage.app",
  messagingSenderId: "682276620148",
  appId: "1:682276620148:web:b9e711262fa6df6ec9ce21",
  measurementId: "G-5S41NDYPMC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Authentication

export { app, analytics, db, auth }; // Export auth
