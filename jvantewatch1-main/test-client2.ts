import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

(async () => {
    try {
        await signInAnonymously(auth);
        console.log('signed in');
        await addDoc(collection(db, 'test2'), { a: 1 });
        console.log('success');
    } catch(e) {
        console.log('failed', e);
    }
})();
