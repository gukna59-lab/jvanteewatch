import React, { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { RoomState, User, Message } from '../types';
import { Player } from './Player';
import { Chat } from './Chat';
import { Logo } from './Lobby';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { Mic, MicOff, Smile, Users, X, UserPlus, Globe, Lock, BadgeCheck, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomProps {
  roomId: string;
  roomName?: string;
  username: string;
  uid?: string;
  avatar?: string;
  onLeave: () => void;
  isPublic?: boolean;
}

export function Room({ roomId, roomName, username, uid, avatar, onLeave, isPublic = true }: RoomProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [chat, setChat] = useState<Message[]>([]);
  const [usersProgress, setUsersProgress] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string, username: string, xPos: number }[]>([]);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [onlineUsersMap, setOnlineUsersMap] = useState<string[]>([]);
  const [sentInvites, setSentInvites] = useState<string[]>([]);
  
  const [viewingUser, setViewingUser] = useState<any>(null);

  const { isMicOn, toggleMic, speakingUsers } = useVoiceChat(socket, roomId, socket.id);

  // Fetch online users map (approx. every 5 secs)
  useEffect(() => {
     if (!showInviteModal) return;
     const fetchOnline = async () => {
        try {
           const res = await fetch('/api/users/online');
           const data = await res.json();
           setOnlineUsersMap(data);
        } catch (e) {
           console.error('Failed to fetch online apps');
        }
     };
     fetchOnline();
     const interval = setInterval(fetchOnline, 5000);
     return () => clearInterval(interval);
  }, [showInviteModal]);

  // Fetch Friends
  useEffect(() => {
     if (!uid || !showInviteModal) return;
     const loadFriends = async () => {
        try {
           const userRes = await fetch(`/api/users/${uid}`);
           if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.friends) {
                 const profiles = await Promise.all(
                   userData.friends.map(async (id: string) => {
                     try {
                        const res = await fetch(`/api/users/${id}`);
                        if (res.ok) return await res.json();
                     } catch(e) {}
                     return null;
                   })
                 );
                 setFriendsList(profiles.filter((p: any) => p !== null));
              }
           }
        } catch(e) { console.error("error fetching friends", e); }
     };
     loadFriends();
  }, [uid, showInviteModal]);

  const handleInviteFriend = async (friendId: string) => {
     if (!uid) return;
     try {
        await fetch('/api/room_invites', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              to: friendId,
              from: uid,
              fromUsername: username,
              roomId: roomId,
              roomName: roomState?.name || roomName || `Комната ${roomId}`,
              isPublic: isPublic
           })
        });
        setSentInvites(prev => [...prev, friendId]);
     } catch (e) {
        console.error("error inviting friend", e);
     }
  };

  const handleAvatarClick = async (clickedUser: any) => {
    if (!clickedUser.uid) {
       // Just a guest
       setViewingUser(clickedUser);
       return;
    }
    try {
       const res = await fetch(`/api/users/${clickedUser.uid}`);
       if (res.ok) {
          const fullUser = await res.json();
          setViewingUser(fullUser);
       } else {
          setViewingUser(clickedUser);
       }
    } catch(e) {
       setViewingUser(clickedUser);
    }
  };


  useEffect(() => {
    // Update URL helper
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    if (!isPublic) {
      url.searchParams.set('isPublic', 'false');
    }
    window.history.replaceState({}, '', url.toString());

    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', { roomId, roomName, username, uid, avatar, isPublic });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room_state', (data: { roomState: RoomState; users: User[]; chat: Message[], me: User }) => {
      setRoomState(data.roomState);
      setUsers(data.users);
      setChat(data.chat);
      setMe(data.me);
    });

    socket.on('users_updated', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    socket.on('sync_playback', ({ isPlaying, timestamp, updatedAt }) => {
      setRoomState(prev => prev ? { ...prev, isPlaying, timestamp, lastUpdateAt: updatedAt } : null);
    });

    socket.on('video_url_updated', (data: { url: string, title?: string } | string | null) => {
      if (!data) {
        setRoomState(prev => prev ? { ...prev, videoUrl: null, videoTitle: null, timestamp: 0, isPlaying: false, lastUpdateAt: Date.now() } : null);
        return;
      }
      const url = typeof data === 'string' ? data : data.url;
      const title = typeof data === 'string' ? undefined : data.title;
      setRoomState(prev => prev ? { ...prev, videoUrl: url || null, videoTitle: title || null, timestamp: 0, isPlaying: false, lastUpdateAt: Date.now() } : null);
    });

    socket.on('admin_changed', (newAdminId: string) => {
      setRoomState(prev => prev ? { ...prev, adminId: newAdminId } : null);
    });

    socket.on('creator_changed', (newCreatorId: string) => {
      setRoomState(prev => prev ? { ...prev, creatorId: newCreatorId } : null);
    });

    socket.on('chat_message', (message: Message) => {
      setChat(prev => [...prev, message]);
    });

    socket.on('users_progress', (progressMap: Record<string, number>) => {
      setUsersProgress(progressMap);
    });

    socket.on('kicked', () => {
      alert("Вас кикнули из комнаты.");
      onLeave();
    });

    socket.on('receive_reaction', (data: { id: string, emoji: string, userId: string, username: string }) => {
      const xPos = Math.random() * 80 + 10; // Random x position between 10% and 90%
      setReactions(prev => [...prev, { ...data, xPos }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== data.id));
      }, 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_state');
      socket.off('users_updated');
      socket.off('sync_playback');
      socket.off('video_url_updated');
      socket.off('admin_changed');
      socket.off('creator_changed');
      socket.off('chat_message');
      socket.off('users_progress');
      socket.off('kicked');
      socket.off('receive_reaction');
      socket.disconnect();
    };
  }, [roomId, roomName, username, uid, avatar, isPublic]);

  const handleUpdateVideoUrl = (url: string) => socket.emit('update_video_url', { url });
  const handlePlayStateChange = (isPlaying: boolean, timestamp: number) => socket.emit('play_state_change', { isPlaying, timestamp });
  const handleSeek = (timestamp: number) => socket.emit('seek', timestamp);
  const handleForceSync = () => socket.emit('force_sync');
  const handleTransferAdmin = (userId: string) => socket.emit('transfer_admin', userId);
  const lastHistorySync = React.useRef<number>(0);
  
  const handleReportProgress = (timestamp: number, duration?: number) => {
     socket.emit('report_progress', timestamp);
     if (uid && roomState?.videoUrl) {
         const now = Date.now();
         if (now - lastHistorySync.current > 10000) {
             lastHistorySync.current = now;
             fetch(`/api/users/${uid}/history`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     title: roomState.videoTitle || roomState.videoUrl,
                     url: roomState.videoUrl,
                     time: timestamp,
                     duration: duration || 0
                 })
             }).catch(e => console.error("Error saving history:", e));
         }
     }
  };
  const handleSendMessage = (text: string, type: string = 'text', mediaUrl?: string) => socket.emit('send_chat', { text, type, mediaUrl });
  const handleKickUser = (userId: string) => socket.emit('kick_user', userId);
  const handleSendReaction = (emoji: string) => socket.emit('send_reaction', emoji);
  
  const handleAddToQueue = (url: string, title?: string) => socket.emit('add_to_queue', { url, title });
  const handleRemoveFromQueue = (index: number) => socket.emit('remove_from_queue', index);
  const handlePlayNextQueue = () => socket.emit('play_next_queue');

  if (!roomState || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-zinc-400 font-medium">Подключение к комнате...</p>
        </div>
      </div>
    );
  }

  // Layout handling: 
  // Desktop: flex-row, Player left, Chat right
  // Mobile: flex-col, Player top, Chat bottom
  return (
    <div className="flex flex-col h-[100dvh] bg-bg-main text-[#E1E7EF] font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-bg-card border-b border-border-card shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border-card bg-bg-card shrink-0">
              <Logo />
            </div>
            <div className="hidden sm:block text-xl lg:text-2xl font-black tracking-tighter text-[#3B82F6]">JVANTE</div>
          </div>
          <div className="hidden lg:block h-4 w-[1px] bg-[#374151] shrink-0"></div>
          <div className="flex flex-col overflow-hidden flex-1 min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">{roomState.name || `Комната ${roomId}`}</h1>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider flex items-center gap-2 truncate">
              <span className="text-[#3B82F6] cursor-pointer hover:underline shrink-0" onClick={() => navigator.clipboard.writeText(window.location.href)} title="Скопировать ссылку.">ID: {roomId}</span>
              {roomState.videoTitle && <span className="truncate">• {roomState.videoTitle}</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button 
             onClick={toggleMic} 
             title={isMicOn ? "Выключить микрофон" : "Голосовой чат"}
             className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border transition-all shrink-0 ${isMicOn ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/20' : 'bg-bg-hover text-zinc-400 border-zinc-700 hover:text-white'}`}
          >
             {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          
          <div className="hidden lg:flex -space-x-2 mr-2 cursor-pointer relative group" title="Показать участников">
             {users.slice(0, 3).map((u, i) => (
               <div key={u.id} className="relative z-10" style={{ zIndex: 10 - i }}>
                 <div title={u.username} className={`w-8 h-8 rounded-full border-2 ${u.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : speakingUsers.has(u.id) ? 'border-emerald-500' : 'border-[#11141A]'} flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden shrink-0`} style={{ backgroundColor: u.avatar ? 'transparent' : u.color }}>
                    {u.avatar ? <img src={u.avatar} alt="avatar" className="w-full h-full object-cover" /> : u.username.substring(0, 2).toUpperCase()}
                 </div>
                 {u.isCreator && (
                   <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-20 pointer-events-none">
                     <BadgeCheck className="w-2.5 h-2.5 text-white" />
                   </div>
                 )}
               </div>
             ))}
             {users.length > 3 && (
               <div className="w-8 h-8 rounded-full border-2 border-[#11141A] bg-[#6366F1] flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 relative z-0">
                 +{users.length - 3}
               </div>
             )}
            
            {/* Tooltip users list */}
            <div className="absolute top-10 right-0 bg-bg-card border border-border-card p-2 rounded-xl shadow-xl w-48 hidden group-hover:flex flex-col gap-2 z-50">
               <span className="text-xs text-zinc-500 px-1">Участники лобби:</span>
               {users.map(u => (
                 <div key={u.id} className="flex items-center gap-2 px-1">
                   <div className="relative shrink-0">
                     <div className={`w-6 h-6 rounded-full overflow-hidden border-2 ${u.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : speakingUsers.has(u.id) ? 'border-emerald-500' : 'border-border-card'}`} style={{ backgroundColor: u.avatar ? 'transparent' : u.color }}>
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">{u.username.substring(0,2).toUpperCase()}</span>}
                     </div>
                     {u.isCreator && (
                       <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-10 pointer-events-none">
                         <BadgeCheck className="w-2 h-2 text-white" />
                       </div>
                     )}
                   </div>
                   <span className={`text-sm font-medium truncate flex items-center gap-1 ${speakingUsers.has(u.id) ? 'text-emerald-400' : 'text-text-main'}`}>
                     {u.username}
                   </span>
                 </div>
               ))}
            </div>
          </div>

          <button onClick={onLeave} className="px-2 sm:px-3 py-1.5 bg-bg-hover hover:bg-[#334155] text-xs font-semibold rounded border border-[#374151] flex items-center justify-center gap-2 transition-colors shrink-0" title="Выйти">
            <span className="hidden sm:inline">Выйти</span>
            <span className="sm:hidden"><LogOut className="w-4 h-4" /></span>
          </button>
          
          <button 
             className="px-2 sm:px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold rounded text-white flex items-center justify-center transition-colors shrink-0" 
             onClick={() => {
                if (uid) {
                   setShowInviteModal(true);
                } else {
                   navigator.clipboard.writeText(window.location.href);
                   alert("Ссылка скопирована!");
                }
             }}
             title="Пригласить"
          >
             <span className="hidden sm:inline">Пригласить</span>
             <span className="sm:hidden"><UserPlus className="w-4 h-4" /></span>
          </button>
        </div>
      </header>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-border-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-border-card flex items-center justify-between bg-bg-main">
                <h2 className="font-bold text-lg text-white">Пригласить друзей</h2>
                <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-hover hover:bg-[#334155] text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                 <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Ссылка скопирована!"); }} className="w-full mb-4 px-4 py-3 bg-bg-hover border border-[#334155] hover:border-blue-500/50 hover:bg-bg-hover/80 rounded-xl flex items-center gap-3 transition-colors text-left group">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Копировать ссылку</div>
                      <div className="text-[10px] text-zinc-500">Отправьте ссылку в любой мессенджер</div>
                    </div>
                 </button>

                 <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Мои друзья</h3>
                 {friendsList.length === 0 ? (
                    <div className="text-center py-6">
                       <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                       <div className="text-sm text-zinc-400">У вас пока нет добавленных друзей.</div>
                       <div className="text-[10px] text-zinc-500 mt-1">Добавьте их в лобби, чтобы приглашать сюда!</div>
                    </div>
                 ) : (
                    <div className="space-y-2">
                       {friendsList.map(friend => {
                         const isOnline = onlineUsersMap.includes(friend.id);
                         const isSent = sentInvites.includes(friend.id);
                         return (
                           <div key={friend.id} className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-card">
                             <div className="flex items-center gap-3 relative">
                               <div className="w-10 h-10 rounded-full bg-bg-hover overflow-hidden border border-border-card shrink-0">
                                 {friend.avatar ? <img src={friend.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{friend.username.substring(0,2).toUpperCase()}</div>}
                               </div>
                               <div className={`absolute bottom-0 left-7 w-3 h-3 rounded-full border-2 border-[#0A0C10] ${isOnline ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                               <div className="flex flex-col">
                                 <span className="text-sm font-medium text-white max-w-[120px] truncate">{friend.username}</span>
                                 <span className="text-[10px] text-zinc-500">{isOnline ? 'В сети' : 'Не в сети'}</span>
                               </div>
                             </div>
                             
                             <button
                               onClick={() => handleInviteFriend(friend.id)}
                               disabled={isSent || !isOnline}
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  !isOnline 
                                    ? 'bg-bg-hover text-zinc-600 cursor-not-allowed' 
                                  : isSent
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                               }`}
                             >
                               {isSent ? 'Отправлено' : 'Позвать'}
                             </button>
                           </div>
                         );
                       })}
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        <Player 
          roomState={roomState}
          users={users}
          me={me}
          onUpdateVideoUrl={handleUpdateVideoUrl}
          onPlayStateChange={handlePlayStateChange}
          onSeek={handleSeek}
          onForceSync={handleForceSync}
          onReportProgress={handleReportProgress}
          onTransferAdmin={handleTransferAdmin}
          usersProgress={usersProgress}
          onKickUser={handleKickUser}
          onAddToQueue={handleAddToQueue}
          onRemoveFromQueue={handleRemoveFromQueue}
          onPlayNextQueue={handlePlayNextQueue}
          reactions={reactions}
          onSendReaction={handleSendReaction}
        />
        <Chat messages={chat} onSendMessage={handleSendMessage} onAvatarClick={handleAvatarClick} />

        <AnimatePresence>
          {viewingUser && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-bg-card border border-border-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
              >
                <button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 z-20 text-zinc-400 hover:text-white bg-black/20 p-2 rounded-full backdrop-blur-md">
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-6 relative pb-6 px-6">
                  {viewingUser.isCreator && (
                     <div 
                        className="absolute top-0 left-0 right-0 h-48 rounded-t-3xl bg-cover bg-center bg-no-repeat mb-0 border-b border-white/10 z-0"
                        style={{ backgroundImage: "url('https://images.steamusercontent.com/ugc/2019340792128509985/0C10FDDAD3F295FD42EEBD97E88C56EDD13CD2DA/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false')" }}
                     >
                        <div className="w-full h-full bg-black/40 rounded-t-3xl backdrop-blur-[2px]"></div>
                     </div>
                  )}
                  <div className={`flex flex-col items-center ${viewingUser.isCreator ? 'mt-16 relative z-10' : 'mt-6'}`}>
                    <div className="relative mb-4 shadow-xl">
                       <div className={`w-24 h-24 rounded-full bg-bg-hover border-4 ${viewingUser.isCreator ? 'border-amber-500' : 'border-border-card'} overflow-hidden relative backdrop-blur-xl`}>
                          {viewingUser.avatar ? <img src={viewingUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-500">{viewingUser.username.substring(0,2).toUpperCase()}</div>}
                       </div>
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
                  </div>
                  
                  {(viewingUser.runHistory && viewingUser.runHistory.length > 0) && (
                     <div className="bg-bg-main p-4 rounded-xl border border-border-card relative z-10 mt-4">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1">Недавно смотрел</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
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
                                       <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap bg-zinc-800/50 px-1.5 py-0.5 rounded">{formatDuration(item.time)} / {formatDuration(item.duration)}</span>
                                       <span className="text-zinc-200 truncate font-medium flex-1 text-xs" title={item.title}>{item.title}</span>
                                    </div>
                                    {(item.time > 0 || item.duration > 0) && (
                                       <div className="w-full bg-zinc-800 rounded-full h-1 mt-1 overflow-hidden">
                                          <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
                                       </div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
                  {(viewingUser.description || viewingUser.country) && (
                    <div className="space-y-3 mt-4 relative z-10">
                       {viewingUser.country && (
                          <div className="bg-bg-main p-4 rounded-xl border border-border-card">
                             <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Страна</h4>
                             <p className="text-sm text-zinc-300 capitalize">{viewingUser.country}</p>
                          </div>
                       )}
                       {viewingUser.description && (
                          <div className="bg-bg-main p-4 rounded-xl border border-border-card">
                             <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">О себе</h4>
                             <p className="text-sm text-zinc-300 break-words whitespace-pre-wrap">{viewingUser.description}</p>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
