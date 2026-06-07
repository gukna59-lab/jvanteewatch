import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Mic, Square, Play, Pause, Download, FileText, BadgeCheck, X } from 'lucide-react';
import { Message } from '../types';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string, type?: string, mediaUrl?: string) => void;
  onAvatarClick?: (user: {uid?: string, username: string, avatar?: string, isCreator?: boolean}) => void;
}

const MAX_IMAGE_SIZE = 2_000_000;
const MAX_FILE_SIZE = 4_000_000;

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать картинку.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Не удалось открыть картинку.'));
      image.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не удалось обработать картинку.'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const getBestAudioMimeType = () => {
  const options = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
  return options.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
};

export function Chat({ messages, onSendMessage, onAvatarClick }: ChatProps) {
  const [text, setText] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type.startsWith('image/')) {
        const imageUrl = await compressImageFile(file);
        if (imageUrl.length > MAX_IMAGE_SIZE) {
          alert('Картинка слишком большая. Попробуйте фото поменьше.');
          return;
        }
        onSendMessage(file.name, 'image', imageUrl);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert('Файл слишком большой. Максимум около 4 МБ.');
        return;
      }

      const fileUrl = await readFileAsDataUrl(file);
      onSendMessage(file.name, 'file', fileUrl);
    } catch (err: any) {
      alert(err.message || 'Не удалось отправить файл.');
    } finally {
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestAudioMimeType();
      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // limit size roughly to 2MB base64
          if (base64Audio.length < 2_000_000) {
            onSendMessage('', 'voice', base64Audio);
          } else {
            alert("Голосовое сообщение слишком длинное (превышает 2МБ).");
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Не удалось получить доступ к микрофону.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  };

  return (
    <div className="flex-1 lg:flex-none flex flex-col h-auto lg:h-full bg-bg-card lg:border-l border-t lg:border-t-0 border-border-card lg:w-[320px] xl:w-[320px] min-h-0 shadow-2xl relative">
      {chatBg && <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center pointer-events-none animate-pulse" style={{ backgroundImage: `url(${chatBg})` }}></div>}
      <div className="flex-shrink-0 p-4 border-b border-border-card bg-bg-card/80 backdrop-blur-md relative z-10">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#3B82F6] font-display">Чат комнаты</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 hidden-scrollbar relative z-10">
        {messages.map((msg) => {
          const isSystem = msg.userId === 'system';
          return (
            <div key={msg.id} className={`flex flex-col ${isSystem ? 'items-center py-2' : ''}`}>
              {isSystem ? (
                <span className="text-[9px] text-[#475569] uppercase tracking-widest px-2 py-0.5 rounded-md bg-bg-card/80 backdrop-blur-sm text-center font-display">
                  {msg.text}
                </span>
              ) : (
                <div className="flex gap-2 w-full">
                  <div className="relative">
                    <div 
                      className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden border cursor-pointer ${msg.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-[#374151]'}`} 
                      style={{ backgroundColor: msg.color }}
                      onClick={() => typeof onAvatarClick === 'function' && onAvatarClick({ uid: msg.userUid || msg.userId, username: msg.username, avatar: msg.avatar, isCreator: msg.isCreator })}
                    >
                       {msg.avatar ? (
                         <img src={msg.avatar} alt="avatar" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                           {msg.username.substring(0,2).toUpperCase()}
                         </div>
                       )}
                    </div>
                    {msg.isCreator && (
                       <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-10 pointer-events-none">
                          <BadgeCheck className="w-2.5 h-2.5 text-white" />
                       </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <span 
                        className="text-xs font-bold cursor-pointer hover:underline" 
                        style={{ color: msg.color }}
                        onClick={() => typeof onAvatarClick === 'function' && onAvatarClick({ uid: msg.userUid || msg.userId, username: msg.username, avatar: msg.avatar, isCreator: msg.isCreator })}
                      >
                        {msg.username}
                      </span>
                      {msg.isCreator && <span title="Верифицированный VIP-аккаунт" className="flex items-center"><BadgeCheck className="w-3.5 h-3.5 text-amber-500" /></span>}
                      <span className="text-[9px] text-[#475569] ml-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    {msg.type === 'text' && (
                      <p 
                        className="text-sm text-[#CBD5E1] bg-bg-hover p-2 rounded-r-lg rounded-bl-lg border-l-2 break-words" 
                        style={{
                           borderColor: msg.color,
                           ...(msg.isCreator ? { 
                              backgroundImage: 'url(https://i.pinimg.com/originals/30/a5/59/30a5598a68f992b579f68d5b15526bd3.gif?nii=t)', 
                              backgroundSize: 'cover', 
                              backgroundPosition: 'center', 
                              color: '#fff', 
                              textShadow: '0 1px 2px rgba(0,0,0,0.8)' 
                           } : {})
                        }}
                      >
                        {msg.text}
                      </p>
                    )}
                    {msg.type === 'image' && msg.mediaUrl && (
                      <div className="mt-1">
                        <img 
                           src={msg.mediaUrl} 
                           alt="Attached image/gif" 
                           onClick={() => setFullscreenImage(msg.mediaUrl!)}
                           className="max-w-full h-auto rounded-lg max-h-[200px] object-contain border border-[#374151] cursor-pointer" 
                        />
                      </div>
                    )}
                    {msg.type === 'voice' && msg.mediaUrl && (
                      <div className="mt-1 bg-bg-hover p-2 rounded-r-lg rounded-bl-lg border-l-2" style={{ borderColor: msg.color }}>
                        <VoicePlayer src={msg.mediaUrl} color={msg.color} />
                      </div>
                    )}
                    {msg.type === 'file' && msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        download={msg.text || 'file'}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-2 bg-bg-hover hover:bg-[#263449] p-2 rounded-r-lg rounded-bl-lg border-l-2 text-[#CBD5E1] transition-colors"
                        style={{ borderColor: msg.color }}
                      >
                        <FileText className="w-5 h-5 shrink-0" />
                        <span className="text-sm truncate flex-1">{msg.text || 'Файл'}</span>
                        <Download className="w-4 h-4 shrink-0 text-[#94A3B8]" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-3 bg-bg-card border-t border-border-card safe-area-bottom relative">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          {showUrlInput ? (
             <div className="flex-1 min-w-0 flex items-center bg-bg-hover border border-[#3B82F6] rounded-full px-2 py-1 transition-all">
                <input
                   type="text"
                   value={mediaUrlInput}
                   onChange={(e) => setMediaUrlInput(e.target.value)}
                   placeholder="Вставьте ссылку на GIF / Картинку..."
                   className="flex-1 bg-transparent px-2 text-sm focus:outline-none text-[#CBD5E1]"
                   autoFocus
                />
                <button
                   type="button"
                   onClick={() => {
                      if (mediaUrlInput.trim()) {
                         onSendMessage('GIF', 'image', mediaUrlInput.trim());
                         setMediaUrlInput('');
                         setShowUrlInput(false);
                      }
                   }}
                   className="p-1 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold ml-2"
                >
                   Ок
                </button>
                <button
                   type="button"
                   onClick={() => { setShowUrlInput(false); setMediaUrlInput(''); }}
                   className="p-1 px-3 text-xs text-zinc-400 hover:text-white"
                >
                   Отмена
                </button>
             </div>
          ) : (
             <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Сообщение или эмодзи..."
              className="flex-1 min-w-0 bg-bg-hover border border-[#334155] rounded-full py-2 pl-4 pr-4 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors text-[#CBD5E1] placeholder-[#475569]"
              autoComplete="off"
            />
          )}

          {!showUrlInput && (
             <>
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                 onChange={handleFileChange}
                 className="hidden"
               />
               <button
                  type="button"
                  onClick={handleMediaClick}
                  onContextMenu={(e) => {
                     e.preventDefault();
                     setShowUrlInput(true);
                  }}
                  className="p-2 text-[#94A3B8] hover:text-[#3B82F6] transition-colors bg-bg-hover rounded-full border border-[#334155]"
                  title="Отправить файл (Правый клик: ссылка на GIF)"
               >
                  <ImageIcon className="w-4 h-4" />
               </button>
               
               <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="hidden sm:flex px-2 py-1 text-[9px] uppercase font-bold items-center justify-center text-zinc-400 hover:text-blue-400 bg-bg-hover rounded-lg border border-[#334155] transition-colors shrink-0"
                  title="Вставить ссылку на GIF / Изображение"
               >
                  GIF
               </button>
               
               {isRecording ? (
                  <button
                     type="button"
                     onClick={stopRecording}
                     className="p-2 text-white bg-red-500 hover:bg-red-600 transition-colors rounded-full animate-pulse shrink-0"
                     title="Остановить запись"
                  >
                     <Square className="w-4 h-4 fill-current" />
                  </button>
               ) : (
                  <button
                     type="button"
                     onClick={startRecording}
                     className="p-2 text-[#94A3B8] hover:text-[#3B82F6] transition-colors bg-bg-hover rounded-full border border-[#334155] shrink-0"
                     title="Записать голосовое"
                  >
                     <Mic className="w-4 h-4" />
                  </button>
               )}
     
               <button
                 type="submit"
                 disabled={!text.trim()}
                 className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-full transition-colors disabled:opacity-50 shrink-0"
               >
                 <Send className="w-5 h-5 -ml-0.5" />
               </button>
             </>
          )}
        </form>
      </div>

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 transition-opacity cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="absolute top-4 right-4 z-[110]">
             <button 
                onClick={() => setFullscreenImage(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
             >
                <X className="w-6 h-6" />
             </button>
          </div>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen" 
            className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}

function VoicePlayer({ src, color }: { src: string; color: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progress = safeDuration ? Math.min(100, (currentTime / safeDuration) * 100) : 0;

  const formatAudioTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !safeDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const nextTime = ((e.clientX - rect.left) / rect.width) * safeDuration;
    audio.currentTime = Math.max(0, Math.min(safeDuration, nextTime));
  };

  return (
    <div className="w-full max-w-[220px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          setHasError(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={hasError}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: color }}
          title={isPlaying ? 'Пауза' : 'Слушать'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="h-2 rounded-full bg-bg-card cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[#94A3B8] font-mono">
            <span>{formatAudioTime(currentTime)}</span>
            <span>{formatAudioTime(safeDuration)}</span>
          </div>
        </div>
      </div>

      {hasError && (
        <a
          href={src}
          download="voice-message"
          className="mt-2 flex items-center gap-1 text-[11px] text-[#F87171] hover:text-[#FCA5A5]"
        >
          <Download className="w-3 h-3" />
          Не открылось. Скачать голосовое
        </a>
      )}
    </div>
  );
}
