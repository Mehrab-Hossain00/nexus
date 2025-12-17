import { db } from './firebase';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';
import { UserProfile } from '../types';

const SESSION_KEY = 'nexus_session_uid';
const USERS_COLLECTION = 'users';

export const authService = {
  // Get all registered users from Firestore
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
      // Use setDoc to enforce the document ID matches the UID
      await setDoc(doc(db, USERS_COLLECTION, uid), newUser);
      
      // Auto login by setting local session
      localStorage.setItem(SESSION_KEY, newUser.uid);
      return newUser;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  },

  // Login with PIN check (Client-side check for this simple kiosk-mode app)
  login: async (uid: string, pin: string): Promise<{ success: boolean; user?: UserProfile }> => {
    const users = await authService.getUsers();
    const user = users.find(u => u.uid === uid);
    
    if (user && user.pin === pin) {
      localStorage.setItem(SESSION_KEY, user.uid);
      return { success: true, user };
    }
    return { success: false };
  },

  // Restore session
  restoreSession: async (): Promise<UserProfile | null> => {
    const uid = localStorage.getItem(SESSION_KEY);
    if (!uid) return null;
    
    // We need to fetch users to get the full profile object
    // In a real app, we'd fetch just the single doc, but sticking to pattern
    const users = await authService.getUsers();
    return users.find(u => u.uid === uid) || null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },
};