import { db } from './firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Task, ScheduleEvent, ChatSession } from '../types';

const TASKS_COLLECTION = 'tasks';
const SCHEDULE_COLLECTION = 'schedule';
const CHATS_COLLECTION = 'chats';

/**
 * Firestore does not accept 'undefined' values. 
 * This helper ensures objects are clean before transmission.
 */
const sanitize = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));
};

export const dbService = {
  // --- TASKS ---
  
  getTasks: async (userId: string): Promise<Task[]> => {
    try {
      const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(doc.data() as Task);
      });
      return tasks.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error: any) {
      console.error("Firestore getTasks failed:", error.code, error.message);
      throw error;
    }
  },

  addTask: async (task: Task, userId: string) => {
    try {
      const taskWithUser = sanitize({ ...task, userId });
      await setDoc(doc(db, TASKS_COLLECTION, task.id), taskWithUser);
      return true;
    } catch (error: any) {
      console.error("Firestore addTask failed:", error.code, error.message);
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, TASKS_COLLECTION, taskId), { status: newStatus });
    } catch (error: any) {
      console.error("Firestore updateTaskStatus failed:", error.code, error.message);
      throw error;
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    } catch (error: any) {
      console.error("Firestore deleteTask failed:", error.code, error.message);
      throw error;
    }
  },

  // --- SCHEDULE ---

  getSchedule: async (userId: string): Promise<ScheduleEvent[]> => {
    try {
      const q = query(collection(db, SCHEDULE_COLLECTION), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const events: ScheduleEvent[] = [];
      querySnapshot.forEach((doc) => {
        events.push(doc.data() as ScheduleEvent);
      });
      return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
    } catch (error: any) {
      console.error("Firestore getSchedule failed:", error.code, error.message);
      throw error;
    }
  },

  saveScheduleEvent: async (event: ScheduleEvent, userId: string) => {
    try {
      const eventWithUser = sanitize({ ...event, userId });
      await setDoc(doc(db, SCHEDULE_COLLECTION, event.id), eventWithUser);
      return true;
    } catch (error: any) {
      console.error("Firestore saveScheduleEvent failed:", error.code, error.message);
      throw error;
    }
  },

  deleteScheduleEvent: async (eventId: string) => {
    try {
      await deleteDoc(doc(db, SCHEDULE_COLLECTION, eventId));
    } catch (error: any) {
      console.error("Firestore deleteScheduleEvent failed:", error.code, error.message);
      throw error;
    }
  },

  // --- CHATS ---

  getChatSessions: async (userId: string): Promise<ChatSession[]> => {
    try {
      const q = query(collection(db, CHATS_COLLECTION), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const sessions: ChatSession[] = [];
      querySnapshot.forEach((doc) => {
        sessions.push(doc.data() as ChatSession);
      });
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error: any) {
      console.error("Firestore getChatSessions failed:", error.code, error.message);
      throw error;
    }
  },

  saveChatSession: async (session: ChatSession) => {
    try {
      const sanitizedSession = sanitize(session);
      await setDoc(doc(db, CHATS_COLLECTION, session.id), sanitizedSession);
    } catch (error: any) {
      console.error("Firestore saveChatSession failed:", error.code, error.message);
      throw error;
    }
  },

  deleteChatSession: async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, CHATS_COLLECTION, sessionId));
    } catch (error: any) {
      console.error("Firestore deleteChatSession failed:", error.code, error.message);
      throw error;
    }
  }
};