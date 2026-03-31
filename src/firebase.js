import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD3hWalNyQibR7Oc7ql4z8WYE7-JlpPomg",
  authDomain: "streak-reset-b5a2b.firebaseapp.com",
  projectId: "streak-reset-b5a2b",
  storageBucket: "streak-reset-b5a2b.firebasestorage.app",
  messagingSenderId: "753864825452",
  appId: "1:753864825452:web:71febb1825739c3fc15649",
  measurementId: "G-KNKFZTF495"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);