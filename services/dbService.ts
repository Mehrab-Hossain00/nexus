
import { db } from './firebase.ts';
import { 
  collection, getDocs, setDoc, deleteDoc, doc, updateDoc, 
  query, where, orderBy, limit, addDoc, onSnapshot, arrayUnion, arrayRemove, increment, getDoc
} from 'firebase/firestore';
import { 
  Task, ScheduleEvent, StudyGroup, 
  StudySession, UserStatus, UserProfile, SocialPost, PostComment, DirectMessage
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

  // --- SOCIAL ---
  createPost: async (post: Partial<SocialPost>) => {
    const p = {
      ...post,
      timestamp: Date.now(),
      commentCount: 0,
      reactions: [
        { emoji: '🔥', count: 0, uids: [] },
        { emoji: '🧠', count: 0, uids: [] },
        { emoji: '🫡', count: 0, uids: [] }
      ]
    };
    await addDoc(collection(db, 'posts'), sanitize(p));
  },

  addComment: async (postId: string, comment: Partial<PostComment>) => {
    await addDoc(collection(db, 'posts', postId, 'comments'), sanitize({
      ...comment,
      timestamp: Date.now()
    }));
    await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
  },

  addReaction: async (postId: string, emoji: string, userId: string, isAdding: boolean) => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const targetPost = postSnap.data() as SocialPost;

    const newReactions = targetPost.reactions.map(r => {
      if (r.emoji === emoji) {
        const uids = new Set(r.uids);
        if (isAdding) uids.add(userId);
        else uids.delete(userId);
        return { ...r, count: uids.size, uids: Array.from(uids) };
      }
      return r;
    });

    await updateDoc(postRef, { reactions: newReactions });
  },

  // --- FRIENDS ---
  sendFriendRequest: async (targetUid: string, fromUser: UserProfile) => {
    const targetRef = doc(db, 'users', targetUid);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) return;
    
    const targetData = targetSnap.data() as UserProfile;
    // Prevent duplicates
    const alreadyRequested = (targetData.friendRequests || []).some(r => r.from === fromUser.uid);
    if (alreadyRequested) return;

    await updateDoc(targetRef, {
      friendRequests: arrayUnion({ 
        from: fromUser.uid, 
        name: fromUser.name, 
        avatar: fromUser.avatar || `https://api.dicebear.com/7.x/micah/svg?seed=${fromUser.name}&backgroundColor=transparent` 
      })
    });
  },

  acceptFriendRequest: async (myUid: string, friendUid: string) => {
    const myRef = doc(db, 'users', myUid);
    const friendRef = doc(db, 'users', friendUid);
    const mySnap = await getDoc(myRef);
    if (!mySnap.exists()) return;
    const myData = mySnap.data() as UserProfile;

    const newRequests = (myData.friendRequests || []).filter(r => r.from !== friendUid);
    
    await updateDoc(myRef, {
      friends: arrayUnion(friendUid),
      friendRequests: newRequests
    });
    await updateDoc(friendRef, {
      friends: arrayUnion(myUid)
    });
  },

  // --- MESSAGES ---
  sendDM: async (dm: Partial<DirectMessage>) => {
    await addDoc(collection(db, 'direct_messages'), sanitize({
      ...dm,
      timestamp: Date.now(),
      seen: false
    }));
  },

  markAsSeen: async (msgId: string) => {
    await updateDoc(doc(db, 'direct_messages', msgId), { seen: true });
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
