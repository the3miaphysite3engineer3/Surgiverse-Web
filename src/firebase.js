// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase services conditionally
let app;
let analytics;
let db;
let auth;

if (typeof window !== 'undefined') {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  // Analytics is optional and throws in unsupported environments (e.g.
  // missing measurementId, blocked google-analytics, SSR). Never let it
  // break Firestore/Auth.
  try {
    // isSupported() rejects instead of throwing on unsupported browsers.
    isAnalyticsSupported().then((ok) => {
      if (ok) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn('Analytics unavailable:', e?.message || e);
        }
      }
    }).catch(() => {
      // Ignore — analytics is non-critical.
    });
  } catch (e) {
    console.warn('Analytics unavailable:', e?.message || e);
  }
  db = getFirestore(app);
  auth = getAuth(app); // Initialize Firebase Authentication
}

export { app, analytics, db, auth }; // Export auth
