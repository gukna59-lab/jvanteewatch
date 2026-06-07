import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const fbConf = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp({ projectId: fbConf.projectId });
const db = getFirestore(app, fbConf.firestoreDatabaseId);

async function test() {
  await db.collection("test").doc("test").set({hello: "world"});
  const doc = await db.collection("test").doc("test").get();
  console.log(doc.data());
}
test().catch(console.error);
