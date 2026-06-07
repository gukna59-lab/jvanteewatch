import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "gen-lang-client-0378949193",
  "appId": "1:702921328471:web:22557f03608ebd7598a012",
  "apiKey": "AIzaSyCYjnoBZO66xKg14mBLnl2-mfhR3XhunpA",
  "authDomain": "gen-lang-client-0378949193.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-a7005eb0-a15d-43ba-bfab-9e8601bfbefc",
  "storageBucket": "gen-lang-client-0378949193.firebasestorage.app",
  "messagingSenderId": "702921328471",
  "measurementId": ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const handleFirestoreError = (error: any, context: string) => {
  console.error(`Firestore Error [${context}]:`, error);
  if (error.code === 'permission-denied') {
    throw new Error('У вас нет прав для этого действия. Пожалуйста, авторизуйтесь.');
  }
  throw error;
};
