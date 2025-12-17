import { db } from './firebase';
import { collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

const SESSION_KEY = 'nexus_session_uid';
const USERS_COLLECTION = 'users';

export const authService = {
  // Get all registered users (useful for the login selection screen)
  getUsers: async (): Promise<UserProfile[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  // Register a new user in Firestore
  register: async (name: string, pin: string): Promise<UserProfile> => {
    const uid = crypto.randomUUID();
    const newUser: UserProfile = {
      uid,
      name,
      avatar: `https://api.dicebear.com/7.x/micah/svg?seed=${name}&backgroundColor=transparent`,
      pin,
      biometricEnabled: true 
    };

    try {
      await setDoc(doc(db, USERS_COLLECTION, uid), newUser);
      localStorage.setItem(SESSION_KEY, newUser.uid);
      return newUser;
    } catch (error) {
      console.error("Error registering user:", error);
      throw new Error("Cloud registration failed. Check connection.");
    }
  },

  // Login with PIN check
  login: async (uid: string, pin: string): Promise<{ success: boolean; user?: UserProfile }> => {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (userDoc.exists()) {
        const user = userDoc.data() as UserProfile;
        if (user.pin === pin) {
          localStorage.setItem(SESSION_KEY, user.uid);
          return { success: true, user };
        }
      }
      return { success: false };
    } catch (error) {
      console.error("Login fetch error:", error);
      return { success: false };
    }
  },

  // Restore session with direct ID lookup for reliability
  restoreSession: async (): Promise<UserProfile | null> => {
    const uid = localStorage.getItem(SESSION_KEY);
    if (!uid) return null;
    
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Session restoration error:", error);
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },
};