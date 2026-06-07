import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'friend_requests.json');
const INVITES_FILE = path.join(DATA_DIR, 'room_invites.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'anime_comments.json');

function loadJson(file: string, defaultData: any) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading ${file}:`, e);
  }
  return defaultData;
}

function saveJson(file: string, data: any) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Error saving ${file}:`, e);
  }
}

// In-memory sync objects
export const db = {
  users: loadJson(USERS_FILE, {}),
  friendRequests: loadJson(REQUESTS_FILE, {}),
  roomInvites: loadJson(INVITES_FILE, {}),
  comments: loadJson(COMMENTS_FILE, {}),

  saveUsers() { saveJson(USERS_FILE, this.users); },
  saveFriendRequests() { saveJson(REQUESTS_FILE, this.friendRequests); },
  saveRoomInvites() { saveJson(INVITES_FILE, this.roomInvites); },
  saveComments() { saveJson(COMMENTS_FILE, this.comments); }
};

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function generateId() {
  return crypto.randomBytes(16).toString('hex');
}
