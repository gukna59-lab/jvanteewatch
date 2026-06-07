import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, RefreshCw, Link as LinkIcon, Crown, Settings, SkipForward, ChevronDown, ChevronUp, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, RoomState } from '../types';
import { RutubePlayer } from './RutubePlayer';
import { VKPlayer } from './VKPlayer';

const PlayerComponent = ReactPlayer as any;

interface PlayerProps {
  roomState: RoomState;
  users: User[];
  me: User;
  onUpdateVideoUrl: (url: string) => void;
  onPlayStateChange: (isPlaying: boolean, timestamp: number) => void;
  onSeek: (timestamp: number) => void;
  onForceSync: () => void;
  onReportProgress: (timestamp: number, duration?: number) => void;
  onTransferAdmin: (userId: string) => void;
  onKickUser: (userId: string) => void;
  usersProgress: Record<string, number>;
  onAddToQueue?: (url: string, title?: string) => void;
  onRemoveFromQueue?: (index: number) => void;
  onPlayNextQueue?: () => void;
  reactions?: { id: string, emoji: string, userId: string, username: string, xPos: number }[];
  onSendReaction?: (emoji: string) => void;
}

export function Player({
  roomState,
  users,
  me,
  onUpdateVideoUrl,
  onPlayStateChange,
  onSeek,
  onForceSync,
  onReportProgress,
  onTransferAdmin,
  onKickUser,
  usersProgress,
  onAddToQueue,
  onRemoveFromQueue,
  onPlayNextQueue,
  reactions = [],
  onSendReaction
}: PlayerProps) {
  const isAdmin = roomState.adminId === me.id;
  const isCreator = roomState.creatorId === me.id;
  const playerRef = useRef<any>(null);
  
  const [inputUrl, setInputUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  useEffect(() => {
    console.log('ReactPlayer object:', ReactPlayer);
  }, []);

  const getPlayerTime = () => {
    const player = playerRef.current;
    if (!player) return null;
    if (typeof player.getCurrentTime === 'function') return player.getCurrentTime();
    if (Number.isFinite(player.currentTime)) return player.currentTime;
    return null;
  };

  const getPlayerDuration = () => {
    const player = playerRef.current;
    if (!player) return null;
    if (typeof player.getDuration === 'function') return player.getDuration();
    if (Number.isFinite(player.duration)) return player.duration;
    return null;
  };

  const seekPlayerTo = (timestamp: number) => {
    const player = playerRef.current;
    if (!player) return;
    if (typeof player.seekTo === 'function') {
      player.seekTo(timestamp, 'seconds');
      return;
    }
    if ('currentTime' in player) {
      player.currentTime = timestamp;
    }
  };

  const isRutube = roomState.videoUrl?.includes('rutube.ru');
  const isVK = roomState.videoUrl?.includes('vk.com/video');
  const isCustomPlayer = isRutube || isVK;

  // Sync with server state for ReactPlayer and Custom Players
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && roomState.videoUrl && !isDraggingSeek) {
        const currentClientTime = getPlayerTime() ?? 0;
        const expectedTime = roomState.isPlaying 
          ? roomState.timestamp + (Date.now() - roomState.lastUpdateAt) / 1000 
          : roomState.timestamp;
        
        const diff = Math.abs(currentClientTime - expectedTime);
        
        // Keep everyone tightly synced to the room state.
        if (diff > 2.5) {
          seekPlayerTo(expectedTime);
        }

        if (!isCustomPlayer) {
          // Try to enforce playback state on the internal player
          const internalPlayer = playerRef.current.getInternalPlayer?.();
          if (internalPlayer) {
            if (typeof internalPlayer.getPlayerState === 'function') {
              const state = internalPlayer.getPlayerState();
              // 1 = playing, 2 = paused
              if (roomState.isPlaying && state === 2) {
                 internalPlayer.playVideo();
              } else if (!roomState.isPlaying && state === 1) {
                 internalPlayer.pauseVideo();
              }
            } else if (typeof internalPlayer.pause === 'function') {
               // HTML5 video element
               const isPaused = internalPlayer.paused;
               if (roomState.isPlaying && isPaused) {
                  internalPlayer.play().catch(() => {});
               } else if (!roomState.isPlaying && !isPaused) {
                  internalPlayer.pause();
               }
            }
          }
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [roomState.timestamp, roomState.isPlaying, roomState.lastUpdateAt, roomState.videoUrl, isCustomPlayer, isDraggingSeek]);

  // Handle play state sync manually as fallback for web components
  useEffect(() => {
    // Rely solely on playing={roomState.isPlaying} for ReactPlayer
  }, [roomState.isPlaying, roomState.videoUrl, isCustomPlayer]);

  // Periodic enforcement for viewers (to undo manual pauses)
  useEffect(() => {
     // Removed periodic pause calls because ReactPlayer handles it via `playing` prop
  }, [isAdmin, isCustomPlayer, roomState.isPlaying]);

  // Report progress loop for the current user
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = getPlayerTime();
        if (time !== null) {
          const nextDuration = getPlayerDuration();
          if (!isCustomPlayer) {
             onReportProgress(time, nextDuration !== null && Number.isFinite(nextDuration) ? nextDuration : 0);
          }
          if (!isDraggingSeek) setCurrentTime(time);
          if (nextDuration !== null && Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onReportProgress, isCustomPlayer, isDraggingSeek]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() && isCreator) {
      if (roomState.videoUrl) {
         onAddToQueue?.(inputUrl.trim(), 'Новое видео в очереди');
      } else {
         onUpdateVideoUrl(inputUrl.trim());
      }
      setInputUrl('');
    }
  };

  const handlePlay = () => {
    if (isCreator) {
      onPlayStateChange(true, getCurrentTime());
    }
  };

  const handlePause = () => {
    if (isCreator) {
      onPlayStateChange(false, getCurrentTime());
    }
  };

  const handleSeek = (e: any) => {
    if (isCreator) {
      onSeek(getCurrentTime());
    }
  };

  const handleSeekTo = (timestamp: number, shouldBroadcast = false) => {
    if (!isCreator) return;
    const nextTime = Math.max(0, Math.min(timestamp, duration || timestamp));
    setCurrentTime(nextTime);
    seekPlayerTo(nextTime);
    if (shouldBroadcast) {
      onSeek(nextTime);
    }
  };

  const getCurrentTime = () => {
    const playerTime = getPlayerTime();
    if (playerTime !== null) return playerTime;

    return roomState.isPlaying
      ? roomState.timestamp + (Date.now() - roomState.lastUpdateAt) / 1000
      : roomState.timestamp;
  };

  const handleTogglePlayback = () => {
    if (!isCreator) return;
    onPlayStateChange(!roomState.isPlaying, getCurrentTime());
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-none lg:h-full lg:flex-1 flex flex-col bg-black overflow-hidden relative">
      
      {/* Video Container */}
      <div className="w-full aspect-video lg:aspect-auto lg:flex-1 relative bg-black flex flex-col justify-center items-center overflow-hidden">
        
        {/* Floating Reactions Layer */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none z-50">
          <AnimatePresence>
            {reactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 50, scale: 0.5 }}
                animate={{ opacity: 1, y: -200, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute text-4xl"
                style={{ left: `${r.xPos}%`, bottom: '20px' }}
              >
                {r.emoji}
                <div className="text-[10px] bg-black/50 text-white px-1 rounded absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">{r.username}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!roomState.videoUrl ? (
          <div className="text-center p-8 max-w-md w-full bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800">
            <VideoPlaceholder isAdmin={isCreator} inputUrl={inputUrl} setInputUrl={setInputUrl} handleUrlSubmit={handleUrlSubmit} />
          </div>
        ) : isRutube ? (
          <div className="w-full h-full relative">
            <RutubePlayer 
              ref={playerRef}
              url={roomState.videoUrl}
              playing={roomState.isPlaying}
              timestamp={roomState.timestamp}
              lastUpdateAt={roomState.lastUpdateAt}
              isAdmin={isCreator}
              onPlay={(t) => isCreator && onPlayStateChange(true, t ?? getCurrentTime())}
              onPause={(t) => isCreator && onPlayStateChange(false, t ?? getCurrentTime())}
              onSeek={onSeek}
              onReportProgress={onReportProgress}
            />
          </div>
        ) : isVK ? (
          <div className="w-full h-full relative">
            <VKPlayer 
              ref={playerRef}
              url={roomState.videoUrl}
              playing={roomState.isPlaying}
              timestamp={roomState.timestamp}
              lastUpdateAt={roomState.lastUpdateAt}
              isAdmin={isCreator}
              onPlay={(t) => isCreator && onPlayStateChange(true, t ?? getCurrentTime())}
              onPause={(t) => isCreator && onPlayStateChange(false, t ?? getCurrentTime())}
              onSeek={onSeek}
              onReportProgress={onReportProgress}
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full text-white">
            <PlayerComponent
              ref={playerRef}
              src={roomState.videoUrl}
              width="100%"
              height="100%"
              playing={roomState.isPlaying}
              controls={true} // Enable native controls to allow clicking the gear
              onPlay={handlePlay}
              onPause={handlePause}
              onDurationChange={() => {
                const nextDuration = getPlayerDuration();
                if (nextDuration !== null && Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
              }}
              onTimeUpdate={() => {
                if (!playerRef.current || isDraggingSeek) return;
                const time = getPlayerTime();
                if (time !== null) setCurrentTime(time);
              }}
              style={{ pointerEvents: 'auto' }} // Allow everyone to click the gear
              config={({
                youtube: { playerVars: { disablekb: 1, playsinline: 1, rel: 0 } }
              }) as any}
            />
          </div>
        )}

        {/* Mobile Banner Toggle Button */}
        <button 
           onClick={() => setIsBannerVisible(!isBannerVisible)}
           className="lg:hidden absolute bottom-2 right-2 z-[60] p-2 bg-black/50 hover:bg-black/70 backdrop-blur text-white rounded-full transition-colors"
           title={isBannerVisible ? "Скрыть панель" : "Показать панель"}
        >
           {isBannerVisible ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
        </button>
      </div>

      {/* Controls & Sync Status Panel */}
      <div className={`flex-shrink-0 w-full z-10 bg-bg-card border-t border-border-card ${isBannerVisible ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
        {/* Admin Setup Area / Queue form */}
        {isCreator && (
           <div className="p-4 bg-bg-card border-b border-border-card">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (inputUrl.trim() && isCreator) {
                  onUpdateVideoUrl(inputUrl.trim());
                  setInputUrl('');
                }
              }} className="flex relative max-w-xl mx-auto w-full">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Вставьте ссылку на видео (YouTube, Rutube, mp4)..."
                  className="w-full bg-bg-hover border border-[#334155] rounded-l py-2 pl-4 pr-4 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors text-[#CBD5E1] placeholder-[#475569]"
                />
                <button 
                  type="submit"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-r text-sm font-bold transition-colors"
                >
                  Загрузить
                </button>
              </form>
           </div>
        )}

        {/* Player Action Bar (Only when playing or admin has URL) */}
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                {isCreator ? (
                   <span className="text-[10px] uppercase font-bold text-[#3B82F6] tracking-widest bg-[#3B82F6]/10 px-2 py-1 rounded border border-[#3B82F6]/20">
                     Управление
                   </span>
                ) : (
                   <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-widest bg-bg-hover px-2 py-1 rounded border border-[#374151]">
                     Зритель
                   </span>
                )}
                
                {/* Reaction Buttons */}
                <div className="flex items-center gap-1 bg-bg-hover border border-[#334155] rounded px-1 py-1">
                  {['😂', '💔', '🔥', '👀', '💩', '🎉', '🤡'].map(emoji => (
                     <button
                        key={emoji}
                        onClick={() => onSendReaction?.(emoji)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-[#334155] hover:scale-110 active:scale-95 transition-all outline-none rounded"
                     >
                        {emoji}
                     </button>
                  ))}
                </div>
            </div>
            {roomState.videoUrl && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isCreator && (
                        <>
                            <button
                               onClick={handleTogglePlayback}
                               className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[#93C5FD] text-[11px] font-bold rounded uppercase tracking-tighter"
                            >
                               {roomState.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                               {roomState.isPlaying ? 'Стоп' : 'Плей'}
                            </button>
                            <button 
                               onClick={() => handleSeekTo(Math.max(currentTime - 15, 0), true)}
                               className="flex items-center justify-center px-3 py-2 bg-bg-hover hover:bg-[#334155] border border-[#374151] text-zinc-300 text-[11px] font-bold rounded transition-colors tracking-tighter uppercase"
                               title="Назад на 15 сек"
                            >
                               -15с
                            </button>
                            <button 
                               onClick={() => handleSeekTo(currentTime + 15, true)}
                               className="flex items-center justify-center px-3 py-2 bg-bg-hover hover:bg-[#334155] border border-[#374151] text-zinc-300 text-[11px] font-bold rounded transition-colors tracking-tighter uppercase"
                               title="Вперед на 15 сек"
                            >
                               +15с
                            </button>
                            <button 
                               onClick={onForceSync}
                               className="flex items-center gap-2 px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#F87171] text-[11px] font-bold rounded uppercase tracking-tighter"
                            >
                               <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                               Синхронизировать всех
                            </button>
                            <button 
                               onClick={() => onUpdateVideoUrl('')}
                               className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-[11px] font-bold rounded uppercase tracking-tighter"
                            >
                               <RefreshCw className="w-3 h-3" />
                               Сменить видео
                            </button>
                        </>
                    )}
                    <button onClick={() => setShowSettings(!showSettings)} className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
                       <Settings className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        {roomState.videoUrl && (
          <div className="px-4 pb-4 -mt-1 flex items-center gap-3 relative z-20">
            <span className="text-xs font-mono text-zinc-400 w-12 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || Math.max(currentTime, roomState.timestamp, 7200)}
              step={0.1}
              value={currentTime}
              disabled={!isCreator}
              onMouseDown={() => isCreator && setIsDraggingSeek(true)}
              onTouchStart={() => isCreator && setIsDraggingSeek(true)}
              onChange={(e) => handleSeekTo(Number(e.target.value))}
              onMouseUp={(e) => {
                setIsDraggingSeek(false);
                handleSeekTo(Number((e.target as HTMLInputElement).value), true);
              }}
              onTouchEnd={(e) => {
                setIsDraggingSeek(false);
                handleSeekTo(Number((e.target as HTMLInputElement).value), true);
              }}
              className="w-full accent-[#3B82F6] disabled:opacity-50"
            />
            <span className="text-xs font-mono text-zinc-400 w-12">{formatTime(duration)}</span>
          </div>
        )}

        {/* Sync Status Grid */}
        <div className="bg-bg-main p-4 border-t border-border-card">
          <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase font-bold text-[#64748B] tracking-widest">Синхронизация в реальном времени</h3>
              <span className="text-[10px] text-[#10B981] font-medium">● Застабилизировано</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             {users.map(user => {
                const userTime = usersProgress[user.id] || 0;
                const isUserAdmin = user.id === roomState.adminId;
                const isUserCreator = user.id === roomState.creatorId;
                const isMe = user.id === me.id;
                // Calculate diff if we wanted, rough estimate
                const myTime = usersProgress[me.id] || 0;
                const timeDiff = Math.abs(userTime - myTime);
                const isLagging = timeDiff > 2 && !isMe;
                
                return (
                  <div key={user.id} className={`bg-bg-card p-2 rounded border ${isLagging ? 'border-yellow-500/50' : 'border-border-card'} flex flex-col group relative`}>
                    <span 
                      className="text-[10px] truncate font-semibold mb-0.5 flex items-center gap-1" 
                      style={{ color: isLagging ? '#EAB308' : (isMe ? '#3B82F6' : '#94A3B8') }}
                    >
                      <span className="truncate">{user.username}</span> 
                      {isUserCreator && <span title="Создатель" className="text-yellow-400 shrink-0">👑</span>}
                      {isUserAdmin && !isUserCreator && <span title="Администратор" className="text-zinc-300 shrink-0">🥈</span>}
                      {isMe && <span className="shrink-0">(Я)</span>}
                    </span>
                    <span className="text-sm font-mono text-white">
                       {formatTime(userTime)} 
                       {isLagging && <span className="text-[10px] text-yellow-500 ml-1">синхрон...</span>}
                    </span>

                    {isAdmin && !isUserAdmin && showSettings && (
                      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => onTransferAdmin(user.id)}
                           className="bg-[#3B82F6] text-white p-1 rounded-full shadow-lg"
                           title="Сделать админом"
                         >
                           <Crown className="w-3 h-3" />
                         </button>
                         {/* Kick functionality (requires onKickUser prop, but let's assume it exists or we add it) */}
                         <button 
                           onClick={() => onKickUser(user.id)}
                           className="bg-red-500 text-white p-1 rounded-full shadow-lg"
                           title="Исключить пользователя"
                         >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6m2-2l-2 2 2 2"></path></svg>
                         </button>
                      </div>
                    )}
                  </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlaceholder({ isAdmin, inputUrl, setInputUrl, handleUrlSubmit }: any) {
  if (isAdmin) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
          <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2"></div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text-main">Load Video</h2>
        <p className="text-xs text-[#94A3B8] mb-4">Paste URL in the bottom panel</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-white/10 group">
         <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white/50 border-b-[12px] border-b-transparent ml-2"></div>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-text-main">Ожидание администратора...</h2>
      <p className="text-xs text-[#94A3B8]">Администратор должен начать воспроизведение видео.</p>
    </div>
  );
}
