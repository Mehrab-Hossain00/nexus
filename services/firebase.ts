// Standard modular import for Firebase v9+
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3le-Xz8be_orb4lmuhEUoaLCNT6B1rDc",
  authDomain: "nexus-study-pro-3a32d.firebaseapp.com",
  projectId: "nexus-study-pro-3a32d",
  storageBucket: "nexus-study-pro-3a32d.firebasestorage.app",
  messagingSenderId: "869673549802",
  appId: "1:869673549802:web:4d9ab9c389429c24aabc93"
};

// Initialize Firebase instance
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);