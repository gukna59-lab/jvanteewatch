import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const configStr = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const firebaseConfig = JSON.parse(configStr);
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

async function run() {
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously");
    await setDoc(doc(firestoreDb, 'backend_state', 'test'), { data: 'test' });
    console.log("Write successful!");
  } catch (e) {
    console.error("Write failed:", e);
  }
}
run();
