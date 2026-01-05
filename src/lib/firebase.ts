// Firebase configuration
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCnRG8TYbVszKqDfwvA-zIc1TeupW_dD_k",
  authDomain: "teamup-social.firebaseapp.com",
  projectId: "teamup-social",
  storageBucket: "teamup-social.firebasestorage.app",
  messagingSenderId: "886889618626",
  appId: "1:886889618626:web:52a248524ba346a81d6f5b",
  measurementId: "G-XTNRF07G9F"
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, auth, db };
