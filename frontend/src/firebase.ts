import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOXfA_bo7nMCRsDMhen5wzTlXGivEKbHg",
  authDomain: "physio-ml-7c08b.firebaseapp.com",
  projectId: "physio-ml-7c08b",
  storageBucket: "physio-ml-7c08b.firebasestorage.app",
  messagingSenderId: "980988444841",
  appId: "1:980988444841:web:0556e2863fdb2b53aee9b8",
  measurementId: "G-G5EJT46RN4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch((error) => {
    console.warn('Firebase analytics not available:', error);
  });

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
