import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import Supabase auth (replacing Firebase auth)
import {
  supabaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
} from "./supabase";

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

// Use Supabase auth instead of Firebase auth
export const auth = supabaseAuth;

export const db = getFirestore(app);
export const storage = getStorage(app);

// Re-export Supabase auth functions
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
};

// Re-export Supabase message functions
export {
  sendMessage,
  subscribeToMessages as listenToMessages,
  markMessagesAsRead,
} from "./supabase";
