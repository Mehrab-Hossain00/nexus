import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB3le-Xz8be_orb4lmuhEUoaLCNT6B1rDc",
  authDomain: "nexus-study-pro-3a32d.firebaseapp.com",
  projectId: "nexus-study-pro-3a32d",
  storageBucket: "nexus-study-pro-3a32d.firebasestorage.app",
  messagingSenderId: "869673549802",
  appId: "1:869673549802:web:4d9ab9c389429c24aabc93"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestAccount() {
  const uid = crypto.randomUUID();
  const newUser = {
    uid,
    name: 'test',
    avatar: `https://api.dicebear.com/7.x/micah/svg?seed=test&backgroundColor=transparent`,
    pin: '1234',
    biometricEnabled: true,
    credits: 9999,
    xp: 0,
    level: 1,
    streak: 0
  };

  try {
    await setDoc(doc(db, 'users', uid), newUser);
    console.log('Test account created successfully. PIN is 1234');
    process.exit(0);
  } catch (err) {
    console.error('Error creating test account:', err);
    process.exit(1);
  }
}

createTestAccount();
