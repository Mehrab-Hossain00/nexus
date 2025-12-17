import { db } from './firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Task, ScheduleEvent, ChatSession } from '../types';

const TASKS_COLLECTION = 'tasks';
const SCHEDULE_COLLECTION = 'schedule';
const CHATS_COLLECTION = 'chats';

export const dbService = {
  // --- TASKS ---
  
  getTasks: async (userId: string): Promise<Task[]> => {
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push(doc.data() as Task);
    });
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  },

  addTask: async (task: Task, userId: string) => {
    // Add userId to the task document
    const taskWithUser = { ...task, userId };
    // Use the task.id (UUID) as the Firestore Document ID
    await setDoc(doc(db, TASKS_COLLECTION, task.id), taskWithUser);
  },

  updateTaskStatus: async (taskId: string, newStatus: string) => {
    // Directly update the document using the ID
    await updateDoc(doc(db, TASKS_COLLECTION, taskId), { status: newStatus });
  },

  deleteTask: async (taskId: string) => {
    // Directly delete the document using the ID
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  },

  // --- SCHEDULE ---

  getSchedule: async (userId: string): Promise<ScheduleEvent[]> => {
    const q = query(collection(db, SCHEDULE_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const events: ScheduleEvent[] = [];
    querySnapshot.forEach((doc) => {
      events.push(doc.data() as ScheduleEvent);
    });
    return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  saveScheduleEvent: async (event: ScheduleEvent, userId: string) => {
    const eventWithUser = { ...event, userId };
    // Use the event.id (UUID) as the Firestore Document ID
    await setDoc(doc(db, SCHEDULE_COLLECTION, event.id), eventWithUser);
  },

  deleteScheduleEvent: async (eventId: string) => {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, eventId));
  },

  clearSchedule: async (userId: string) => {
    const q = query(collection(db, SCHEDULE_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    
    // Batch delete would be better, but keeping it simple for now
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, SCHEDULE_COLLECTION, document.id))
    );
    await Promise.all(deletePromises);
  },

  // --- CHATS ---

  getChatSessions: async (userId: string): Promise<ChatSession[]> => {
    const q = query(collection(db, CHATS_COLLECTION), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    querySnapshot.forEach((doc) => {
      sessions.push(doc.data() as ChatSession);
    });
    // Sort by updatedAt descending (newest first)
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  saveChatSession: async (session: ChatSession) => {
    // Remove undefined values to prevent Firestore errors
    const sanitizedSession = JSON.parse(JSON.stringify(session));
    await setDoc(doc(db, CHATS_COLLECTION, session.id), sanitizedSession);
  },

  deleteChatSession: async (sessionId: string) => {
    await deleteDoc(doc(db, CHATS_COLLECTION, sessionId));
  }
};