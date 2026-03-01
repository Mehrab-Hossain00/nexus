
import { db } from './firebase.ts';
import { 
  collection, getDocs, setDoc, deleteDoc, doc, updateDoc, 
  query, where, orderBy, limit, addDoc, onSnapshot, arrayUnion, arrayRemove, increment, getDoc
} from 'firebase/firestore';
import { 
  Task, ScheduleEvent, StudyGroup, 
  StudySession, UserStatus, UserProfile,
  DailyQuest, ShopItem, GroupMessage
} from '../types.ts';

const sanitize = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(v => sanitize(v));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
};

export const dbService = {
  // --- USER ---
  updateUserStatus: async (uid: string, status: UserStatus, currentSubject?: string) => {
    await updateDoc(doc(db, 'users', uid), { 
      status, 
      currentSubject: currentSubject || null,
      lastActivity: Date.now() 
    });
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
    await updateDoc(doc(db, 'users', uid), sanitize(data));
  },

  sendGroupMessage: async (msg: Partial<GroupMessage>) => {
    await addDoc(collection(db, 'group_messages'), sanitize({
      ...msg,
      timestamp: Date.now()
    }));
  },

  // --- DATA ---
  getTasks: async (userId: string): Promise<Task[]> => {
    const q = query(collection(db, 'tasks'), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Task).sort((a, b) => b.createdAt - a.createdAt);
  },
  addTask: async (task: any, userId: string) => {
    await setDoc(doc(db, 'tasks', task.id), sanitize({ ...task, userId }));
  },
  updateTaskStatus: async (taskId: string, newStatus: string) => {
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
  },
  deleteTask: async (taskId: string) => {
    await deleteDoc(doc(db, 'tasks', taskId));
  },
  logSession: async (session: StudySession) => {
    await addDoc(collection(db, 'sessions'), sanitize(session));
  },
  getSessions: async (userId: string): Promise<StudySession[]> => {
    const q = query(collection(db, 'sessions'), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StudySession);
  },
  logActivity: async (activity: any) => {
    await addDoc(collection(db, 'activities'), sanitize({ ...activity, timestamp: Date.now() }));
  },
  
  // --- GAMIFICATION ---
  awardRewards: async (uid: string, xp: number, credits: number) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      xp: increment(xp),
      credits: increment(credits)
    });
  },

  updateDailyQuests: async (uid: string, quests: DailyQuest[]) => {
    await updateDoc(doc(db, 'users', uid), { dailyQuests: sanitize(quests) });
  },

  purchaseItem: async (uid: string, item: ShopItem) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data() as UserProfile;

    if ((userData.credits || 0) < item.price) throw new Error("Insufficient credits");

    const updates: any = {
      credits: increment(-item.price)
    };

    if (item.type === 'theme') {
      updates.unlockedThemes = arrayUnion(item.value);
    } else if (item.type === 'streak_freeze') {
      updates.streakFreezeCount = increment(1);
    }

    await updateDoc(userRef, updates);
  },

  getSchedule: async (userId: string): Promise<ScheduleEvent[]> => {
    const q = query(collection(db, 'schedule'), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ScheduleEvent).sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
  saveScheduleEvent: async (event: ScheduleEvent, userId: string) => {
    await setDoc(doc(db, 'schedule', event.id), sanitize({ ...event, userId }));
  },
  deleteScheduleEvent: async (eventId: string) => {
    await deleteDoc(doc(db, 'schedule', eventId));
  },
  getUserGroups: async (userId: string): Promise<StudyGroup[]> => {
    const q = query(collection(db, 'groups'), where("members", "array-contains", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup));
  },
  getPublicGroups: async (): Promise<StudyGroup[]> => {
    const q = query(collection(db, 'groups'), where("isPublic", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup));
  },
  createGroup: async (group: Partial<StudyGroup>) => {
    const docRef = await addDoc(collection(db, 'groups'), sanitize(group));
    return docRef.id;
  },
  joinGroupByCode: async (userId: string, code: string) => {
    const q = query(collection(db, 'groups'), where("groupCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Invalid Code");
    const groupDoc = snap.docs[0];
    await updateDoc(doc(db, 'groups', groupDoc.id), {
      members: arrayUnion(userId)
    });
    return groupDoc.id;
  },
  deleteGroup: async (groupId: string) => {
    await deleteDoc(doc(db, 'groups', groupId));
  },
  getChatSessions: async (userId: string) => {
    const q = query(collection(db, 'chat_sessions'), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as any).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  saveChatSession: async (session: any) => {
    await setDoc(doc(db, 'chat_sessions', session.id), sanitize(session));
  },
  deleteChatSession: async (sessionId: string) => {
    await deleteDoc(doc(db, 'chat_sessions', sessionId));
  },
};
