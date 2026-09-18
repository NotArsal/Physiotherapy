import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY?.trim() || "dummy-api-key-123456789012345678901234567890",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim() || "dummy-project.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim() || "dummy-project",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET?.trim() || "dummy-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID?.trim() || "123456789012",
  appId: process.env.REACT_APP_FIREBASE_APP_ID?.trim() || "1:123456789012:web:1234567890123456789012",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID?.trim()
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
