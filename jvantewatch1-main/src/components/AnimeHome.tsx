import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Grid, List, PlaySquare, TrendingUp, Star, Eye, ChevronRight, LayoutGrid, MonitorPlay, Film, Tv, Clock, Languages, ExternalLink, Image as ImageIcon, X, BadgeCheck } from 'lucide-react';
import { Logo } from './Lobby';
import { animeData, Anime } from '../data/animeData';
import { CustomPlayer } from './CustomPlayer';

interface AnimeHomeProps {
  onBack: () => void;
  user: any;
  username: string | null;
  avatar: string | null;
}

interface AnimeSource {
  voice: string;
  provider: 'anilibria' | 'animevost';
  episodes: number[];
  qualities?: string[];
}

export const proxyImg = (url: string) => {
  if (!url) return '';
  if (url.includes('shikimori.one')) {
     const cleanUrl = url.replace('https://', '');
     return `https://i0.wp.com/${cleanUrl}`;
  }
  return url;
};

export function AnimeHome({ onBack, user, username, avatar }: AnimeHomeProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Все' | 'Сериалы' | 'Фильмы' | 'ONA'>('Все');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // Specific states for detail view (player)
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [kodikUrl, setKodikUrl] = useState<string | null>(null);
  const [kodikLoading, setKodikLoading] = useState(false);
  const [kodikError, setKodikError] = useState<string | null>(null);
  const [showPlayerFallback, setShowPlayerFallback] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<AnimeSource[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('');
  
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentMediaUrl, setCommentMediaUrl] = useState('');

  React.useEffect(() => {
    if (!selectedAnime) return;
    const fetchComments = async () => {
      try {
        const targetId = `${selectedAnime.id}_${selectedEpisode || 1}`;
        const res = await fetch(`/api/comments/${targetId}`);
        if(res.ok) {
           setComments(await res.json());
        }
      } catch (e) {}
    }
    fetchComments();
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [selectedAnime, selectedEpisode]);

  const handleCommentMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой (макс. 2МБ)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setCommentMediaUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if((!commentText.trim() && !commentMediaUrl) || !user || !selectedAnime) return;
    try {
      const targetId = `${selectedAnime.id}_${selectedEpisode || 1}`;
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           animeId: targetId,
           userId: user.uid,
           username: username || 'User',
           avatar: avatar || '',
           text: commentText.trim(),
           mediaUrl: commentMediaUrl,
           mediaType: commentMediaUrl ? 'image' : undefined,
           isCreator: user.isCreator
        })
      });
      setCommentText('');
      setCommentMediaUrl('');
      const res = await fetch(`/api/comments/${targetId}`);
      if(res.ok) setComments(await res.json());
    } catch(e) {}
  };

  React.useEffect(() => {
    setIsPlaying(false);
    setKodikUrl(null);
    setKodikError(null);
    setShowPlayerFallback(false);
  }, [selectedAnime, selectedEpisode, selectedVoice, selectedQuality]);

  const selectedSource = sourceOptions.find(source => source.voice === selectedVoice);
  const availableEpisodes = selectedSource?.episodes?.length
    ? selectedSource.episodes
    : Array.from({ length: selectedAnime?.episodes || 0 }, (_, index) => index + 1);
  const availableQualities = selectedSource?.qualities || [];

  React.useEffect(() => {
    if (!selectedAnime) {
      setSourceOptions([]);
      return;
    }

    let cancelled = false;
    setSourceLoading(true);
    setSourceOptions([]);

    const params = new URLSearchParams({
      title: selectedAnime.title,
      episodes: String(selectedAnime.episodes),
    });

    fetch(`/api/anime-sources?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        if (cancelled) return;
        const sources = Array.isArray(data.sources) ? data.sources as AnimeSource[] : [];
        setSourceOptions(sources);
        const firstSource = sources[0];
        setSelectedVoice(firstSource?.voice || selectedAnime.voiceovers?.[0] || '');
        setSelectedEpisode(firstSource?.episodes?.[0] || 1);
        setSelectedQuality(firstSource?.qualities?.[0] || '');
      })
      .catch(() => {
        if (cancelled) return;
        setSourceOptions([]);
        setSelectedVoice(selectedAnime.voiceovers?.[0] || '');
        setSelectedEpisode(1);
        setSelectedQuality('');
      })
      .finally(() => {
        if (!cancelled) setSourceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAnime]);

  React.useEffect(() => {
    if (!selectedSource) return;
    if (!selectedSource.episodes.includes(selectedEpisode)) {
      setSelectedEpisode(selectedSource.episodes[0] || 1);
    }
    if (selectedSource.qualities?.length && !selectedSource.qualities.includes(selectedQuality)) {
      setSelectedQuality(selectedSource.qualities[0]);
    }
    if (!selectedSource.qualities?.length && selectedQuality) {
      setSelectedQuality('');
    }
  }, [selectedSource, selectedEpisode, selectedQuality]);

  React.useEffect(() => {
    if (!kodikUrl) return;
    setShowPlayerFallback(false);
    const timer = window.setTimeout(() => setShowPlayerFallback(true), 4500);
    return () => window.clearTimeout(timer);
  }, [kodikUrl]);

  const fetchKodikPlayer = async (anime: Anime | null, qualityOverride = selectedQuality) => {
    if (!anime) return;
    setKodikLoading(true);
    setKodikError(null);
    setKodikUrl(null);

    try {
      const params = new URLSearchParams({
        shikimoriId: anime.shikimori_id,
        episode: String(selectedEpisode),
        title: anime.title,
      });
      if (selectedVoice) {
        params.set('voice', selectedVoice);
      }
      if (selectedSource?.provider) {
        params.set('provider', selectedSource.provider);
      }
      if (qualityOverride) {
        params.set('quality', qualityOverride);
      }
      const response = await fetch(`/api/anime-player?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Плеер для этой серии сейчас недоступен.');
      }

      setKodikUrl(data.url);
      setIsPlaying(true);
    } catch (error: any) {
      setKodikError(error.message || 'Не удалось загрузить плеер.');
      setIsPlaying(false);
    } finally {
      setKodikLoading(false);
    }
  };

  const scrollToPlayer = () => {
    document.getElementById('anime-player-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredAnimeList = useMemo(() => {
    return animeData.filter(anime => {
      const matchFilter = filter === 'Все' || anime.type === filter;
      const matchSearch = anime.title.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [filter, search]);

  const totalPages = Math.ceil(filteredAnimeList.length / itemsPerPage);
  const paginatedAnimeList = filteredAnimeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRandomAnime = () => {
    const min = 0;
    const max = animeData.length - 1;
    const randomIndex = Math.floor(Math.random() * (max - min + 1)) + min;
    const item = animeData[randomIndex];
    setSelectedVoice(item.voiceovers?.[0] || '');
    setSelectedEpisode(1);
    setSelectedAnime(item);
  };

  const handleSelectAnime = (anime: Anime) => {
    setSelectedVoice(anime.voiceovers?.[0] || '');
    setSelectedEpisode(1);
    setSelectedAnime(anime);
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-bg-card/90 backdrop-blur-xl border-b border-border-card">
         <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
               <button onClick={() => selectedAnime ? setSelectedAnime(null) : onBack()} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors" title={selectedAnime ? "Назад к списку" : "Назад в лобби"}>
                 <ArrowLeft className="w-6 h-6" />
               </button>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bg-card rounded-xl flex items-center justify-center border border-border-card overflow-hidden p-1">
                     <Logo />
                  </div>
                  <div className="hidden sm:block">
                     <h1 className="text-xl font-black tracking-tighter text-blue-500 leading-none">JvanteWatch</h1>
                     <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Anime</span>
                  </div>
               </div>
            </div>

            {!selectedAnime && (
              <div className="flex-1 min-w-[120px] max-w-2xl mx-2 sm:mx-8">
                 <div className="relative group">
                    <input 
                      type="text" 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Найти аниме..." 
                      className="w-full bg-bg-main border border-border-card rounded-full pl-10 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-blue-500/50 outline-none transition-colors group-hover:border-zinc-700" 
                    />
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                 </div>
              </div>
            )}

            <div className="flex items-center gap-4 ml-auto">
               <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-400">
                  <button onClick={() => { setSelectedAnime(null); setFilter('Все'); }} className="hover:text-white transition-colors">Главная</button>
                  <button onClick={() => { setSelectedAnime(null); setFilter('Все'); }} className="text-text-main">Аниме</button>
                  <button onClick={() => { setSelectedAnime(null); setFilter('Все'); }} className="hover:text-white transition-colors">Топ-100</button>
                  <button onClick={handleRandomAnime} className="hover:text-white transition-colors">Случайное</button>
               </nav>
               <div className="w-[1px] h-6 bg-[#1F2937] mx-2 hidden lg:block"></div>
               <div className="flex items-center gap-2">
                 <span className="text-sm font-semibold hidden md:block truncate max-w-[100px]">{username}</span>
                 <div className="w-9 h-9 rounded-full bg-bg-hover border border-border-card overflow-hidden relative">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{username?.substring(0,2).toUpperCase()}</div>}
                 </div>
               </div>
            </div>
         </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {!selectedAnime ? (
          <motion.main 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8"
          >
             {/* Left Column (Main list) */}
             <div className="flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-bg-card border border-border-card p-3 rounded-2xl mb-6 gap-3">
                   <h2 className="text-lg font-bold ml-2">Топ аниме: {filter}</h2>
                   <div className="flex flex-wrap items-center gap-2">
                      <div className="flex bg-bg-main p-1 rounded-xl border border-border-card">
                        {(['Все', 'Сериалы', 'Фильмы', 'ONA'] as const).map(f => (
                            <button 
                               key={f}
                               onClick={() => setFilter(f)}
                               className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                               {f}
                            </button>
                         ))}
                      </div>
                      <div className="flex items-center gap-1 bg-bg-main p-1 rounded-xl border border-border-card">
                         <button className="p-1.5 bg-[#1F2937] text-white rounded-lg"><LayoutGrid className="w-4 h-4" /></button>
                         <button className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><List className="w-4 h-4" /></button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 min-[460px]:grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                   {paginatedAnimeList.map((anime, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        whileHover={{ y: -5 }} 
                        key={anime.id} 
                        onClick={() => handleSelectAnime(anime)}
                        className="group relative bg-bg-card border border-border-card rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-xl flex flex-col"
                      >
                         <div className="absolute top-2 left-2 z-10 bg-amber-500 text-[#0F172A] text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                            <Star className="w-3 h-3 fill-current" /> {anime.rating}
                         </div>
                         <div className="absolute top-2 right-2 z-10 bg-bg-card/90 backdrop-blur text-zinc-300 border border-border-card text-xs font-bold px-2 py-1 rounded-lg">
                            {anime.type}
                         </div>

                         <div className="pt-[140%] overflow-hidden relative border-b border-border-card bg-bg-card w-full">
                            <img src={proxyImg(anime.img)} alt={anime.title} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.opacity = '0'; }} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#11141A] via-transparent to-transparent opacity-90 pointer-events-none"></div>
                         </div>

                         <div className="p-4 flex-1 flex flex-col justify-end bg-bg-card">
                            <h3 className="font-bold text-sm leading-tight line-clamp-2 text-text-main mb-2">{anime.title}</h3>
                            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium mt-auto">
                               <span>IMDb</span>
                               <span>#{anime.rank} в рейтинге</span>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                   {filteredAnimeList.length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-500 font-medium">
                         Ничего не найдено по запросу «{search}»
                      </div>
                   )}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2 pb-8">
                     <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-bg-card border border-border-card text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-bg-hover transition-colors"
                     >
                        &lt; Назад
                     </button>
                     
                     <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                        {Array.from({ length: totalPages }).map((_, i) => {
                           const page = i + 1;
                           // Only show a few pages around current to avoid long list
                           if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                              return (
                                 <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg border flex-shrink-0 transition-colors ${currentPage === page ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-bg-card border-border-card text-zinc-400 hover:bg-bg-hover hover:text-white'}`}
                                 >
                                    {page}
                                 </button>
                              );
                           } else if (page === currentPage - 2 || page === currentPage + 2) {
                              return <span key={page} className="text-zinc-500">...</span>;
                           }
                           return null;
                        })}
                     </div>

                     <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-bg-card border border-border-card text-zinc-300 rounded-lg disabled:opacity-50 hover:bg-bg-hover transition-colors"
                     >
                        Вперед &gt;
                     </button>
                  </div>
                )}
             </div>

             {/* Right Column (Sidebar) */}
             <aside className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
                {/* Stats Block - Reseted per request */}
                <div className="bg-bg-card border border-border-card rounded-3xl p-5">
                   <h3 className="font-bold text-sm text-center mb-4 tracking-widest uppercase text-zinc-500">Статистика сайта</h3>
                   <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between items-center border-b border-border-card pb-2">
                         <span className="text-zinc-400">Вкладок открыто:</span>
                         <span className="text-text-main">0</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border-card pb-2">
                         <span className="text-zinc-400">Пользователей:</span>
                         <div className="flex items-center gap-2">
                           <span className="text-text-main">0</span>
                           <span className="flex items-center gap-1 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> 1</span>
                         </div>
                      </div>
                      <div className="flex justify-between items-center border-b border-border-card pb-2">
                         <span className="text-zinc-400">Аниме в базе:</span>
                         <span className="text-text-main">{animeData.length}</span>
                      </div>
                   </div>
                </div>
             </aside>
          </motion.main>
        ) : (
          <motion.main 
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-8"
          >
             <div className="flex flex-col lg:flex-row gap-8">
                {/* Poster & Info Sidebar */}
                <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-6">
                   <div className="bg-bg-card rounded-3xl border border-border-card overflow-hidden shadow-2xl">
                      <div className="pt-[140%] overflow-hidden bg-bg-card w-full relative">
                         <img src={proxyImg(selectedAnime.img)} alt={selectedAnime.title} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.opacity = '0'; }} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="p-5 flex flex-col gap-4">
                         <div className="flex items-center justify-center gap-3 bg-bg-main p-3 rounded-xl border border-border-card">
                            <div className="flex items-center gap-1 text-amber-500 font-black text-xl">
                               <Star className="w-5 h-5 fill-current" /> {selectedAnime.rating}
                            </div>
                            <span className="text-zinc-500 text-sm font-bold">IMDb</span>
                         </div>
                         <button onClick={scrollToPlayer} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                            <MonitorPlay className="w-5 h-5" /> Смотреть
                         </button>
                      </div>
                   </div>

                   <div className="bg-bg-card rounded-3xl border border-border-card p-5">
                      <h3 className="font-bold text-sm tracking-widest uppercase text-zinc-500 mb-4">Информация</h3>
                      <div className="space-y-4 text-sm font-medium">
                         <div className="flex justify-between items-center">
                            <span className="text-zinc-400 flex items-center gap-2"><Film className="w-4 h-4" /> Тип</span>
                            <span className="text-white bg-[#1F2937] px-2 py-1 rounded-md">{selectedAnime.type}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-zinc-400 flex items-center gap-2"><Tv className="w-4 h-4" /> Эпизоды</span>
                            <span className="text-text-main">{availableEpisodes.length}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-zinc-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Топ</span>
                            <span className="text-text-main">#{selectedAnime.rank}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col gap-8">
                   <div className="bg-bg-card rounded-3xl border border-border-card p-6 lg:p-8">
                      <h1 className="text-3xl lg:text-4xl font-black text-text-main mb-4">{selectedAnime.title}</h1>
                      <div className="prose prose-invert max-w-none mb-8">
                         <h3 className="text-lg font-bold text-zinc-300 mb-2">Сюжет</h3>
                         <p className="text-zinc-400 leading-relaxed">
                            {selectedAnime.plot.replace(/\[.*?\]/g, '')}
                         </p>
                      </div>

                      <h3 className="text-lg font-bold text-zinc-300 mb-4">Кадры из аниме</h3>
                      {selectedAnime.screenshots && selectedAnime.screenshots.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedAnime.screenshots.map((src, i) => (
                            <div key={i} className="aspect-video rounded-2xl overflow-hidden border border-border-card">
                              <img
                                src={proxyImg(src)}
                                alt={`Кадр ${i + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-sm">Скриншоты не найдены</p>
                      )}
                   </div>

                   {/* Fake Player Section */}
                   <div id="anime-player-section" className="bg-bg-card rounded-3xl border border-border-card overflow-hidden scroll-mt-24">
                      {/* Player Controls Header */}
                      <div className="bg-bg-main border-b border-border-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                         <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                           <Languages className="w-5 h-5 text-zinc-500 shrink-0" />
                           {(sourceOptions.length ? sourceOptions.map(source => source.voice) : selectedAnime.voiceovers).map(voice => (
                              <button 
                                 key={voice}
                                 onClick={() => {
                                   const source = sourceOptions.find(item => item.voice === voice);
                                   setSelectedVoice(voice);
                                   setSelectedEpisode(source?.episodes?.[0] || 1);
                                   setSelectedQuality(source?.qualities?.[0] || '');
                                 }}
                                 className={`px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${selectedVoice === voice ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-zinc-400 hover:bg-bg-hover'}`}
                              >
                                 {voice}
                              </button>
                           ))}
                           {sourceLoading && (
                             <span className="px-3 py-1.5 text-sm text-zinc-500">Проверяю серии...</span>
                           )}
                         </div>
                      </div>

                       {/* Kodik Video Player */}
                      <div className="aspect-video bg-black relative group flex items-stretch justify-center">
                         {!isPlaying ? (
                           <>
                             <img 
                               src={proxyImg(selectedAnime.screenshots[0] || selectedAnime.img)} 
                               onError={(e) => { e.currentTarget.src = proxyImg(selectedAnime.img); }}
                               referrerPolicy="no-referrer" 
                               className="absolute inset-0 w-full h-full object-cover opacity-30" 
                               alt="Player background"
                             />
                             <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                {kodikError && (
                                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-2 rounded-xl max-w-xs text-center">
                                    {kodikError}
                                  </div>
                                )}
                                <button 
                                  onClick={() => fetchKodikPlayer(selectedAnime)} 
                                  disabled={kodikLoading}
                                  className="w-20 h-20 rounded-full bg-blue-600/80 hover:bg-blue-500 hover:scale-110 flex items-center justify-center transition-all shadow-blue-500/50 shadow-lg backdrop-blur z-10 disabled:opacity-60 disabled:cursor-wait"
                                >
                                  {kodikLoading 
                                    ? <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    : <PlaySquare className="w-8 h-8 ml-1 text-white" />
                                  }
                                </button>
                             </div>
                             <div className="absolute bottom-4 left-4 right-4 text-center z-10">
                                <span className="bg-black/60 text-white backdrop-blur text-sm font-bold px-4 py-2 rounded-xl">
                                   Озвучка: {selectedVoice} • Серия {selectedEpisode} из {selectedAnime.episodes}
                                </span>
                             </div>
                           </>
                         ) : kodikUrl ? (
                           /\.(m3u8|mp4)(\?|$)/i.test(kodikUrl) ? (
                             <CustomPlayer
                               src={kodikUrl}
                               title={selectedAnime.title}
                               poster={proxyImg(selectedAnime.screenshots[0] || selectedAnime.img)}
                               qualities={availableQualities}
                               selectedQuality={selectedQuality}
                               onQualityChange={(quality) => {
                                 setSelectedQuality(quality);
                                 fetchKodikPlayer(selectedAnime, quality);
                               }}
                             />
                           ) : (
                             <iframe
                               src={kodikUrl}
                               className="w-full h-full border-0"
                               allowFullScreen
                               allow="autoplay; fullscreen"
                               referrerPolicy="no-referrer"
                               title={selectedAnime.title}
                             />
                           )
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-zinc-500">
                             Загрузка плеера...
                           </div>
                         )}
                         {isPlaying && kodikUrl && showPlayerFallback && !/\.(m3u8|mp4)(\?|$)/i.test(kodikUrl) && (
                           <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-blue-500/30 bg-bg-main/90 p-4 backdrop-blur-xl shadow-2xl">
                             <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                               <div>
                                 <div className="text-sm font-bold text-text-main">Если встроенный плеер не открылся</div>
                                 <div className="text-xs text-zinc-400 mt-1">Источник может блокировать iframe на localhost. Откройте плеер в новой вкладке.</div>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                 <a
                                   href={kodikUrl}
                                   target="_blank"
                                   rel="noreferrer"
                                   className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-600/30"
                                 >
                                   <ExternalLink className="w-3.5 h-3.5" />
                                   Открыть плеер
                                 </a>
                               </div>
                             </div>
                           </div>
                         )}
                      </div>

                      {/* Episode Selector */}
                      {selectedAnime.type === 'Сериалы' || selectedAnime.type === 'ONA' ? (
                        <div className="p-4 bg-bg-card">
                           <h4 className="text-sm font-bold text-zinc-400 mb-3 ml-1 flex items-center gap-2"><Clock className="w-4 h-4" /> Выбор серии</h4>
                           <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                              {availableEpisodes.map((episode) => (
                                 <button 
                                    key={episode}
                                    onClick={() => setSelectedEpisode(episode)}
                                    className={`w-12 h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${selectedEpisode === episode ? 'bg-blue-600 text-white shadow-lg' : 'bg-bg-hover text-zinc-400 hover:bg-[#2DD4BF]/20 hover:text-[#2DD4BF] border border-[#334155]'}`}
                                 >
                                    {episode}
                                 </button>
                              ))}
                           </div>
                        </div>
                      ) : null}

                      {/* Comments Section */}
                      <div className="p-6 bg-bg-main">
                         <h4 className="text-lg font-bold text-text-main mb-4">Комментарии к серии</h4>
                         <form onSubmit={handlePostComment} className="flex gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-bg-hover overflow-hidden shrink-0 border border-border-card">
                               {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{username?.substring(0,2).toUpperCase()}</div>}
                            </div>
                            <div className="flex-1">
                               {commentMediaUrl && (
                                  <div className="relative w-32 h-32 mb-2 rounded-xl overflow-hidden border border-border-card group">
                                     <img src={commentMediaUrl} alt="attached media" className="w-full h-full object-cover" />
                                     <button type="button" onClick={() => setCommentMediaUrl('')} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <X className="w-4 h-4" />
                                     </button>
                                  </div>
                               )}
                               <div className="relative">
                                  <input 
                                     type="text" 
                                     value={commentText}
                                     onChange={e => setCommentText(e.target.value)}
                                     placeholder="Оставьте комментарий..." 
                                     className="w-full bg-bg-card border border-border-card rounded-xl pl-4 pr-[140px] py-2.5 text-sm focus:border-blue-500/50 outline-none transition-colors" 
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                     <label className="p-2 text-zinc-400 hover:text-white cursor-pointer transition-colors" title="Прикрепить фото">
                                        <ImageIcon className="w-5 h-5" />
                                        <input type="file" accept="image/*" onChange={handleCommentMediaChange} className="hidden" />
                                     </label>
                                     <button type="submit" disabled={!commentText.trim() && !commentMediaUrl} className="text-blue-500 disabled:text-zinc-600 hover:text-blue-400 font-bold text-sm p-2 transition-colors">
                                        Отправить
                                     </button>
                                  </div>
                               </div>
                            </div>
                         </form>
                         <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {comments.length === 0 ? (
                               <p className="text-sm text-zinc-500 text-center py-4">Пока нет комментариев. Будьте первым!</p>
                            ) : comments.map((comment: any) => (
                               <div key={comment.id} className="flex gap-3">
                                  <div className="relative shrink-0">
                                     <div className={`w-8 h-8 rounded-full bg-bg-hover overflow-hidden border ${comment.isCreator ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-border-card'}`}>
                                        {comment.avatar ? <img src={comment.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{comment.username?.substring(0,2).toUpperCase()}</div>}
                                     </div>
                                     {comment.isCreator && (
                                        <div className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#11141A] z-10 pointer-events-none">
                                           <BadgeCheck className="w-2.5 h-2.5 text-white" />
                                        </div>
                                     )}
                                  </div>
                                  <div className={`flex-1 bg-bg-card rounded-2xl rounded-tl-sm p-3 border ${comment.isCreator ? 'border-amber-500/30 bg-amber-500/5' : 'border-border-card'}`}>
                                     <div className="flex items-center justify-between mb-1 opacity-80">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs font-semibold text-text-main">{comment.username}</span>
                                          {comment.isCreator && <span title="Верифицированный VIP-аккаунт" className="flex items-center"><BadgeCheck className="w-3.5 h-3.5 text-amber-500" /></span>}
                                        </div>
                                        <span className="text-[10px] text-zinc-500">{new Date(comment.timestamp || comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                     </div>
                                     {comment.text && <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{comment.text}</p>}
                                     {comment.mediaUrl && comment.mediaType === 'image' && (
                                        <div className="mt-2 rounded-lg overflow-hidden border border-border-card max-w-sm">
                                           <img src={comment.mediaUrl} alt="comment attachment" className="w-full h-auto object-contain" />
                                        </div>
                                     )}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>

                   </div>
                </div>
             </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
