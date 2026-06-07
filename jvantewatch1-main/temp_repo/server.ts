import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const configStr = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const firebaseConfig = JSON.parse(configStr);
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const localDb = {
  users: {},
  friendRequests: {},
  roomInvites: {},
  comments: {},

  saveUsers() { setDoc(doc(firestoreDb, 'backend_state', 'users'), { data: this.users }).catch(e => console.error(e)); },
  saveFriendRequests() { setDoc(doc(firestoreDb, 'backend_state', 'friendRequests'), { data: this.friendRequests }).catch(e => console.error(e)); },
  saveRoomInvites() { setDoc(doc(firestoreDb, 'backend_state', 'roomInvites'), { data: this.roomInvites }).catch(e => console.error(e)); },
  saveComments() { setDoc(doc(firestoreDb, 'backend_state', 'comments'), { data: this.comments }).catch(e => console.error(e)); }
};

export async function loadExternalDb() {
  try {
    const uSnap = await getDoc(doc(firestoreDb, 'backend_state', 'users'));
    if (uSnap.exists()) localDb.users = uSnap.data().data || {};

    const fSnap = await getDoc(doc(firestoreDb, 'backend_state', 'friendRequests'));
    if (fSnap.exists()) localDb.friendRequests = fSnap.data().data || {};

    const iSnap = await getDoc(doc(firestoreDb, 'backend_state', 'roomInvites'));
    if (iSnap.exists()) localDb.roomInvites = iSnap.data().data || {};

    const cSnap = await getDoc(doc(firestoreDb, 'backend_state', 'comments'));
    if (cSnap.exists()) localDb.comments = cSnap.data().data || {};
  } catch(e) {
    console.error("Error loading external db", e);
  }
}


function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

