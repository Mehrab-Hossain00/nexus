
import { db } from './firebase.ts';
import { 
  collection, getDocs, setDoc, deleteDoc, doc, updateDoc, 
  query, where, orderBy, limit, addDoc, onSnapshot, arrayUnion 
} from 'firebase/firestore';
import { 
  Task, ScheduleEvent, ChatSession, StudyGroup, 
  GroupMessage, ActivityLog, StudySession, UserStatus, UserProfile
} from '../types.ts';

const TASKS_COLLECTION = 'tasks';
const SCHEDULE_COLLECTION = 'schedule';
const CHATS_COLLECTION = 'chats';
const GROUPS_COLLECTION = 'groups';
const ACTIVITIES_COLLECTION = 'activities';
const SESSIONS_COLLECTION = 'sessions';
const USERS_COLLECTION = 'users';

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
  // --- USER PROFILE & STATUS ---
  updateUserStatus: async (uid: string, status: UserStatus, currentSubject?: string) => {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { 
      status, 
      currentSubject: currentSubject || null,
      lastActivity: Date.now() 
    });
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
    await updateDoc(doc(db, USERS_COLLECTION, uid), sanitize(data));
  },

  getUser: async (uid: string) => {
    const d = await getDocs(query(collection(db, USERS_COLLECTION), where("uid", "==", uid)));
    return d.docs[0]?.data();
  },

  // --- TASKS ---
  getTasks: async (userId: string): Promise<Task[]> => {
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Task).sort((a, b) => b.createdAt - a.createdAt);
  },
  addTask: async (task: Task, userId: string) => {
    await setDoc(doc(db, TASKS_COLLECTION, task.id), sanitize({ ...task, userId }));
  },
  updateTaskStatus: async (taskId: string, newStatus: string) => {
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), { status: newStatus });
  },
  deleteTask: async (taskId: string) => {
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  },

  // --- GROUPS ---
  getPublicGroups: async (): Promise<StudyGroup[]> => {
    const q = query(collection(db, GROUPS_COLLECTION), where("isPublic", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup));
  },
  getUserGroups: async (userId: string): Promise<StudyGroup[]> => {
    const q = query(collection(db, GROUPS_COLLECTION), where("members", "array-contains", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGroup));
  },
  createGroup: async (group: Partial<StudyGroup>) => {
    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), sanitize(group));
    return docRef.id;
  },
  joinGroupByCode: async (userId: string, code: string) => {
    const q = query(collection(db, GROUPS_COLLECTION), where("groupCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Invalid Code");
    const groupDoc = snap.docs[0];
    await updateDoc(doc(db, GROUPS_COLLECTION, groupDoc.id), {
      members: arrayUnion(userId)
    });
    return groupDoc.id;
  },
  deleteGroup: async (groupId: string) => {
    await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
  },

  // --- SESSIONS ---
  logSession: async (session: StudySession) => {
    await addDoc(collection(db, SESSIONS_COLLECTION), sanitize(session));
  },
  getSessions: async (userId: string, date?: string): Promise<StudySession[]> => {
    let q = query(collection(db, SESSIONS_COLLECTION), where("userId", "==", userId));
    if (date) q = query(q, where("date", "==", date));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StudySession);
  },

  // --- ACTIVITIES ---
  logActivity: async (activity: Partial<ActivityLog>) => {
    await addDoc(collection(db, ACTIVITIES_COLLECTION), sanitize({ ...activity, timestamp: Date.now() }));
  },

  // --- SHARED METHODS ---
  getSchedule: async (userId: string): Promise<ScheduleEvent[]> => {
    const q = query(collection(db, SCHEDULE_COLLECTION), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ScheduleEvent).sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
  saveScheduleEvent: async (event: ScheduleEvent, userId: string) => {
    await setDoc(doc(db, SCHEDULE_COLLECTION, event.id), sanitize({ ...event, userId }));
  },
  deleteScheduleEvent: async (eventId: string) => {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, eventId));
  },
  getChatSessions: async (userId: string): Promise<ChatSession[]> => {
    const q = query(collection(db, CHATS_COLLECTION), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChatSession).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  saveChatSession: async (session: ChatSession) => {
    await setDoc(doc(db, CHATS_COLLECTION, session.id), sanitize(session));
  },
  deleteChatSession: async (sessionId: string) => {
    await deleteDoc(doc(db, CHATS_COLLECTION, sessionId));
  }
};
