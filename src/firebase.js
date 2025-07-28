import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAu7IM06IkZliwAbRxloNV624Nq20AZ1lM",
  authDomain: "edugen-ai-d0086.firebaseapp.com",
  projectId: "edugen-ai-d0086",
  storageBucket: "edugen-ai-d0086.appspot.com",
  messagingSenderId: "874369597730",
  appId: "1:874369597730:web:a9d7c1288985232c8e657b",
  measurementId: "G-FF610BWLB3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set session-only persistence (not local)
setPersistence(auth, browserSessionPersistence);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
};

// Send a message to a private chat between a staff and student
export const sendMessage = async (text, selectedUserId, userRole) => {
  if (!text || !selectedUserId) return;

  const userId = auth.currentUser.uid;
  const isStaff = userRole === "staff";
  // Always format chatId as staffId_studentId
  const chatId = isStaff
    ? `${userId}_${selectedUserId}`
    : `${selectedUserId}_${userId}`;

  const newMessage = {
    text,
    sender: isStaff ? "staff" : "student",
    timestamp: new Date().toISOString(),
    read: false,
  };

  const chatRef = doc(db, "messages", chatId);
  const chatSnap = await getDoc(chatRef);
  const messages = chatSnap.exists() ? chatSnap.data().messages || [] : [];
  await setDoc(chatRef, { messages: [...messages, newMessage] });
};

// Listen to messages in a private chat
export const listenToMessages = (selectedUserId, userRole, setMessages) => {
  const userId = auth.currentUser.uid;
  const isStaff = userRole === "staff";
  // Always format chatId as staffId_studentId
  const chatId = isStaff
    ? `${userId}_${selectedUserId}`
    : `${selectedUserId}_${userId}`;

  const chatRef = doc(db, "messages", chatId);
  const unsubscribe = onSnapshot(
    chatRef,
    (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      } else {
        setMessages([]);
      }
    },
    (err) => {
      console.error("Error listening to messages:", err);
    }
  );

  return unsubscribe;
};

// Mark messages as read in a private chat
export const markMessagesAsRead = async (selectedUserId, userRole) => {
  const userId = auth.currentUser.uid;
  const isStaff = userRole === "staff";
  // Always format chatId as staffId_studentId
  const chatId = isStaff
    ? `${userId}_${selectedUserId}`
    : `${selectedUserId}_${userId}`;

  const chatRef = doc(db, "messages", chatId);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists()) {
    const messages = chatSnap.data().messages || [];
    const updatedMessages = messages.map((msg) =>
      msg.sender !== (isStaff ? "staff" : "student") && !msg.read
        ? { ...msg, read: true }
        : msg
    );
    await setDoc(chatRef, { messages: updatedMessages });
  }
};
