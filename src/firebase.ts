import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBbrH_U4NgbxP__B2YRLz8bq_ONij9q7YM",
  authDomain: "ipl-hackathon.firebaseapp.com",
  projectId: "ipl-hackathon",
  storageBucket: "ipl-hackathon.firebasestorage.app",
  messagingSenderId: "987614685482",
  appId: "1:987614685482:web:b8d0b09db7e3ca51fe1653",
  measurementId: "G-JVQKS1DJ81"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
