import { db } from './firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Task, ScheduleEvent, ChatSession } from '../types';

const TASKS_COLLECTION = 'tasks';
const SCHEDULE_COLLECTION = 'schedule';
const CHATS_COLLECTION = 'chats';

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
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  },

  addTask: async (task: Task, userId: string) => {
    try {
      const taskWithUser = { ...task, userId };
      await setDoc(doc(db, TASKS_COLLECTION, task.id), taskWithUser);
      return true;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, TASKS_COLLECTION, taskId), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  },

  deleteTask: async (taskId: string) => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
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
    } catch (error) {
      console.error("Error fetching schedule:", error);
      throw error;
    }
  },

  saveScheduleEvent: async (event: ScheduleEvent, userId: string) => {
    try {
      const eventWithUser = { ...event, userId };
      await setDoc(doc(db, SCHEDULE_COLLECTION, event.id), eventWithUser);
      return true;
    } catch (error) {
      console.error("Error saving event:", error);
      throw error;
    }
  },

  deleteScheduleEvent: async (eventId: string) => {
    try {
      await deleteDoc(doc(db, SCHEDULE_COLLECTION, eventId));
    } catch (error) {
      console.error("Error deleting event:", error);
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
    } catch (error) {
      console.error("Error fetching chats:", error);
      throw error;
    }
  },

  saveChatSession: async (session: ChatSession) => {
    try {
      const sanitizedSession = JSON.parse(JSON.stringify(session));
      await setDoc(doc(db, CHATS_COLLECTION, session.id), sanitizedSession);
    } catch (error) {
      console.error("Error saving chat:", error);
      throw error;
    }
  },

  deleteChatSession: async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, CHATS_COLLECTION, sessionId));
    } catch (error) {
      console.error("Error deleting chat session:", error);
      throw error;
    }
  }
};