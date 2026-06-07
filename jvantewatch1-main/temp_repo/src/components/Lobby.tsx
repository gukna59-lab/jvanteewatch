import React, { useState, useEffect } from 'react';
import { PlaySquare, Users, Video, LogOut, Settings, Upload, X, Search, Key, Plus, Lock, Globe, UserPlus, Check, XCircle, MonitorPlay, ChevronRight, User as UserIcon, Moon, Star, Heart, BadgeCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COUNTRIES = [
  { code: '', name: 'Не указана' },
  { code: 'RU', name: 'Россия' },
  { code: 'UA', name: 'Украина' },
  { code: 'KZ', name: 'Казахстан' },
  { code: 'BY', name: 'Беларусь' },
  { code: 'UZ', name: 'Узбекистан' },
  { code: 'AM', name: 'Армения' },
  { code: 'GE', name: 'Грузия' },
  { code: 'AZ', name: 'Азербайджан' },
  { code: 'KG', name: 'Кыргызстан' },
  { code: 'TJ', name: 'Таджикистан' },
  { code: 'MD', name: 'Молдова' },
  { code: 'US', name: 'США' },
  { code: 'GB', name: 'Великобритания' },
  { code: 'DE', name: 'Германия' },
  { code: 'FR', name: 'Франция' },
  { code: 'ES', name: 'Испания' },
  { code: 'IT', name: 'Италия' },
  { code: 'TR', name: 'Турция' },
  { code: 'PL', name: 'Польша' },
  { code: 'FI', name: 'Финляндия' },
  { code: 'JP', name: 'Япония' },
  { code: 'CN', name: 'Китай' },
  { code: 'KR', name: 'Южная Корея' },
  // Adding 15 new ones as requested:
  { code: 'ID', name: 'Индонезия' },
  { code: 'MY', name: 'Малайзия' },
  { code: 'PH', name: 'Филиппины' },
  { code: 'VN', name: 'Вьетнам' },
  { code: 'TH', name: 'Таиланд' },
  { code: 'IN', name: 'Индия' },
  { code: 'BR', name: 'Бразилия' },
  { code: 'MX', name: 'Мексика' },
  { code: 'AR', name: 'Аргентина' },
  { code: 'CA', name: 'Канада' },
  { code: 'AU', name: 'Австралия' },
  { code: 'SE', name: 'Швеция' },
  { code: 'NO', name: 'Норвегия' },
  { code: 'DK', name: 'Дания' },
  { code: 'NL', name: 'Нидерланды' },
];

interface LobbyProps {
  onJoin: (username: string, roomId: string, avatar?: string, isPublic?: boolean, roomName?: string) => void;
  onWatchAnime?: () => void;
  user: any | null;
  defaultUsername: string | null;
  defaultAvatar: string | null;
}

const fileToAvatarDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выберите картинку.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Не удалось открыть картинку.'));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось обработать картинку.'));
          return;
        }
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        ctx.drawImage(image, x, y, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export function Logo({ className = "w-full h-full text-indigo-500" }: { className?: string }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-1">
      <Moon className={className} />
      <Star className="absolute top-1 right-1 w-1/3 h-1/3 text-amber-400 fill-amber-400" />
      <Heart className="absolute bottom-1 right-1 w-1/3 h-1/3 text-pink-500 fill-pink-500" />
    </div>
  );
}

const getStablePing = (uid: string) => {
  if (!uid) return 0;
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 45) + 12;
};