async function startServer() {
  await loadExternalDb();
  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Real-time State
  interface User {
    id: string;
    uid?: string;
    username: string;
    avatar?: string;
    color: string;
    currentTimestamp: number;
    isCreator?: boolean;
  }

  interface Message {
    id: string;
    userId: string;
    userUid?: string;
    username: string;
    avatar?: string;
    color: string;
    text: string;
    type?: 'text' | 'image' | 'voice' | 'file';
    mediaUrl?: string;
    createdAt: number;
    isCreator?: boolean;
  }

  interface Room {
    id: string;
    name: string;
    isPublic: boolean;
    creatorId: string;
    creatorUid?: string;
    adminId: string;
    videoUrl: string | null;
    videoTitle?: string | null;
    isPlaying: boolean;
    timestamp: number;
    lastUpdateAt: number;
    users: Record<string, User>;
    chat: Message[];
    queue: { url: string; title: string }[];
    joinOrder: { fingerprint: string, socketId: string }[];
  }

  const rooms: Record<string, Room> = {};
  const onlineUids = new Set<string>();
  const lobbyPings: Record<string, number> = {};

  setInterval(() => {
    const now = Date.now();
    for (const uid in lobbyPings) {
      if (now - lobbyPings[uid] >= 15000) {
        delete lobbyPings[uid];
      }
    }
  }, 10000);

  // API Route for fetching rooms
  app.get('/api/rooms', (req, res) => {
    const activeRooms = Object.values(rooms).map(room => ({
      id: room.id,
      name: room.name,
      isPublic: room.isPublic,
      users: Object.values(room.users).map(u => ({ id: u.id, uid: u.uid, username: u.username, avatar: u.avatar, isCreator: u.isCreator })),
      userCount: Object.keys(room.users).length,
      videoUrl: room.videoUrl,
      videoTitle: room.videoTitle,
      creatorUid: room.creatorUid
    }));
    res.json(activeRooms);
  });
  
  app.post('/api/users/ping', (req, res) => {
    const { uid } = req.body;
    if (uid) {
      lobbyPings[uid] = Date.now();
      const user = localDb.users[uid];
      if (user) {
        user.lastOnline = Date.now();
      }
    }
    res.json({ success: true });
  });

  app.get('/api/users/online', (req, res) => {
    const now = Date.now();
    const activeFromLobby = Object.keys(lobbyPings).filter(uid => now - lobbyPings[uid] < 15000);
    const allOnline = new Set([...Array.from(onlineUids), ...activeFromLobby]);
    res.json(Array.from(allOnline));
  });

  app.post('/api/auth/register', (req, res) => {
    const { login, password, username, avatar } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });
    
    // Check if user exists
    const existing = Object.values(localDb.users).find((u: any) => u.login === login);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const uid = generateId();
    const newUser = {
      uid,
      login,
      passwordHash: hashPassword(password),
      username: username || login,
      avatar: avatar || '',
      country: '',
      description: '',
      friends: [],
      createdAt: Date.now(),
      lastOnline: Date.now()
    };

    localDb.users[uid] = newUser;
    localDb.saveUsers();
    
    // Auto login
    res.json({ token: uid, user: { uid, username: newUser.username, login, avatar: newUser.avatar, description: newUser.description, country: newUser.country, friends: [] } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });
    
    const user: any = Object.values(localDb.users).find((u: any) => u.login === login);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    user.lastOnline = Date.now();
    localDb.saveUsers();

    res.json({ token: user.uid, user: { uid: user.uid, username: user.username, login: user.login, avatar: user.avatar, description: user.description, country: user.country, friends: user.friends || [] } });
  });

  app.get('/api/users/:uid', (req, res) => {
    const user = localDb.users[req.params.uid];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ uid: user.uid, username: user.username, login: user.login, avatar: user.avatar, description: user.description, country: user.country, lastOnline: user.lastOnline, friends: user.friends || [], runHistory: user.runHistory || [], isCreator: user.login === '123456' });
  });

  app.post('/api/users/:uid/update', (req, res) => {
    const { username, avatar, description, country } = req.body;
    const user = localDb.users[req.params.uid];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    
    if (username !== undefined) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;
    if (description !== undefined) user.description = description;
    if (country !== undefined) user.country = country;
    
    localDb.saveUsers();
    res.json({ success: true, user: { uid: user.uid, username: user.username, login: user.login, avatar: user.avatar, description: user.description, country: user.country, friends: user.friends || [], isCreator: user.login === '123456' } });
  });

  app.post('/api/users/:uid/history', (req, res) => {
    const { title, url, timestamp, time, duration } = req.body;
    const user = localDb.users[req.params.uid];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    
    if (!user.runHistory) {
       user.runHistory = [];
    }
    
    // Remove if already exists to put it at the top
    user.runHistory = user.runHistory.filter((item: any) => item.title !== title);
    
    user.runHistory.unshift({
       title,
       url,
       timestamp: timestamp || Date.now(),
       time: time || 0,
       duration: duration || 0
    });
    
    // Keep only last 50 items
    if (user.runHistory.length > 50) {
       user.runHistory = user.runHistory.slice(0, 50);
    }
    
    localDb.saveUsers();
    res.json({ success: true, runHistory: user.runHistory });
  });

  app.get('/api/users/search/:username', (req, res) => {
    const usernameSearch = req.params.username.toLowerCase();
    const user: any = Object.values(localDb.users).find((u: any) => u.username.toLowerCase() === usernameSearch);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ uid: user.uid, username: user.username, login: user.login, avatar: user.avatar, description: user.description, country: user.country, lastOnline: user.lastOnline, isCreator: user.login === '123456' });
  });

  // Friend Requests
  app.get('/api/friends/requests/:uid', (req, res) => {
    const myUid = req.params.uid;
    const requests = Object.values(localDb.friendRequests).filter((req: any) => req.to === myUid);
    res.json(requests);
  });

  app.post('/api/friends/request', (req, res) => {
    const { from, to, fromUsername, fromAvatar } = req.body;
    const id = generateId();
    localDb.friendRequests[id] = { id, from, to, fromUsername, fromAvatar, createdAt: Date.now() };
    localDb.saveFriendRequests();
    res.json({ success: true, id });
  });

  app.post('/api/friends/accept', (req, res) => {
    const { requestId, myUid } = req.body;
    const request = localDb.friendRequests[requestId];
    if (!request) return res.status(404).json({ error: 'Заявка не найдена' });

    const me = localDb.users[myUid];
    const other = localDb.users[request.from];
    if (me && other) {
      if (!me.friends) me.friends = [];
      if (!other.friends) other.friends = [];
      if(!me.friends.includes(other.uid)) me.friends.push(other.uid);
      if(!other.friends.includes(me.uid)) other.friends.push(me.uid);
      localDb.saveUsers();
    }
    delete localDb.friendRequests[requestId];
    localDb.saveFriendRequests();
    res.json({ success: true });
  });

  app.post('/api/friends/remove', (req, res) => {
    const { myUid, friendUid } = req.body;
    const me = localDb.users[myUid];
    const other = localDb.users[friendUid];
    if (me && other) {
      if (me.friends) me.friends = me.friends.filter((id: string) => id !== friendUid);
      if (other.friends) other.friends = other.friends.filter((id: string) => id !== myUid);
      localDb.saveUsers();
    }
    res.json({ success: true });
  });

  app.post('/api/friends/decline', (req, res) => {
    const { requestId } = req.body;
    delete localDb.friendRequests[requestId];
    localDb.saveFriendRequests();
    res.json({ success: true });
  });

  // Room Invites
  app.get('/api/room_invites/:uid', (req, res) => {
    const uid = req.params.uid;
    const invites = Object.values(localDb.roomInvites).filter((inv: any) => inv.to === uid);
    res.json(invites);
  });

  app.post('/api/room_invites', (req, res) => {
    const { to, from, fromUsername, roomId, roomName, isPublic } = req.body;
    const id = generateId();
    localDb.roomInvites[id] = { id, to, from, fromUsername, roomId, roomName, isPublic, createdAt: Date.now() };
    localDb.saveRoomInvites();
    res.json({ success: true, id });
  });

  app.delete('/api/room_invites/:id', (req, res) => {
    delete localDb.roomInvites[req.params.id];
    localDb.saveRoomInvites();
    res.json({ success: true });
  });
  
  // Comments
  app.get('/api/comments/:animeId', (req, res) => {
    const animeId = req.params.animeId;
    const comments = Object.values(localDb.comments)
      .filter((c: any) => c.animeId === animeId)
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json(comments);
  });

  app.post('/api/comments', (req, res) => {
    const { animeId, userId, username, avatar, text, mediaUrl, mediaType, isCreator } = req.body;
    const id = generateId();
    const comment = { id, animeId, userId, username, avatar, text, mediaUrl, mediaType, createdAt: Date.now(), isCreator };
    localDb.comments[id] = comment;
    localDb.saveComments();
    res.json(comment);
  });

  type KodikEpisode = string | {
    link?: unknown;
    url?: unknown;
    src?: unknown;
  };

  type KodikSeason = {
    link?: unknown;
    episodes?: Record<string, KodikEpisode>;
  };

  type KodikResult = {
    link?: unknown;
    url?: unknown;
    src?: unknown;
    seasons?: Record<string, KodikSeason>;
    translation?: {
      title?: unknown;
    };
  };

  type AniLibriaRelease = {
    id?: unknown;
    external_player?: unknown;
    name?: {
      main?: unknown;
      english?: unknown;
      alternative?: unknown;
    };
  };

  type AniLibriaEpisode = {
    ordinal?: unknown;
    sort_order?: unknown;
    hls_480?: unknown;
    hls_720?: unknown;
    hls_1080?: unknown;
  };

  type AnimeSource = {
    voice: string;
    provider: 'anilibria' | 'animevost';
    episodes: number[];
    qualities?: string[];
  };

  const normalizeKodikUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (!url) return null;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://kodik.info${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return null;
  };

  const getEpisodeUrl = (episodeData: KodikEpisode | undefined): string | null => {
    if (!episodeData) return null;
    if (typeof episodeData === 'string') return normalizeKodikUrl(episodeData);
    return normalizeKodikUrl(episodeData.link) || normalizeKodikUrl(episodeData.url) || normalizeKodikUrl(episodeData.src);
  };

  const findPlayerUrl = (result: KodikResult, episode: string): string | null => {
    const seasons = result.seasons && typeof result.seasons === 'object' ? result.seasons : null;

    if (seasons) {
      for (const season of Object.values(seasons)) {
        const episodes = season?.episodes && typeof season.episodes === 'object' ? season.episodes : null;
        const episodeUrl = episodes ? getEpisodeUrl(episodes[episode]) : null;
        if (episodeUrl) return episodeUrl;
      }

      if (episode === '1') {
        for (const season of Object.values(seasons)) {
          const seasonUrl = normalizeKodikUrl(season?.link);
          if (seasonUrl) return seasonUrl;
        }
      }
    }

    return normalizeKodikUrl(result.link) || normalizeKodikUrl(result.url) || normalizeKodikUrl(result.src);
  };

  const getEpisodeNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const range = (from: number, to: number) => {
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
  };

  const manualSourceEpisodes = (provider: AnimeSource['provider'], title: string, episodes: number[]) => {
    const normalized = simplifyTitle(title);

    if (provider === 'anilibria' && normalized === 'наруто') {
      return [1];
    }

    if (provider === 'anilibria' && normalized === 'блич') {
      return episodes.filter(episode => episode !== 343 && episode !== 344);
    }

    return episodes;
  };

  const normalizeExternalUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (!url) return null;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://anilibria.top${url}`;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return null;
  };

  const simplifyTitle = (value: unknown) => {
    return typeof value === 'string'
      ? value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim()
      : '';
  };

  const getAniLibriaScore = (release: AniLibriaRelease, title: string) => {
    const query = simplifyTitle(title);
    if (!query) return 0;

    const names = [
      simplifyTitle(release.name?.main),
      simplifyTitle(release.name?.english),
      simplifyTitle(release.name?.alternative),
    ].filter(Boolean);

    if (names.some(name => name === query)) return 100;
    if (names.some(name => name.includes(query) || query.includes(name))) return 70;

    const queryWords = new Set(query.split(' ').filter(word => word.length > 2));
    if (!queryWords.size) return 0;
    const bestOverlap = Math.max(...names.map(name => {
      const nameWords = new Set(name.split(' ').filter(word => word.length > 2));
      return Array.from(queryWords).filter(word => nameWords.has(word)).length / queryWords.size;
    }), 0);

    return bestOverlap >= 0.75 ? 50 : 0;
  };

  const fetchAniLibriaPlayer = async (title: string, episode: string, quality?: string) => {
    if (!title) return null;

    const searchUrl = new URL('https://anilibria.top/api/v1/app/search/releases');
    searchUrl.searchParams.set('query', title);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
    });

    if (!searchResponse.ok) return null;

    const releases = await searchResponse.json();
    if (!Array.isArray(releases)) return null;

    const scoredReleases = (releases as AniLibriaRelease[])
      .map(release => ({ release, score: getAniLibriaScore(release, title) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const match = scoredReleases[0]?.release;
    const releaseId = typeof match?.id === 'number' || typeof match?.id === 'string' ? String(match.id) : '';
    if (!match || !releaseId) return null;

    const releaseUrl = new URL(`https://anilibria.top/api/v1/anime/releases/${encodeURIComponent(releaseId)}`);
    releaseUrl.searchParams.set('include', 'episodes');

    const releaseResponse = await fetch(releaseUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
    });

    if (releaseResponse.ok) {
      const releaseData = await releaseResponse.json();
      const episodes = Array.isArray(releaseData?.episodes) ? releaseData.episodes as AniLibriaEpisode[] : [];
      const episodeNumber = Number(episode);
      const availableEpisodes = manualSourceEpisodes('anilibria', title, episodes
        .map(item => getEpisodeNumber(item.ordinal) || getEpisodeNumber(item.sort_order))
        .filter((item): item is number => !!item));

      if (!availableEpisodes.includes(episodeNumber)) return null;

      const selectedEpisode = episodes.find(item => Number(item.ordinal) === episodeNumber)
        || episodes.find(item => Number(item.sort_order) === episodeNumber)
        || (episodeNumber === 1 ? episodes[0] : null);
      const qualityUrls = {
        '1080': normalizeExternalUrl(selectedEpisode?.hls_1080),
        '720': normalizeExternalUrl(selectedEpisode?.hls_720),
        '480': normalizeExternalUrl(selectedEpisode?.hls_480),
      };
      const hlsUrl = qualityUrls[quality as keyof typeof qualityUrls]
        || qualityUrls['1080']
        || qualityUrls['720']
        || qualityUrls['480'];

      if (hlsUrl) {
        return {
          url: hlsUrl,
          provider: 'anilibria',
          releaseId,
          qualities: ['1080', '720', '480'].filter(label => !!qualityUrls[label as keyof typeof qualityUrls]),
        };
      }
    }

    const externalUrl = normalizeExternalUrl(match.external_player);
    return externalUrl ? { url: externalUrl, provider: 'anilibria', releaseId } : null;
  };

  const getAniLibriaSource = async (title: string): Promise<AnimeSource | null> => {
    const release = await getAniLibriaRelease(title);
    if (!release) return null;

    const episodes = release.episodes
      .map(episode => getEpisodeNumber(episode.ordinal) || getEpisodeNumber(episode.sort_order))
      .filter((episode): episode is number => !!episode)
      .sort((a, b) => a - b);

    const availableEpisodes = manualSourceEpisodes('anilibria', title, Array.from(new Set(episodes)));
    if (!availableEpisodes.length) return null;

    return {
      voice: 'AniLibria',
      provider: 'anilibria',
      episodes: availableEpisodes,
      qualities: ['1080', '720', '480'],
    };
  };

  const parseAnimeVostTitle = (value: unknown) => {
    if (typeof value !== 'string') return '';
    return simplifyTitle(value.split('/')[0].split('[')[0]);
  };

  const getAnimeVostMatch = async (title: string) => {
    if (!title) return null;

    const response = await fetch('https://api.animevost.org/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
      body: `name=${encodeURIComponent(title)}`,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = Array.isArray(data?.data) ? data.data : [];
    const normalizedTitle = simplifyTitle(title);

    return results.find((item: any) => parseAnimeVostTitle(item.title) === normalizedTitle)
      || results.find((item: any) => {
        const itemTitle = parseAnimeVostTitle(item.title);
        return itemTitle.startsWith(`${normalizedTitle} `) || itemTitle.includes(` ${normalizedTitle} `);
      })
      || null;
  };

  const getAnimeVostPlaylist = async (releaseId: string | number) => {
    const response = await fetch('https://api.animevost.org/v1/playlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
      body: `id=${encodeURIComponent(String(releaseId))}`,
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  };

  const getAnimeVostSource = async (title: string): Promise<AnimeSource | null> => {
    const match = await getAnimeVostMatch(title);
    if (!match?.id) return null;

    const playlist = await getAnimeVostPlaylist(match.id);
    const episodes = playlist
      .map((episode: any) => getEpisodeNumber(episode.name))
      .filter((episode: number | null): episode is number => !!episode)
      .sort((a: number, b: number) => a - b);

    if (!episodes.length) return null;

    return {
      voice: 'AnimeVost',
      provider: 'animevost',
      episodes: Array.from(new Set(episodes)),
      qualities: ['720', '480'],
    };
  };

  const fetchAnimeVostPlayer = async (title: string, episode: string, quality?: string) => {
    const match = await getAnimeVostMatch(title);
    if (!match?.id) return null;

    const playlist = await getAnimeVostPlaylist(match.id);
    const episodeNumber = Number(episode);
    const selectedEpisode = playlist.find((item: any) => getEpisodeNumber(item.name) === episodeNumber);
    if (!selectedEpisode) return null;

    const qualityUrls = {
      '720': normalizeExternalUrl(selectedEpisode.hd),
      '480': normalizeExternalUrl(selectedEpisode.std),
    };
    const url = qualityUrls[quality as keyof typeof qualityUrls] || qualityUrls['720'] || qualityUrls['480'];
    if (!url) return null;

    return {
      url,
      provider: 'animevost',
      releaseId: String(match.id),
      qualities: ['720', '480'].filter(label => !!qualityUrls[label as keyof typeof qualityUrls]),
    };
  };

  const getAniLibriaRelease = async (title: string) => {
    if (!title) return null;

    const searchUrl = new URL('https://anilibria.top/api/v1/app/search/releases');
    searchUrl.searchParams.set('query', title);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
    });

    if (!searchResponse.ok) return null;

    const releases = await searchResponse.json();
    if (!Array.isArray(releases)) return null;

    const scoredReleases = (releases as AniLibriaRelease[])
      .map(release => ({ release, score: getAniLibriaScore(release, title) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const match = scoredReleases[0]?.release;
    const releaseId = typeof match?.id === 'number' || typeof match?.id === 'string' ? String(match.id) : '';
    if (!match || !releaseId) return null;

    const releaseUrl = new URL(`https://anilibria.top/api/v1/anime/releases/${encodeURIComponent(releaseId)}`);
    releaseUrl.searchParams.set('include', 'episodes');

    const releaseResponse = await fetch(releaseUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Jvante anime player',
      },
    });

    if (!releaseResponse.ok) return null;
    const releaseData = await releaseResponse.json();
    const episodes = Array.isArray(releaseData?.episodes) ? releaseData.episodes as AniLibriaEpisode[] : [];

    return {
      id: releaseId,
      release: match,
      episodes,
    };
  };

  app.get('/api/anime-sources', async (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const fallbackEpisodes = typeof req.query.episodes === 'string' ? Number(req.query.episodes) : 0;

    if (!title) {
      res.status(400).json({ error: 'Не передано название аниме.' });
      return;
    }

    const sourceResults = await Promise.allSettled([
      getAniLibriaSource(title),
      getAnimeVostSource(title),
    ]);

    const sources = sourceResults
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter((source): source is AnimeSource => !!source);

    res.json({ sources });
  });

  app.get('/api/anime-player', async (req, res) => {
    const shikimoriId = typeof req.query.shikimoriId === 'string' ? req.query.shikimoriId.trim() : '';
    const episode = typeof req.query.episode === 'string' ? req.query.episode.trim() : '1';
    const voice = typeof req.query.voice === 'string' ? req.query.voice.trim().toLowerCase() : '';
    const provider = typeof req.query.provider === 'string' ? req.query.provider.trim().toLowerCase() : '';
    const quality = typeof req.query.quality === 'string' ? req.query.quality.trim() : '';
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const token = process.env.KODIK_API_TOKEN;
    let aniLibriaPlayer: Awaited<ReturnType<typeof fetchAniLibriaPlayer>> = null;

    if (!/^\d+$/.test(shikimoriId) || !/^\d+$/.test(episode)) {
      res.status(400).json({ error: 'Некорректный ID аниме или серии.' });
      return;
    }

    try {
      if (provider === 'animevost' || voice.includes('animevost')) {
        const animeVostPlayer = await fetchAnimeVostPlayer(title, episode, quality);
        if (animeVostPlayer) {
          res.json(animeVostPlayer);
          return;
        }
        res.status(404).json({ error: 'AnimeVost не вернул эту серию для выбранной озвучки.' });
        return;
      }

      aniLibriaPlayer = await fetchAniLibriaPlayer(title, episode, quality);
    } catch (error) {
      console.warn('AniLibria player lookup failed:', error);
    }

    if (aniLibriaPlayer) {
      res.json(aniLibriaPlayer);
      return;
    }

    if (provider === 'anilibria' || voice.includes('anilibria')) {
      res.status(404).json({ error: 'AniLibria не вернула эту серию для выбранной озвучки.' });
      return;
    }

    if (!token) {
      res.status(503).json({
        error: 'Источник аниме-плеера не настроен. Добавьте KODIK_API_TOKEN или подключите другой легальный embed/API-провайдер.',
      });
      return;
    }

    try {
      const body = new URLSearchParams({
        token,
        shikimori_id: shikimoriId,
        types: 'anime,anime-serial',
        with_episodes: 'true',
        limit: '20',
      });

      const response = await fetch('https://kodik-api.com/search', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Jvante anime player',
        },
        body,
      });

      if (!response.ok) {
        res.status(502).json({ error: `Провайдер плеера ответил ${response.status}.` });
        return;
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results as KodikResult[] : [];
      const sortedResults = voice
        ? [
          ...results.filter(result => {
            const title = typeof result.translation?.title === 'string' ? result.translation.title.toLowerCase() : '';
            return title.includes(voice) || voice.includes(title);
          }),
          ...results.filter(result => {
            const title = typeof result.translation?.title === 'string' ? result.translation.title.toLowerCase() : '';
            return !(title.includes(voice) || voice.includes(title));
          }),
        ]
        : results;
      const playerUrl = sortedResults.map(result => findPlayerUrl(result, episode)).find(Boolean);

      if (!playerUrl) {
        res.status(404).json({ error: 'Провайдер не вернул ссылку на плеер для этой серии.' });
        return;
      }

      res.json({ url: playerUrl, provider: 'kodik' });
    } catch (error) {
      res.status(502).json({ error: 'Не удалось получить ссылку на аниме-плеер.' });
    }
  });

  const canControlPlayback = (room: Room, socketId: string, uid?: string) => {
    return room.creatorId === socketId || (!!room.creatorUid && room.creatorUid === uid);
  };

  const getUserFingerprint = (user: Pick<User, 'uid' | 'username'>) => user.uid || user.username.toLowerCase();

  const getFirstActiveJoiner = (room: Room) => {
    for (const joiner of room.joinOrder) {
      if (room.users[joiner.socketId]) return joiner;
    }
    const firstSocketId = Object.keys(room.users)[0];
    return firstSocketId ? { fingerprint: getUserFingerprint(room.users[firstSocketId]), socketId: firstSocketId } : null;
  };

  const restoreRoomOwnerByJoinOrder = (room: Room) => {
    const firstActiveJoiner = getFirstActiveJoiner(room);
    if (!firstActiveJoiner) return;

    const owner = room.users[firstActiveJoiner.socketId];
    room.creatorId = firstActiveJoiner.socketId;
    room.creatorUid = owner.uid;
    room.adminId = firstActiveJoiner.socketId;
  };

  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentUser: User | null = null;

    socket.on('join_room', ({ roomId, roomName, username, uid, avatar, isPublic = true }) => {
      // Leave previous room if any
      if (currentRoomId && currentRoomId !== roomId) {
        socket.leave(currentRoomId);
        if (rooms[currentRoomId] && rooms[currentRoomId].users[socket.id]) {
          delete rooms[currentRoomId].users[socket.id];
          io.to(currentRoomId).emit('users_updated', Object.values(rooms[currentRoomId].users));
        }
      }

      socket.join(roomId);
      currentRoomId = roomId;

      if (!rooms[roomId]) {
        rooms[roomId] = {
          id: roomId,
          name: roomName || `Комната ${roomId}`,
          isPublic,
          creatorId: socket.id,
          creatorUid: uid || undefined,
          adminId: socket.id,
          videoUrl: null,
          videoTitle: null,
          isPlaying: false,
          timestamp: 0,
          lastUpdateAt: Date.now(),
          users: {},
          chat: [],
          queue: [],
          joinOrder: []
        };
      }

      const color = colors[Math.floor(Math.random() * colors.length)];
      
      let isCreator = false;
      if (uid && localDb.users[uid] && localDb.users[uid].login === '123456') {
         isCreator = true;
      }
      
      currentUser = {
        id: socket.id,
        uid: uid || undefined,
        username: username || `User ${socket.id.substring(0, 4)}`,
        avatar: avatar || undefined,
        color,
        currentTimestamp: 0,
        isCreator
      };
      
      const fingerprint = getUserFingerprint(currentUser);
      const existingOrder = rooms[roomId].joinOrder.find(j => j.fingerprint === fingerprint);
      if (!existingOrder) {
         rooms[roomId].joinOrder.push({ fingerprint, socketId: socket.id });
      } else {
         existingOrder.socketId = socket.id;
      }

      // If room is empty but still exists (e.g. all left but not GC'd), make the first joiner creator/admin.
      if (Object.keys(rooms[roomId].users).length === 0) {
        rooms[roomId].creatorId = socket.id;
        rooms[roomId].creatorUid = uid || undefined;
        rooms[roomId].adminId = socket.id;
      }

      if (uid) {
        onlineUids.add(uid);
      }

      rooms[roomId].users[socket.id] = currentUser;

      const prevCreatorId = rooms[roomId].creatorId;
      const prevAdminId = rooms[roomId].adminId;
      restoreRoomOwnerByJoinOrder(rooms[roomId]);
      if (prevCreatorId !== rooms[roomId].creatorId) io.to(roomId).emit('creator_changed', rooms[roomId].creatorId);
      if (prevAdminId !== rooms[roomId].adminId) io.to(roomId).emit('admin_changed', rooms[roomId].adminId);

      // Send initial state to the user
      socket.emit('room_state', {
        roomState: {
          creatorId: rooms[roomId].creatorId,
          adminId: rooms[roomId].adminId,
          videoUrl: rooms[roomId].videoUrl,
          videoTitle: rooms[roomId].videoTitle,
          isPlaying: rooms[roomId].isPlaying,
          timestamp: rooms[roomId].timestamp,
          lastUpdateAt: rooms[roomId].lastUpdateAt,
          name: rooms[roomId].name,
          queue: rooms[roomId].queue
        },
        users: Object.values(rooms[roomId].users),
        chat: rooms[roomId].chat,
        me: currentUser
      });

      // Broadcast new user to everyone else
      socket.to(roomId).emit('users_updated', Object.values(rooms[roomId].users));
      
      const joinMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        userId: 'system',
        username: 'Система',
        color: '#888',
        text: `${currentUser.username} присоединился к комнате`,
        createdAt: Date.now()
      };
      rooms[roomId].chat.push(joinMessage);
      io.to(roomId).emit('chat_message', joinMessage);
    });

    socket.on('update_video_url', (payload) => {
      // Handle both old client (string) and new client (object)
      const videoUrl = typeof payload === 'string' ? payload : payload.url;
      const videoTitle = typeof payload === 'string' ? null : payload.title;

      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;

      rooms[currentRoomId].videoUrl = videoUrl;
      rooms[currentRoomId].videoTitle = videoTitle;
      rooms[currentRoomId].timestamp = 0;
      rooms[currentRoomId].isPlaying = false;
      rooms[currentRoomId].lastUpdateAt = Date.now();

      io.to(currentRoomId).emit('video_url_updated', { url: videoUrl, title: videoTitle });
      io.to(currentRoomId).emit('sync_playback', {
        isPlaying: false,
        timestamp: 0,
        updatedAt: Date.now()
      });
    });

    socket.on('play_next_queue', () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;

      const room = rooms[currentRoomId];
      if (room.queue.length > 0) {
         const next = room.queue.shift();
         if (next) {
            room.videoUrl = next.url;
            room.videoTitle = next.title;
            room.timestamp = 0;
            room.isPlaying = false;
            room.lastUpdateAt = Date.now();

            io.to(currentRoomId).emit('video_url_updated', { url: next.url, title: next.title });
            io.to(currentRoomId).emit('queue_updated', room.queue);
            io.to(currentRoomId).emit('sync_playback', {
              isPlaying: false,
              timestamp: 0,
              updatedAt: Date.now()
            });
         }
      } else {
         room.videoUrl = null;
         room.videoTitle = null;
         io.to(currentRoomId).emit('video_url_updated', null);
      }
    });

    socket.on('add_to_queue', ({ url, title }) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      rooms[currentRoomId].queue.push({ url, title: title || 'Без названия' });
      io.to(currentRoomId).emit('queue_updated', rooms[currentRoomId].queue);
    });

    socket.on('remove_from_queue', (index) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;
      
      rooms[currentRoomId].queue.splice(index, 1);
      io.to(currentRoomId).emit('queue_updated', rooms[currentRoomId].queue);
    });

    socket.on('play_state_change', ({ isPlaying, timestamp }) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;

      rooms[currentRoomId].isPlaying = isPlaying;
      rooms[currentRoomId].timestamp = timestamp;
      rooms[currentRoomId].lastUpdateAt = Date.now();

      // Broadcast to everyone
      io.to(currentRoomId).emit('sync_playback', {
        isPlaying,
        timestamp,
        updatedAt: rooms[currentRoomId].lastUpdateAt
      });
    });

    socket.on('seek', (timestamp) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;

      rooms[currentRoomId].timestamp = timestamp;
      rooms[currentRoomId].lastUpdateAt = Date.now();

      // Force everyone to seek
      io.to(currentRoomId).emit('sync_playback', {
        isPlaying: rooms[currentRoomId].isPlaying,
        timestamp,
        updatedAt: rooms[currentRoomId].lastUpdateAt
      });
    });

    socket.on('force_sync', () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (!canControlPlayback(rooms[currentRoomId], socket.id, currentUser?.uid)) return;

      // Broadcast the last known good state
      io.to(currentRoomId).emit('sync_playback', {
        isPlaying: rooms[currentRoomId].isPlaying,
        timestamp: rooms[currentRoomId].timestamp,
        updatedAt: rooms[currentRoomId].lastUpdateAt
      });
    });

    socket.on('transfer_admin', (newAdminId) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (rooms[currentRoomId].adminId !== socket.id) return;
      if (!rooms[currentRoomId].users[newAdminId]) return;

      rooms[currentRoomId].adminId = newAdminId;
      io.to(currentRoomId).emit('admin_changed', newAdminId);
      
      const adminMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        userId: 'system',
        username: 'Система',
        color: '#888',
        text: `${rooms[currentRoomId].users[newAdminId].username} стал администратором`,
        createdAt: Date.now()
      };
      rooms[currentRoomId].chat.push(adminMessage);
      io.to(currentRoomId).emit('chat_message', adminMessage);
    });

    socket.on('kick_user', (userIdToKick) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      if (rooms[currentRoomId].adminId !== socket.id) return; // Only admin can kick
      if (!rooms[currentRoomId].users[userIdToKick]) return;

      const kickedUsername = rooms[currentRoomId].users[userIdToKick].username;
      
      // Tell the user they are kicked
      io.to(userIdToKick).emit('kicked');
      
      // Make them leave the room sockets
      const kickedSocket = io.sockets.sockets.get(userIdToKick);
      if (kickedSocket) {
         kickedSocket.leave(currentRoomId);
      }

      delete rooms[currentRoomId].users[userIdToKick];
      io.to(currentRoomId).emit('users_updated', Object.values(rooms[currentRoomId].users));

      const kickMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        userId: 'system',
        username: 'Система',
        color: '#EF4444',
        text: `${kickedUsername} был исключен администратором.`,
        createdAt: Date.now()
      };
      rooms[currentRoomId].chat.push(kickMsg);
      io.to(currentRoomId).emit('chat_message', kickMsg);
    });

    socket.on('report_progress', (timestamp) => {
      if (!currentRoomId || !rooms[currentRoomId] || !currentUser) return;
      rooms[currentRoomId].users[socket.id].currentTimestamp = timestamp;
      // We could broadcast frequently, or just let users query. We'll broadcast every 2-3s in an interval for efficiency
    });

    socket.on('send_chat', ({ text, type = 'text', mediaUrl }) => {
      if (!currentRoomId || !rooms[currentRoomId] || !currentUser) return;

      const message: Message = {
        id: Math.random().toString(36).substring(2, 9),
        userId: currentUser.uid || socket.id,
        userUid: currentUser.uid,
        username: currentUser.username,
        avatar: currentUser.avatar,
        color: currentUser.color,
        text: text ? text.trim() : '',
        type,
        mediaUrl,
        createdAt: Date.now(),
        isCreator: currentUser.isCreator
      };

      rooms[currentRoomId].chat.push(message);
      // Keep chat history bounded if necessary
      if (rooms[currentRoomId].chat.length > 500) {
        rooms[currentRoomId].chat.shift();
      }

      io.to(currentRoomId).emit('chat_message', message);
    });

    socket.on('send_reaction', (emoji) => {
      if (!currentRoomId || !currentUser) return;
      io.to(currentRoomId).emit('receive_reaction', {
         id: Math.random().toString(36).substring(7),
         emoji,
         username: currentUser.username,
         userId: socket.id
      });
    });

    // --- WebRTC Voice Chat Signaling ---
    socket.on('webrtc_offer', ({ target, offer }) => {
      io.to(target).emit('webrtc_offer', {
        sender: socket.id,
        offer
      });
    });

    socket.on('webrtc_answer', ({ target, answer }) => {
      io.to(target).emit('webrtc_answer', {
        sender: socket.id,
        answer
      });
    });

    socket.on('webrtc_ice_candidate', ({ target, candidate }) => {
      io.to(target).emit('webrtc_ice_candidate', {
        sender: socket.id,
        candidate
      });
    });

    socket.on('voice_joined', () => {
      if (currentRoomId) {
         socket.to(currentRoomId).emit('voice_user_joined', socket.id);
      }
    });

    socket.on('voice_left', () => {
      if (currentRoomId) {
         socket.to(currentRoomId).emit('voice_user_left', socket.id);
      }
    });

    socket.on('disconnect', () => {
      if (currentUser?.uid) {
         onlineUids.delete(currentUser.uid);
      }
      
      if (currentRoomId) {
         socket.to(currentRoomId).emit('voice_user_left', socket.id);
      }

      if (currentRoomId && rooms[currentRoomId]) {
        if (rooms[currentRoomId].users[socket.id]) {
          const username = rooms[currentRoomId].users[socket.id].username;
          delete rooms[currentRoomId].users[socket.id];
          io.to(currentRoomId).emit('users_updated', Object.values(rooms[currentRoomId].users));
          
          const leftMessage: Message = {
            id: Math.random().toString(36).substring(2, 9),
            userId: 'system',
            username: 'Система',
            color: '#888',
            text: `${username} покинул комнату`,
            createdAt: Date.now()
          };
          rooms[currentRoomId].chat.push(leftMessage);
          io.to(currentRoomId).emit('chat_message', leftMessage);

          // If the admin leaves, assign a new admin or clean up the room if empty
          const remainingUsers = Object.keys(rooms[currentRoomId].users);
          if (remainingUsers.length === 0) {
            delete rooms[currentRoomId];
          } else if (rooms[currentRoomId].creatorId === socket.id || rooms[currentRoomId].adminId === socket.id) {
            const prevCreatorId = rooms[currentRoomId].creatorId;
            const prevAdminId = rooms[currentRoomId].adminId;
            restoreRoomOwnerByJoinOrder(rooms[currentRoomId]);
            if (prevCreatorId !== rooms[currentRoomId].creatorId) {
               io.to(currentRoomId).emit('creator_changed', rooms[currentRoomId].creatorId);
            }
            if (prevAdminId !== rooms[currentRoomId].adminId) {
               io.to(currentRoomId).emit('admin_changed', rooms[currentRoomId].adminId);
            }
          }
        }
      }
    });
  });

  // Background interval to broadcast user progress (so the bottom info is up to date)
  setInterval(() => {
    Object.values(rooms).forEach((room) => {
      if (Object.keys(room.users).length > 0) {
        const progressMap: Record<string, number> = {};
        Object.values(room.users).forEach(u => {
          progressMap[u.id] = u.currentTimestamp;
        });
        io.to(room.id).emit('users_progress', progressMap);
      }
    });
  }, 2000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
