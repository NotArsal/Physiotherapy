import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || "dummy-api-key-123456789012345678901234567890",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || "dummy-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || "dummy-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || "dummy-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || "1:123456789012:web:1234567890123456789012",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim()
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn('Analytics failed to initialize');
      }
    }
  })
  .catch((error) => {
    console.warn('Firebase analytics not available:', error);
  });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