export function Lobby({ onJoin, onWatchAnime, user, defaultUsername, defaultAvatar }: LobbyProps) {
  const [username, setUsername] = useState(user?.username || defaultUsername || '');
  const [avatar, setAvatar] = useState(user?.avatar || defaultAvatar || '');
  const [description, setDescription] = useState(user?.description || '');
  const [country, setCountry] = useState(user?.country || '');
  
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [chatBg, setChatBg] = useState(() => localStorage.getItem('chatBg') || '');
  useEffect(() => {
    const handleStorageChange = () => {
      setChatBg(localStorage.getItem('chatBg') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatBg_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatBg_changed', handleStorageChange);
    };
  }, []);

  const [activeModal, setActiveModal] = useState<'create' | 'join' | 'friends' | 'watchAlone' | 'profile' | 'settings' | 'viewProfile' | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  
  const [joinRoomId, setJoinRoomId] = useState('');
  
  const [friends, setFriends] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState('');
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'light');

  const [newRoomName, setNewRoomName] = useState('');
  const [onlineUsersMap, setOnlineUsersMap] = useState<string[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const normalizeLogin = (value: string) => value.trim();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const isPublicParam = params.get('isPublic') !== 'false';
    if (roomParam) {
      onJoin(username || 'Киноман', roomParam, avatar || '', isPublicParam);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.username) setUsername(user.username);
      if (user.avatar) setAvatar(user.avatar);
      if (user.description) setDescription(user.description);
      if (user.country) setCountry(user.country);
      if (user.friends) setFriends(user.friends);
    }
  }, [user]);

  useEffect(() => {
    const fetchFriendsProfiles = async () => {
      const ObjectProfiles = await Promise.all(
        friends.map(async (id) => {
          try {
             const res = await fetch(`/api/users/${id}`);
             if (res.ok) {
                return await res.json();
             }
          } catch(e) {}
          return null;
        })
      );
      setFriendsList(ObjectProfiles.filter(p => p !== null));
    };
    if (friends.length > 0) {
      fetchFriendsProfiles();
    } else {
      setFriendsList([]);
    }
  }, [friends]);

  // Realtime Friends and Requests (polling replacement)
  useEffect(() => {
    if (!user) return;
    
    const fetchRequests = async () => {
       try {
          const res = await fetch(`/api/friends/requests/${user.uid}`);
          if (res.ok) {
             setFriendRequests(await res.json());
          }
       } catch (e) {}
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch active rooms and online users
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [roomsRes, onlineRes] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/users/online')
        ]);
        const roomsData = await roomsRes.json();
        const onlineData = await onlineRes.json();
        setActiveRooms(roomsData);
        setOnlineUsersMap(onlineData);
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const handleCreateRoom = (isPublic: boolean) => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    onJoin(username || 'Киноман', newRoomId, avatar, isPublic, newRoomName.trim() || `Комната ${newRoomId}`);
    setNewRoomName('');
  };

  const handleJoinById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim() === '') return;
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
         const serverRooms = await res.json();
         const roomExists = serverRooms.some((r: any) => r.id === joinRoomId.trim());
         if (!roomExists) {
           alert('Комната с таким кодом не существует.');
           return;
         }
         onJoin(username || 'Киноман', joinRoomId.trim(), avatar, false);
      }
    } catch(err) {
      alert('Ошибка при проверке комнаты');
    }
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    if (!searchUsername.trim()) return;
    
    if (searchUsername.toLowerCase() === username.toLowerCase()) {
      setSearchError('Вы не можете добавить себя');
      return;
    }

    try {
      const res = await fetch(`/api/users/search/${encodeURIComponent(searchUsername.trim())}`);
      if (!res.ok) {
        setSearchError('Пользователь не найден');
      } else {
        const foundUser = await res.json();
        setSearchResult({ id: foundUser.uid, ...foundUser });
      }
    } catch (err) {
      setSearchError('Ошибка поиска');
    }
  };

  const handleSendRequest = async (targetId: string, targetUsername?: string, targetAvatar?: string) => {
    if (!user) return;
    try {
      await fetch('/api/friends/request', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            from: user.uid,
            to: targetId,
            fromUsername: username,
            fromAvatar: avatar
         })
      });
      setSentRequests(prev => [...prev, targetId]);
    } catch (err) {
      alert('Ошибка при отправке заявки');
    }
  };

  const handleAcceptRequest = async (req: any) => {
    if (!user) return;
    try {
      await fetch('/api/friends/accept', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ requestId: req.id, myUid: user.uid })
      });
      setFriends(prev => {
         if (!prev.includes(req.from)) return [...prev, req.from];
         return prev;
      });
      setFriendRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) {
      alert('Ошибка при принятии');
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await fetch('/api/friends/decline', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ requestId: reqId })
      });
      setFriendRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {}
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await fetch('/api/friends/remove', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ myUid: user.uid, friendUid: friendId })
      });
      setFriends(prev => prev.filter(id => id !== friendId));
      setFriendsList(prev => prev.filter(f => f.uid !== friendId));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const normalizedLogin = normalizeLogin(login);
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(normalizedLogin)) {
      setAuthError('Логин должен быть от 3 до 24 символов (английские буквы, цифры, точка, тире, подчеркивание)');
      return;
    }
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ login: normalizedLogin, password })
      });
      const data = await res.json();
      if (!res.ok) {
         setAuthError(data.error || 'Ошибка аутентификации');
         return;
      }
      localStorage.setItem('auth_token', data.token);
      window.dispatchEvent(new Event('auth_changed'));
    } catch (err: any) {
      setAuthError('Ошибка подключения к серверу');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.uid}/update`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ username: username || 'User', avatar: avatar || '', description, country })
      });
      if (res.ok) {
         setActiveModal(null);
         window.dispatchEvent(new Event('auth_changed'));
      }
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(dataUrl);
    } catch (err: any) {
      alert(err.message || 'Не удалось загрузить аватарку.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLogout = () => {
     localStorage.removeItem('auth_token');
     window.dispatchEvent(new Event('auth_changed'));
  };

  const openUserProfile = async (userId: string) => {
    if(userId === user?.uid) {
       setActiveModal('profile');
       return;
    }
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingUser(data);
        setActiveModal('viewProfile');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const timeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Недавно';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `только что`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} м. назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} д. назад`;
  };

  // --- RENDERS ---
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-main font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-bg-card border border-border-card rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center border border-border-card shadow-inner overflow-hidden">
              <Logo />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-[#3B82F6]">JVANTE</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm">{authError}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Логин</label>
              <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} required autoComplete="username" className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-text-main placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isRegistering ? 'new-password' : 'current-password'} className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-text-main placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" />
            </div>
            <button type="submit" className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold rounded-xl px-4 py-3 transition-all mt-4">{isRegistering ? 'Зарегистрироваться' : 'Войти'}</button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-400 hover:text-blue-300 block w-full mb-2">{isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}</button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // Determine rooms to show:
  // Public rooms, or private rooms if a friend is inside.
  const displayRooms = activeRooms.filter(room => {
    if (room.isPublic) return true;
    const hasFriend = room.users.some((u: any) => friends.includes(u.uid));
    return hasFriend;
  });

  const generateFlagEmoji = (countryCode: string) => {
    if(!countryCode) return '';
    return <img src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} width="16" alt={countryCode} className="inline-block" />;
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans flex flex-col items-center">
      
      {/* Header Profile */}
      <header className="w-full max-w-4xl px-4 py-6 flex items-center justify-between z-10">
        <button onClick={() => setActiveModal('profile')} className="flex items-center gap-3 hover:bg-bg-card p-2 rounded-2xl transition-colors text-left outline-none">
          <div className="relative">
             <div className={`w-12 h-12 bg-bg-card rounded-2xl flex items-center justify-center border overflow-hidden ${user?.isCreator ? 'border-amber-500 ring-2 ring-amber-500/50' : 'border-border-card'}`}>
               {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <Logo />}
             </div>
             {user?.isCreator && (
               <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-[#0A0C10] shadow-sm z-10 pointer-events-none">
                 <BadgeCheck className="w-4 h-4 text-white" />
               </div>
             )}
             {country && (
               <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1F2937] rounded-full flex items-center justify-center text-[12px] border-2 border-[#0A0C10] overflow-hidden leading-none shadow-sm">
                 {generateFlagEmoji(country)}
               </div>
             )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight truncate max-w-[150px] flex items-center gap-1">{username} {user?.isCreator && <BadgeCheck className="w-5 h-5 text-amber-500" />}</h1>
            <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              В сети
            </p>
          </div>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl px-4 flex flex-col gap-6 relative pb-32">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold tracking-tight px-2 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" />
            Активные комнаты
          </h2>
          {displayRooms.length === 0 ? (
            <div className="text-center py-12 bg-bg-card rounded-3xl border border-border-card border-dashed">
              <Video className="w-12 h-12 text-[#374151] mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Нет активных комнат.</p>
              <p className="text-zinc-600 text-xs mt-1">Создайте свою и пригласите друзей!</p>
            </div>
          ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayRooms.sort((a, b) => {
                const aFriend = a.users.some((u: any) => friends.includes(u.uid));
                const bFriend = b.users.some((u: any) => friends.includes(u.uid));
                return (bFriend ? 1 : 0) - (aFriend ? 1 : 0);
              }).map(room => {
                const hasFriend = room.users.some((u: any) => friends.includes(u.uid));
                const creator = room.users.find((u: any) => u.uid === room.creatorUid) || room.users[0];

                return (
                  <motion.div whileHover={{ scale: 1.02 }} key={room.id} className="bg-bg-card border border-border-card hover:border-blue-500/50 rounded-2xl p-5 transition-all relative overflow-hidden group flex flex-col h-full cursor-default">
                    {hasFriend && (
                      <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-bl-lg font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3" /> Друг смотрит
                      </div>
                    )}
                    <h3 onClick={() => onJoin(username, room.id, avatar, room.isPublic, room.name)} className="font-semibold text-lg flex items-center gap-2 truncate pr-16 mb-1 cursor-pointer">
                      {room.isPublic ? <Globe className="w-4 h-4 text-zinc-400 shrink-0" /> : <Lock className="w-4 h-4 text-zinc-400 shrink-0" />}
                      <span className="truncate hover:text-blue-400">{room.name || `Комната ${room.id}`}</span>
                    </h3>
                    
                    <div className="flex-1">
                      {creator && (
                         <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1 truncate">
                           Создатель: <button onClick={() => openUserProfile(creator.uid)} className="font-medium text-zinc-300 truncate hover:text-blue-400 transition-colors">{creator.username}</button>
                         </p>
                      )}
                      
                      {room.videoTitle && (
                         <p className="text-xs text-blue-400 mb-3 flex items-center gap-1 truncate">
                           <PlaySquare className="w-3 h-3 shrink-0" /> <span className="truncate">{room.videoTitle}</span>
                         </p>
                      )}
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-border-card">
                      <p className="text-xs text-zinc-500">{room.userCount} {room.userCount === 1 ? 'зритель' : 'зрителей'}</p>
                      <div className="flex -space-x-2">
                         {room.users.slice(0, 5).map((u: any, i: number) => (
                           <div key={i} className="relative z-10 hover:scale-110 transition-transform" style={{ zIndex: 10 - i }}>
                             <button onClick={(e) => { e.stopPropagation(); openUserProfile(u.uid); }} title={`${u.username} (${getStablePing(u.uid)} мс)`} className={`w-6 h-6 rounded-full border-2 ${u.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-bg-card'} bg-bg-hover overflow-hidden flex items-center justify-center`}>
                               {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-text-muted">{u.username.substring(0, 2).toUpperCase()}</span>}
                             </button>
                             {u.isCreator && (
                               <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-20 pointer-events-none">
                                 <BadgeCheck className="w-2 h-2 text-white" />
                               </div>
                             )}
                           </div>
                         ))}
                         {room.users.length > 5 && (
                           <div className="w-6 h-6 rounded-full border-2 border-bg-card bg-[#3B82F6] flex items-center justify-center text-[8px] font-bold text-white z-0">
                             +{room.users.length - 5}
                           </div>
                         )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
        <div className="bg-bg-card/90 backdrop-blur-xl border border-border-card p-2 rounded-2xl shadow-2xl flex items-center gap-2">
          <button onClick={() => setActiveModal('create')} className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all group">
             <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
             <span className="hidden sm:inline">Создать лобби</span>
          </button>
          <div className="w-[1px] h-8 bg-[#1F2937] mx-1"></div>
          <button onClick={() => setActiveModal('friends')} className="p-3 bg-transparent hover:bg-bg-hover rounded-xl text-zinc-400 hover:text-white transition-all relative group" title="Поиск друзей">
             <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
             {friendRequests.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#11141A]"></span>
             )}
          </button>
          <button onClick={() => setActiveModal('watchAlone')} className="p-3 bg-transparent hover:bg-bg-hover rounded-xl text-zinc-400 hover:text-white transition-all relative group" title="Смотреть одному">
             <MonitorPlay className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => setActiveModal('join')} className="p-3 bg-transparent hover:bg-bg-hover rounded-xl text-zinc-400 hover:text-white transition-all group" title="Войти по коду">
             <Key className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          <button onClick={() => setActiveModal('settings')} className="p-3 bg-transparent hover:bg-bg-hover rounded-xl text-zinc-400 hover:text-white transition-all group" title="Настройки">
             <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm"></motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-bg-card border border-border-card rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 bg-bg-hover rounded-full transition-colors z-10"><X className="w-4 h-4" /></button>
              
              {activeModal === 'profile' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Изменить профиль</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-center">
                       <label className="relative block w-24 h-24 rounded-3xl bg-bg-hover overflow-hidden cursor-pointer group border-2 border-border-card hover:border-blue-500 transition-colors">
                          {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-zinc-500 m-auto mt-6" />}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Upload className="w-6 h-6 text-white" />
                          </div>
                          <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                       </label>
                    </div>
                    {avatar && <div className="text-center"><button onClick={() => setAvatar('')} className="text-xs text-red-500 hover:underline">Удалить аватарку</button></div>}
                    <div className="space-y-2">
                       <label className="text-xs font-medium text-zinc-400">Никнейм</label>
                       <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-medium text-zinc-400">Описание профиля</label>
                       <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none resize-none" placeholder="Расскажите о себе..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-medium text-zinc-400">Страна</label> <div className="relative"> <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-bg-main border border-border-card rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-500/50 outline-none appearance-none cursor-pointer"> {COUNTRIES.map(c => ( <option key={c.code} value={c.code}> {c.name} </option> ))} </select> <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"> {country ? generateFlagEmoji(country) : <Globe className="w-4 h-4 text-zinc-500" />} </div> </div>
                    </div>
                    <button onClick={handleSaveProfile} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">Сохранить</button>
                  </div>
                </div>
              )}

              {activeModal === 'settings' && chatBg && (
                  <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center pointer-events-none rounded-[2rem] animate-pulse" style={{ backgroundImage: `url(${chatBg})` }}></div>
              )}
              {activeModal === 'settings' && (
                <div className="space-y-6 relative z-10">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-zinc-800 text-zinc-400 rounded-2xl mx-auto flex items-center justify-center mb-4"><Settings className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold">Настройки</h2>
                  </div>
                  <div className="space-y-4">
                     <div className="p-4 bg-bg-main border border-border-card rounded-xl">
                        <label className="text-sm font-semibold flex items-center justify-between cursor-pointer">
                           <span>Светлая тема</span>
                           <input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer" checked={isLightMode} onChange={(e) => {
                              const newTheme = e.target.checked ? 'light' : 'dark';
                              document.documentElement.setAttribute('data-theme', newTheme);
                              localStorage.setItem('theme', newTheme);
                              setIsLightMode(e.target.checked);
                           }} />
                        </label>
                     </div>

                                          <div className="p-4 bg-bg-main border border-border-card rounded-xl space-y-2 relative z-10">
                        <label className="text-sm font-semibold block">Анимированный Фон чата и настроек (URL)</label>
                        <p className="text-xs text-text-muted mb-2">Оставьте пустым для стандартного фона.</p>
                        <input type="text" placeholder="https://..." defaultValue={localStorage.getItem('chatBg') || ''} onBlur={(e) => {
                           localStorage.setItem('chatBg', e.target.value.trim());
                           window.dispatchEvent(new Event('chatBg_changed'));
                        }} className="w-full bg-bg-card border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 outline-none" />
                     </div>
                     <button onClick={handleLogout} className="w-full flex justify-between items-center px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-xl transition-colors border border-red-500/20">
                        Выйти из аккаунта
                        <LogOut className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              )}

              {activeModal === 'viewProfile' && viewingUser && (
                <div className="space-y-6 relative">
                  {viewingUser.isCreator && (
                     <div 
                        className="absolute top-0 left-0 right-0 h-48 rounded-t-3xl bg-cover bg-center bg-no-repeat -m-6 mb-0 border-b border-white/10 z-0"
                        style={{ backgroundImage: "url('https://images.steamusercontent.com/ugc/2019340792128509985/0C10FDDAD3F295FD42EEBD97E88C56EDD13CD2DA/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false')" }}
                     >
                        <div className="w-full h-full bg-black/40 rounded-t-3xl backdrop-blur-[2px]"></div>
                     </div>
                  )}
                  <div className={`flex flex-col items-center ${viewingUser.isCreator ? 'mt-16 relative z-10' : ''}`}>
                    <div className="relative mb-4 shadow-xl">
                       <div className={`w-24 h-24 rounded-full bg-bg-hover border-4 ${viewingUser.isCreator ? 'border-amber-500' : 'border-border-card'} overflow-hidden relative backdrop-blur-xl`}>
                          {viewingUser.avatar ? <img src={viewingUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-500">{viewingUser.username.substring(0,2).toUpperCase()}</div>}
                       </div>
                       {viewingUser.country && (
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1F2937] rounded-full flex items-center justify-center text-[18px] border-4 border-[#11141A] overflow-hidden leading-none shadow-md">
                             {generateFlagEmoji(viewingUser.country)}
                          </div>
                       )}
                       {viewingUser.isCreator && (
                          <div title="Верифицированный VIP-аккаунт" className="absolute -top-2 -left-2 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center border-4 border-[#11141A] shadow-md z-10 cursor-help">
                             <BadgeCheck className="w-5 h-5 text-white" />
                          </div>
                       )}
                    </div>
                    <h2 className="text-2xl font-bold flex items-center gap-1">
                      {viewingUser.username}
                      {viewingUser.isCreator && <span title="Верифицированный VIP-аккаунт" className="flex items-center"><BadgeCheck className="w-5 h-5 text-amber-500" /></span>}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                       {onlineUsersMap.includes(viewingUser.uid) ? (
                         <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span><span className="text-xs text-emerald-400">Онлайн (Пинг: {getStablePing(viewingUser.uid)}мс)</span></>
                       ) : (
                         <><span className="w-2 h-2 rounded-full bg-zinc-500"></span><span className="text-xs text-zinc-400">Оффлайн ({timeAgo(viewingUser.lastOnline)})</span></>
                       )}
                    </div>
                  </div>
                  
                  {activeRooms.find(r => r.users.some((u:any) => u.uid === viewingUser.uid)) && (() => {
                     const uRoom = activeRooms.find(r => r.users.some((u:any) => u.uid === viewingUser.uid));
                     if(!uRoom) return null;
                     return (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                           <div className="flex-1 min-w-0 pr-2">
                              <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><PlaySquare className="w-3 h-3" /> Смотрит сейчас</p>
                              <p className="text-sm font-medium text-zinc-200 truncate w-full">{uRoom.videoTitle || 'В лобби без видео'}</p>
                              <p className="text-xs text-zinc-400 mt-1 truncate">Комната: {uRoom.name || uRoom.id}</p>
                           </div>
                           <button onClick={() => { setActiveModal(null); onJoin(username, uRoom.id, avatar, uRoom.isPublic, uRoom.name); }} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-lg shadow-blue-500/25">
                              Зайти к нему
                           </button>
                        </div>
                     );
                  })()}

                  {(viewingUser.runHistory && viewingUser.runHistory.length > 0) && (
                     <div className="bg-bg-main p-4 rounded-xl border border-border-card">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1 mb-2"><Clock className="w-3 h-3" /> Недавно смотрел</p>
                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                           {viewingUser.runHistory.map((item: any, i: number) => {
                              const progress = item.duration > 0 ? (item.time / item.duration) * 100 : 0;
                              const formatDuration = (seconds: number) => {
                                 if (!seconds || isNaN(seconds)) return '0:00';
                                 const m = Math.floor(seconds / 60);
                                 const s = Math.floor(seconds % 60);
                                 return `${m}:${s.toString().padStart(2, '0')}`;
                              };
                              return (
                                 <div key={i} title={item.url ? `Ссылка: ${item.url}` : undefined} className="flex flex-col gap-1 text-sm bg-bg-hover hover:bg-bg-card p-3 rounded-lg border border-border-card transition-colors cursor-default">
                                    <div className="flex gap-2 items-center">
                                       <MonitorPlay className="w-4 h-4 text-blue-400 shrink-0" />
                                       <span className="text-zinc-200 truncate font-medium flex-1" title={item.title}>{item.title}</span>
                                       <span className="text-[10px] text-zinc-500 whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                                    </div>
                                    {(item.time > 0 || item.duration > 0) && (
                                       <div className="flex flex-col gap-1 mt-1">
                                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                             <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                                          </div>
                                          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                                             <span>Остановился на: {formatDuration(item.time)}</span>
                                             <span>{formatDuration(item.duration)}</span>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {viewingUser.country && (
                     <div className="bg-bg-main p-4 rounded-xl border border-border-card flex items-center gap-3">
                        <div>
                           <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest leading-none mb-1">Страна</p>
                           <p className="font-medium">{COUNTRIES.find(c => c.code === viewingUser.country)?.name || viewingUser.country.toUpperCase()}</p>
                        </div>
                     </div>
                  )}
                  {viewingUser.description && (
                     <div className="bg-bg-main p-4 rounded-xl border border-border-card">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Об авторе</p>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{viewingUser.description}</p>
                     </div>
                  )}
                  <div className="pt-2">
                     {viewingUser.uid === user?.uid ? (
                        <button onClick={() => setActiveModal('profile')} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2">
                           <Settings className="w-4 h-4" /> Редактировать профиль
                        </button>
                     ) : friends.includes(viewingUser.uid) ? (
                        <button onClick={() => { setActiveModal(null); handleRemoveFriend(viewingUser.uid); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold rounded-xl border border-red-500/20 transition-all">Удалить из друзей</button>
                     ) : sentRequests.includes(viewingUser.uid) ? (
                        <button disabled className="w-full py-3 bg-zinc-800 text-zinc-500 font-semibold rounded-xl border border-zinc-700 transition-all cursor-not-allowed">Заявка отправлена</button>
                     ) : (
                        <button onClick={() => { setActiveModal(null); handleSendRequest(viewingUser.uid, viewingUser.username, viewingUser.avatar); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">Добавить в друзья</button>
                     )}
                  </div>
                </div>
              )}

              {activeModal === 'create' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl mx-auto flex items-center justify-center mb-4"><Plus className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold">Новая комната</h2>
                    <p className="text-xs text-zinc-500 mt-1">Как назовём вашу комнату?</p>
                  </div>
                  <div className="space-y-3">
                    <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Название лобби (необязательно)" maxLength={40} className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none placeholder-zinc-600" />
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={() => { setActiveModal(null); handleCreateRoom(true); }} className="flex flex-col items-center justify-center p-4 bg-bg-main hover:bg-bg-hover border border-border-card hover:border-blue-500/50 rounded-2xl transition-all gap-2 group">
                        <Globe className="w-6 h-6 text-zinc-400 group-hover:text-blue-400" />
                        <span className="text-sm font-medium">Публичная</span>
                      </button>
                      <button onClick={() => { setActiveModal(null); handleCreateRoom(false); }} className="flex flex-col items-center justify-center p-4 bg-bg-main hover:bg-bg-hover border border-border-card hover:border-purple-500/50 rounded-2xl transition-all gap-2 group">
                        <Lock className="w-6 h-6 text-zinc-400 group-hover:text-purple-400" />
                        <span className="text-sm font-medium">Приватная</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'join' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center mb-4"><Key className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold">Войти по коду</h2>
                    <p className="text-xs text-zinc-500 mt-1">Введите ID комнаты.</p>
                  </div>
                  <form onSubmit={handleJoinById} className="space-y-4">
                    <input type="text" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)} placeholder="ID, например mxd8j2" className="w-full bg-bg-main text-center font-mono text-lg tracking-widest border border-border-card rounded-xl px-4 py-3 placeholder-zinc-600 focus:border-emerald-500/50 outline-none" required />
                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all">Присоединиться</button>
                  </form>
                </div>
              )}

              {activeModal === 'friends' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-2xl mx-auto flex items-center justify-center mb-4"><UserPlus className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold">Друзья</h2>
                  </div>

                  {friendRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Заявки в друзья</h3>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {friendRequests.map(req => (
                          <div key={req.id} className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-card">
                            <button onClick={() => openUserProfile(req.from)} className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none text-left flex-1 min-w-0">
                               <div className="w-8 h-8 rounded-full bg-bg-hover overflow-hidden shrink-0">
                                  {req.fromAvatar ? <img src={req.fromAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{req.fromUsername.substring(0,2).toUpperCase()}</div>}
                               </div>
                               <span className="text-sm font-medium truncate">{req.fromUsername}</span>
                            </button>
                            <div className="flex gap-2 shrink-0 ml-2">
                               <button onClick={() => handleAcceptRequest(req)} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg outline-none"><Check className="w-4 h-4" /></button>
                               <button onClick={() => handleDeclineRequest(req.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg outline-none"><XCircle className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {friendsList.length > 0 && (
                    <div className="space-y-3 border-t border-border-card pt-4">
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Мои друзья</h3>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {friendsList.map(friend => {
                          const isOnline = onlineUsersMap.includes(friend.uid);
                          return (
                          <div key={friend.uid} className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-card">
                            <button onClick={() => openUserProfile(friend.uid)} className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none text-left flex-1 min-w-0">
                               <div className="relative shrink-0">
                                 <div className={`w-8 h-8 rounded-full bg-bg-hover overflow-hidden border ${friend.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-border-card'}`}>
                                    {friend.avatar ? <img src={friend.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{friend.username.substring(0,2).toUpperCase()}</div>}
                                 </div>
                                 <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#0A0C10] ${isOnline ? 'bg-emerald-500' : 'bg-zinc-500'}`} title={isOnline ? 'Онлайн' : 'Оффлайн'}></div>
                                 {friend.isCreator && (
                                   <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-10 pointer-events-none">
                                     <BadgeCheck className="w-2.5 h-2.5 text-white" />
                                   </div>
                                 )}
                               </div>
                               <span className="text-sm font-medium truncate flex flex-1 items-center gap-1">{friend.username}</span>
                            </button>
                          </div>
                        )})}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-border-card">
                    <form onSubmit={handleSearchUser} className="relative">
                      <input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} placeholder="Найти по нику..." className="w-full bg-bg-main border border-border-card rounded-xl pl-10 pr-4 py-2 text-sm focus:border-pink-500/50 outline-none" />
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </form>
                    {searchError && <p className="text-xs text-red-400 text-center">{searchError}</p>}
                    {searchResult && (
                      <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-pink-500/30">
                         <button onClick={() => openUserProfile(searchResult.uid || searchResult.id)} className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none text-left flex-1 min-w-0">
                             <div className="relative shrink-0">
                               <div className={`w-8 h-8 rounded-full bg-bg-hover overflow-hidden border ${searchResult.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-border-card'}`}>
                                  {searchResult.avatar ? <img src={searchResult.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{searchResult.username.substring(0,2).toUpperCase()}</div>}
                               </div>
                               {searchResult.isCreator && (
                                 <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-10 pointer-events-none">
                                   <BadgeCheck className="w-2.5 h-2.5 text-white" />
                                 </div>
                               )}
                             </div>
                             <span className="text-sm font-medium truncate">{searchResult.username}</span>
                         </button>
                         <button onClick={() => handleSendRequest(searchResult.id || searchResult.uid, searchResult.username, searchResult.avatar)} disabled={friends.includes(searchResult.id || searchResult.uid) || sentRequests.includes(searchResult.id || searchResult.uid)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 ml-2">
                            {friends.includes(searchResult.id || searchResult.uid) ? 'Уже в друзьях' : (sentRequests.includes(searchResult.id || searchResult.uid) ? 'Заявка кинута' : 'Добавить')}
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeModal === 'watchAlone' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl mx-auto flex items-center justify-center mb-4"><MonitorPlay className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold">Смотреть одному</h2>
                    <p className="text-xs text-zinc-500 mt-1">Что вы хотите посмотреть?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                     <button onClick={() => { setActiveModal(null); onWatchAnime?.(); }} className="p-4 bg-bg-main hover:bg-bg-hover border border-border-card hover:border-purple-500/50 rounded-2xl transition-all font-medium flex items-center justify-between group">
                        <span>Аниме</span>
                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                     </button>
                     <button className="p-4 bg-bg-main hover:bg-bg-hover border border-border-card hover:border-blue-500/50 rounded-2xl transition-all font-medium flex items-center justify-between group opacity-50 cursor-not-allowed" disabled>
                        <span>Фильмы (скоро)</span>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                     </button>
                     <button className="p-4 bg-bg-main hover:bg-bg-hover border border-border-card hover:border-emerald-500/50 rounded-2xl transition-all font-medium flex items-center justify-between group opacity-50 cursor-not-allowed" disabled>
                        <span>Сериалы (скоро)</span>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
