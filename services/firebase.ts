
// Standard modular import for Firebase v9+
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence failed: Browser not supported');
    }
});
