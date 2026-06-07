import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    await setDoc(doc(db, 'users', 'test'), { hello: 'world' });
    console.log('Success');
    process.exit(0);
  } catch (e) {
    console.error('Failure:', e);
    process.exit(1);
  }
}
test();
