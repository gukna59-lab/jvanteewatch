import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Users, Headphones, X, Send, Plus, Search, BadgeCheck } from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';

export function SocialSidebar({ user, socket, isOpen, onClose, defaultActiveUser }: { user: any, socket: any, isOpen: boolean, onClose: () => void, defaultActiveUser?: any }) {
   const [tab, setTab] = useState<'dms'|'groups'|'voice'>('dms');
   const [dms, setDms] = useState<any[]>([]); // Friends basically
   const [activeDm, setActiveDm] = useState<any|null>(null);
   const [dmSearch, setDmSearch] = useState('');
   const [searchError, setSearchError] = useState('');

   useEffect(() => {
     if (defaultActiveUser) {
        setTab('dms');
        setActiveDm(defaultActiveUser);
     }
   }, [defaultActiveUser]);

   const handleSearchUser = async () => {
      if(!dmSearch.trim()) return;
      setSearchError('');
      try {
         const res = await fetch(`/api/users/search/${encodeURIComponent(dmSearch)}`);
         if(res.ok) {
             const userObj = await res.json();
             setActiveDm(userObj);
             setDmSearch('');
         } else {
             setSearchError('Пользователь не найден');
         }
      } catch(e) {
          setSearchError('Ошибка поиска');
      }
   };
   
   const [groups, setGroups] = useState<any[]>([]);
   const [activeGroup, setActiveGroup] = useState<any|null>(null);
   const [newGroupName, setNewGroupName] = useState('');
   
    const [voiceCodeInput, setVoiceCodeInput] = useState('');

    const createVoiceChannel = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        joinVoiceChannel(newCode);
    };

    const joinVoiceChannelByInput = () => {
        if (voiceCodeInput.trim()) {
            joinVoiceChannel(voiceCodeInput.trim().toUpperCase());
            setVoiceCodeInput('');
        }
    };
   const [activeVoiceChannel, setActiveVoiceChannel] = useState<string|null>(null);
   const [activeVoiceUsers, setActiveVoiceUsers] = useState<any[]>([]);
   const { isMicOn, toggleMic, speakingUsers, setVolume } = useVoiceChat(socket, activeVoiceChannel || '', user?.uid || '');

   useEffect(() => {
      const handleVoiceState = (state: any[]) => {
         setActiveVoiceUsers(state);
      };
      socket.on('voice_channel_state', handleVoiceState);
      return () => {
         socket.off('voice_channel_state', handleVoiceState);
      };
   }, [socket]);

   useEffect(() => {
      if (!user || !isOpen) return;

      const loadFriends = async () => {
         // load friend data for DMs
         try {
            if (user.friends && user.friends.length > 0) {
               const promises = user.friends.map(id => fetch(`/api/users/${id}`).then(r => r.json()).catch(() => null));
               const friends = await Promise.all(promises);
               setDms(friends.filter(f => f));
            }
         } catch(e) {}
      };

      const loadGroups = async () => {
         try {
            const res = await fetch('/api/groups');
            if (res.ok) setGroups(await res.json());
         } catch(e) {}
      };

      loadFriends();
      loadGroups();
   }, [user, isOpen]);

   // Listen to incoming messages globally
   useEffect(() => {
      if (!socket || !user) return;
      socket.on('new_dm', (msg: any) => {
          // If we are actively looking at this dm, add it
          // the chat panel will handle it if it's rendered
      });
      socket.on('new_group_msg', (msg: any) => {
      });
      socket.on('group_created', (group: any) => {
         setGroups(prev => [...prev, group]);
      });
      return () => {
         socket.off('new_dm');
         socket.off('new_group_msg');
         socket.off('group_created');
      };
   }, [socket, user]);

   const handleCreateGroup = async () => {
      if (!newGroupName.trim()) return;
      try {
         const res = await fetch('/api/groups', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: newGroupName, description: '', creatorUid: user.uid })
         });
         const g = await res.json();
         setNewGroupName('');
         setActiveGroup(g);
      } catch(e) {}
   };

   const joinVoiceChannel = (channelId: string) => {
       if (activeVoiceChannel === channelId) return;
       if (activeVoiceChannel) {
           socket.emit('voice_channel_leave');
       }
       setActiveVoiceChannel(channelId);
       socket.emit('voice_channel_join', channelId, user);
   };

   const leaveVoiceChannel = () => {
       if (isMicOn) toggleMic();
       socket.emit('voice_channel_leave');
       setActiveVoiceChannel(null);
   };

   return (
      <AnimatePresence>
         {isOpen && (
            <>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"></motion.div>
               <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-bg-card border-l border-border-card z-[100] shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-border-card flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight">Социальное</h2>
                     <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-bg-hover"><X className="w-5 h-5"/></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex px-4 pt-4 gap-2 border-b border-border-card">
                     {[ {id: 'dms', icon: <MessageCircle className="w-4 h-4"/>, label: 'ЛС'},
                        {id: 'groups', icon: <Users className="w-4 h-4"/>, label: 'Группы'},
                        {id: 'voice', icon: <Headphones className="w-4 h-4"/>, label: 'Голос'}
                     ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-2 border-b-2 font-medium transition-colors ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                           {t.icon} <span className="text-sm">{t.label}</span>
                        </button>
                     ))}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                     {tab === 'dms' && (
                        <div className="p-4 flex flex-col h-full">
                           {!activeDm ? (
                              <div className="space-y-4">
                                 <div>
                                    <div className="flex gap-2">
                                       <input value={dmSearch} onChange={e=>setDmSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} placeholder="Найти по никнейму (чтобы написать)..." className="flex-1 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                                       <button onClick={handleSearchUser} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg shrink-0"><Search className="w-5 h-5"/></button>
                                    </div>
                                    {searchError && <p className="text-red-400 text-xs mt-1">{searchError}</p>}
                                 </div>

                                 <div className="space-y-2">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase">Или из друзей ({dms.length})</p>
                                    {dms.map((f:any, i) => (
                                       <button key={i} onClick={() => setActiveDm(f)} className="w-full flex items-center gap-3 p-3 bg-bg-hover rounded-xl hover:bg-blue-500/10 transition-colors">
                                          <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-main border border-border-card shrink-0">
                                             {f.avatar ? <img src={f.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">{f.username.substring(0,2).toUpperCase()}</div>}
                                          </div>
                                          <span className="font-semibold text-zinc-200">{f.username}</span>
                                       </button>
                                    ))}
                                    {dms.length === 0 && <p className="text-sm text-zinc-500 mt-4 text-center">У вас пока нет друзей.</p>}
                                 </div>
                              </div>
                           ) : (
                              <ChatPanel currentUserId={user.uid} targetType="dm" target={activeDm} onBack={() => setActiveDm(null)} socket={socket} />
                           )}
                        </div>
                     )}

                     {tab === 'groups' && (
                        <div className="p-4 flex flex-col h-full">
                           {!activeGroup ? (
                              <div className="space-y-4">
                                 <div className="flex gap-2">
                                    <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Название группы..." className="flex-1 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                                    <button onClick={handleCreateGroup} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"><Plus className="w-5 h-5"/></button>
                                 </div>
                                 <div className="flex gap-2">
                                    <input onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                          const id = e.currentTarget.value.trim();
                                          if (id) {
                                             fetch(`/api/groups/${id}/join`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({uid: user.uid}) })
                                             .then(res => res.json())
                                             .then(group => {
                                                if(group && group.id) { setActiveGroup(group); e.currentTarget.value = ''; }
                                             });
                                          }
                                       }
                                    }} placeholder="Войти по коду (введите и нажмите Enter)..." className="flex-1 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
                                 </div>
                                 <div className="space-y-2">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase">Групповые чаты</p>
                                    {groups.map((g:any, i) => (
                                       <button key={i} onClick={() => { setActiveGroup(g); }} className="w-full flex items-center gap-3 p-3 bg-bg-hover rounded-xl hover:bg-blue-500/10 transition-colors text-left">
                                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                             <Users className="w-5 h-5"/>
                                          </div>
                                          <div>
                                             <p className="font-semibold text-zinc-200">{g.name}</p>
                                             <p className="text-xs text-zinc-500">{g.members?.length || 1} участников</p>
                                          </div>
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           ) : (
                              <ChatPanel currentUserId={user.uid} targetType="group" target={activeGroup} onBack={() => setActiveGroup(null)} socket={socket} />
                           )}
                        </div>
                     )}

                     {tab === 'voice' && (
                        <div className="p-4 space-y-4">
                           <p className="text-xs font-semibold text-zinc-500 uppercase">Голосовая связь</p>
                           
                           {!activeVoiceChannel && (
                              <div className="space-y-4">
                                 <button onClick={createVoiceChannel} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                                    <Headphones className="w-5 h-5" /> Создать голосовой канал
                                 </button>
                                 <div className="flex items-center gap-2">
                                    <div className="h-px bg-border-card flex-1"></div>
                                    <span className="text-xs text-zinc-500 font-semibold uppercase">ИЛИ</span>
                                    <div className="h-px bg-border-card flex-1"></div>
                                 </div>
                                 <div className="flex gap-2">
                                    <input value={voiceCodeInput} onChange={e=>setVoiceCodeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinVoiceChannelByInput()} placeholder="Код приглашения..." className="flex-1 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none uppercase" />
                                    <button onClick={joinVoiceChannelByInput} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg font-bold transition-colors">Войти</button>
                                 </div>
                              </div>
                           )}

                           {activeVoiceChannel && (
                              <div className="p-4 rounded-xl border border-blue-500/50 bg-blue-500/10 flex flex-col items-center">
                                 <div className="flex justify-between items-center w-full mb-4">
                                    <div className="flex flex-col">
                                       <span className="text-xs text-zinc-400 font-medium">Код канала</span>
                                       <span className="text-lg font-bold text-blue-400 font-mono tracking-wider">{activeVoiceChannel}</span>
                                    </div>
                                    <button onClick={leaveVoiceChannel} className="text-xs px-3 py-1.5 bg-red-500/20 text-red-500 font-bold hover:bg-red-500/30 rounded-lg transition-colors">Выйти</button>
                                 </div>
                                 
                                 <p className="text-xs text-zinc-400 mb-6 text-center">Отправьте код друзьям в ЛС!<br/> (Напоминание: два устройства с одним VPN могут не подключиться друг к другу)</p>

                                 <button 
                                    onClick={toggleMic}
                                    className={`p-6 rounded-full transition-all border-4 shadow-xl ${isMicOn ? 'bg-blue-500 text-white border-blue-400/50 hover:bg-blue-400 scale-105' : 'bg-bg-hover text-zinc-400 border-zinc-700/50 hover:bg-bg-card'}`}
                                 >
                                    <div className="relative">
                                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                          <line x1="12" y1="19" x2="12" y2="22"></line>
                                       </svg>
                                       {!isMicOn && (
                                          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-10 h-10 absolute inset-0 text-red-500/90 shadow-sm">
                                             <line x1="2" y1="2" x2="22" y2="22"></line>
                                          </svg>
                                       )}
                                    </div>
                                 </button>
                                 <div className="text-sm font-semibold mt-4 text-zinc-200">
                                    {isMicOn ? 'Микрофон включен' : 'Микрофон выключен'}
                                 </div>
                                 <div className="w-full mt-6 space-y-2">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase">Участники ({activeVoiceUsers.length})</p>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                       {activeVoiceUsers.map((vu: any) => (
                                          <div key={vu.socketId} className={`flex items-center gap-3 p-2 rounded-xl bg-bg-main border ${speakingUsers.has(vu.uid || vu.socketId) || (vu.socketId === socket.id && speakingUsers.has(user?.uid || '')) ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-border-card'} transition-all`}>
                                             <div className="relative shrink-0">
                                                <div className={`w-8 h-8 rounded-full overflow-hidden bg-bg-card shrink-0 relative border-2 ${vu.isCreator ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-[#11141A]'}`}>
                                                   {vu.avatar ? <img src={vu.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">{vu.username.substring(0,2).toUpperCase()}</div>}
                                                </div>
                                                {vu.isCreator && (
                                                   <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center border border-[#0A0C10] shadow-sm z-10" title="Создатель проекта">
                                                      <BadgeCheck className="w-2 h-2 text-white" />
                                                   </div>
                                                )}
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                   <span className="text-sm font-bold text-zinc-200 truncate">{vu.username} {vu.socketId === socket.id && '(Вы)'}</span>
                                                   <div className="flex items-center gap-1">
                                                      {vu.isMicOn ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-emerald-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg> : <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-red-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="2" x2="22" y2="22"></line></svg>}
                                                   </div>
                                                </div>
                                                {vu.socketId !== socket.id && vu.isMicOn && (
                                                   <input 
                                                      type="range" 
                                                      min="0" 
                                                      max="1" 
                                                      step="0.05" 
                                                      defaultValue="1" 
                                                      onChange={(e) => setVolume(vu.socketId, parseFloat(e.target.value))} 
                                                      className="w-full h-1 mt-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                                      title="Громкость"
                                                   />
                                                )}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </motion.div>
            </>
         )}
      </AnimatePresence>
   );
}

function ChatPanel({ currentUserId, targetType, target, onBack, socket }: any) {
   const [messages, setMessages] = useState<any[]>([]);
   const [text, setText] = useState('');
   const chatId = targetType === 'dm' ? [currentUserId, target.uid].sort().join('_') : target.id;
   const scrollRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      // Load history
      const load = async () => {
         try {
            const url = targetType === 'dm' ? `/api/dms/${currentUserId}/${target.uid}` : `/api/groups/${target.id}/messages`;
            const res = await fetch(url);
            if (res.ok) setMessages(await res.json());
         } catch(e) {}
      };
      load();

      socket.emit('join_social_room', targetType === 'dm' ? `dm_${chatId}` : `group_${chatId}`);

      const listenerFn = (msg: any) => {
         setMessages(prev => [...prev, msg].sort((a,b) => a.createdAt - b.createdAt));
      };
      const eventName = targetType === 'dm' ? 'new_dm' : 'new_group_msg';
      socket.on(eventName, listenerFn);
      
      return () => {
         socket.emit('leave_social_room', targetType === 'dm' ? `dm_${chatId}` : `group_${chatId}`);
         socket.off(eventName, listenerFn);
      }
   }, [currentUserId, target, targetType, socket]);

   useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
   }, [messages]);

   const sendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim()) return;
      try {
         const url = targetType === 'dm' ? '/api/dms' : `/api/groups/${target.id}/messages`;
         const body = targetType === 'dm' ? { from: currentUserId, to: target.uid, text } : { from: currentUserId, text };
         await fetch(url, { method: "POST", headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
         setText('');
      } catch(e) {}
   };

   return (
      <div className="flex flex-col h-full bg-bg-main rounded-xl border border-border-card overflow-hidden">
         <div className="bg-bg-hover p-3 flex items-center justify-between border-b border-border-card shrink-0">
            <div className="flex items-center gap-3">
               <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-4 h-4"/></button>
               <div className="font-semibold text-zinc-200 truncate">{targetType === 'dm' ? target.username : target.name}</div>
            </div>
            {targetType === 'group' && (
               <button onClick={() => navigator.clipboard.writeText(target.id)} className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white bg-bg-main px-2 py-1 rounded-lg border border-border-card transition-colors" title="Копировать код">
                  <span>Код: {target.id.substring(0, 6)}...</span>
               </button>
            )}
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
            {messages.length === 0 && <p className="text-xs text-zinc-500 text-center my-4">Нет сообщений. Начните общение первым!</p>}
            {messages.map((msg, i) => {
               const isMe = msg.from === currentUserId;
               return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                     {!isMe && targetType === 'group' && <span className="text-[10px] text-zinc-500 mb-1 ml-1">UID: {msg.from.substring(0,6)}...</span>}
                     <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-bg-hover border border-border-card text-zinc-200 rounded-bl-sm'}`}>
                        {msg.text}
                     </div>
                  </div>
               )
            })}
         </div>
         <form onSubmit={sendMessage} className="p-2 bg-bg-hover border-t border-border-card flex gap-2 shrink-0">
            <input type="text" value={text} onChange={e=>setText(e.target.value)} placeholder="Сообщение..." className="flex-1 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" />
            <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"><Send className="w-4 h-4"/></button>
         </form>
      </div>
   );
}
