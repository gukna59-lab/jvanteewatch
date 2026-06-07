import React, { useState, useEffect } from 'react';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { AnimeHome } from './components/AnimeHome';
import { SocialSidebar } from './components/SocialSidebar';
import { motion, AnimatePresence } from 'motion/react';
import { Video, X, MessageSquareText } from 'lucide-react';
import { socket } from './lib/socket';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [invites, setInvites] = useState<any[]>([]);
  const [view, setView] = useState<'lobby' | 'room' | 'anime'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'anime' ? 'anime' : 'lobby';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarUser, setActiveSidebarUser] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
       setHasUnreadMessages(false);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
     if (!currentUser) return;
     const handleNewMsg = () => {
        if (!isSidebarOpen) setHasUnreadMessages(true);
     };
     socket.on('new_dm', handleNewMsg);
     socket.on('new_group_msg', handleNewMsg);
     return () => {
        socket.off('new_dm', handleNewMsg);
        socket.off('new_group_msg', handleNewMsg);
     };
  }, [currentUser, isSidebarOpen]);

  useEffect(() => {
    const handleOpenDm = (e: any) => {
      setActiveSidebarUser(e.detail);
      setIsSidebarOpen(true);
    };
    window.addEventListener('open_dm', handleOpenDm);
    return () => window.removeEventListener('open_dm', handleOpenDm);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setCurrentUser(null);
      setUid(null);
      setUsername(null);
      setAvatar(null);
      setLoading(false);
      socket.disconnect();
      return;
    }
    try {
      const res = await fetch(`/api/users/${token}`);
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setUid(user.uid);
        setUsername(user.username);
        setAvatar(user.avatar || null);
        socket.connect();
      } else {
        localStorage.removeItem('auth_token');
        setCurrentUser(null);
        socket.disconnect();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
    // Listen for custom auth change event
    window.addEventListener('auth_changed', checkAuth);
    return () => window.removeEventListener('auth_changed', checkAuth);
  }, []);

  // Ping interval to stay online across all views
  useEffect(() => {
    if (!uid) return;
    const ping = async () => {
      try {
        await fetch('/api/users/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid })
        });
      } catch (err) {}
    };
    ping();
    const interval = setInterval(ping, 10000);
    return () => clearInterval(interval);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    
    const fetchInvites = async () => {
       try {
          const res = await fetch(`/api/room_invites/${uid}`);
          if (res.ok) {
             setInvites(await res.json());
          }
       } catch(e) {}
    };

    fetchInvites();
    const interval = setInterval(fetchInvites, 5000);
    return () => clearInterval(interval);
  }, [uid]);

  const handleAcceptInvite = async (invite: any) => {
     handleJoin(username || 'User', invite.roomId, avatar || undefined, invite.isPublic, invite.roomName);
     setInvites(prev => prev.filter(i => i.id !== invite.id));
     await fetch(`/api/room_invites/${invite.id}`, { method: 'DELETE' });
  };

  const handleDeclineInvite = async (inviteId: string) => {
     setInvites(prev => prev.filter(i => i.id !== inviteId));
     await fetch(`/api/room_invites/${inviteId}`, { method: 'DELETE' });
  };

  const [roomName, setRoomName] = useState<string | null>(null);

  const handleJoin = (joinedUsername: string, joinedRoomId: string, joinedAvatar?: string, isPublic = true, joinedRoomName?: string) => {
    setUsername(joinedUsername);
    if (joinedAvatar) setAvatar(joinedAvatar);
    setRoomId(joinedRoomId);
    setIsPublicRoom(isPublic);
    setRoomName(joinedRoomName || null);
    setView('room');
  };

  const handleLeave = () => {
    setRoomId(null);
    setRoomName(null);
    setView('lobby');
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('isPublic');
    window.history.replaceState({}, '', url.toString());
  };

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-black"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div></div>;
  }

  return (
    <>
      <AnimatePresence>
         {view === 'lobby' && invites.map(invite => (
            <motion.div
               key={invite.id}
               initial={{ opacity: 0, scale: 0.9, y: -20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: -20 }}
               className="fixed top-4 right-4 z-[9999] bg-bg-card border border-blue-500/30 shadow-2xl shadow-blue-500/10 p-4 rounded-2xl w-80"
            >
               <button onClick={() => handleDeclineInvite(invite.id)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
                     <Video className="w-5 h-5" />
                  </div>
                  <div>
                     <h4 className="font-bold text-sm">Приглашение!</h4>
                     <p className="text-xs text-zinc-400 mt-1"><span className="text-white font-medium">{invite.fromUsername}</span> зовет вас посмотреть видео в комнате <span className="font-medium text-blue-400">{invite.roomName}</span>.</p>
                     
                     <div className="flex gap-2 mt-3">
                        <button onClick={() => handleAcceptInvite(invite)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">Войти</button>
                     </div>
                  </div>
               </div>
            </motion.div>
         ))}
      </AnimatePresence>
      {view === 'room' && roomId && username ? (
        <Room roomId={roomId} roomName={roomName || undefined} username={username} uid={uid || undefined} avatar={avatar || undefined} onLeave={handleLeave} isPublic={isPublicRoom} onOpenSidebar={() => setIsSidebarOpen(true)} />
      ) : view === 'anime' ? (
        <AnimeHome onBack={() => setView('lobby')} user={currentUser} username={username} avatar={avatar} />
      ) : (
        <Lobby onJoin={handleJoin} onWatchAnime={() => setView('anime')} user={currentUser} defaultUsername={username} defaultAvatar={avatar} onOpenSidebar={() => setIsSidebarOpen(true)} hasUnreadMessages={hasUnreadMessages} />
      )}

      {currentUser && (
        <SocialSidebar 
           user={currentUser} 
           socket={socket} 
           isOpen={isSidebarOpen} 
           onClose={() => { setIsSidebarOpen(false); setActiveSidebarUser(null); }}
           defaultActiveUser={activeSidebarUser}
        />
      )}
    </>
  );
}
