// Firebase configuration for CRESCENDO Prophet
// This file is used to initialize Firebase SDK in the frontend

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
// TODO: Replace with your actual Firebase project config from Firebase Console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-gPXy4mBqn8fUCCU_keoeWmM9RWY3Nqc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "prophet-crescendo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "prophet-crescendo",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "prophet-crescendo.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "555429382016",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:555429382016:web:d6748297215c69c365e365",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (for future migration from SQLite)
export const db = getFirestore(app);

// Initialize Analytics (optional - only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export { app, analytics };
export default app;
