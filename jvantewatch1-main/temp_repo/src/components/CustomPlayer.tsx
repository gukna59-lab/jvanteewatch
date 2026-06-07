import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize, Pause, Play, Settings, Volume2, VolumeX } from 'lucide-react';

interface CustomPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  qualities?: string[];
  selectedQuality?: string;
  onQualityChange?: (quality: string) => void;
}

export function CustomPlayer({
  src,
  poster,
  title,
  qualities = [],
  selectedQuality = '',
  onQualityChange,
}: CustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const [hls, setHls] = useState<Hls | null>(null);
  const [levels, setLevels] = useState<Hls['levels']>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    hls?.destroy();
    setHls(null);
    setLevels([]);
    setCurrentLevel(-1);
    setCurrentTime(0);
    setDuration(0);
    setShowControls(true);
    video.removeAttribute('src');
    video.load();

    let nextHls: Hls | null = null;
    const isHlsUrl = /\.m3u8(\?|$)/i.test(src);

    if (isHlsUrl && Hls.isSupported()) {
      nextHls = new Hls({ enableWorker: true, maxBufferLength: 30 });
      nextHls.loadSource(src);
      nextHls.attachMedia(video);
      nextHls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setLevels(data.levels);
        video.play().catch(() => undefined);
      });
      setHls(nextHls);
    } else {
      video.src = src;
      video.play().catch(() => undefined);
    }

    return () => {
      nextHls?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 2800);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const seekToPercent = (value: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = (value / 100) * duration;
  };

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      changeVolume(1);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const changeHlsLevel = (level: number) => {
    if (hls) hls.currentLevel = level;
    setCurrentLevel(level);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const hasServerQualities = qualities.length > 0 && !!onQualityChange;
  const canShowSettings = hasServerQualities || levels.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group"
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onClick={() => setShowSettings(false)}
    >
      <video
        ref={videoRef}
        poster={poster}
        title={title}
        playsInline
        className="w-full h-full object-contain"
        onClick={(event) => {
          event.stopPropagation();
          togglePlay();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
      />

      {!isPlaying && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
            <Play className="w-10 h-10 ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-16 transition-opacity duration-200 md:px-6 md:pb-5 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={Number.isFinite(progress) ? progress : 0}
          onChange={(event) => seekToPercent(Number(event.target.value))}
          className="custom-player-range mb-4 w-full"
          aria-label="Прогресс"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 md:gap-5">
            <button onClick={togglePlay} className="text-white hover:text-[#F43F5E]" title={isPlaying ? 'Пауза' : 'Воспроизвести'}>
              {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7" fill="currentColor" />}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/85 hover:text-white" title={isMuted ? 'Включить звук' : 'Выключить звук'}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                className="custom-player-range custom-player-range-volume w-20"
                aria-label="Громкость"
              />
            </div>

            <div className="text-xs font-semibold tabular-nums text-white/80 md:text-sm">
              {formatTime(currentTime)} <span className="text-white/35">/</span> {formatTime(duration)}
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {canShowSettings && (
              <button
                onClick={() => setShowSettings(value => !value)}
                className={`text-white/80 hover:text-white ${showSettings ? 'text-white' : ''}`}
                title="Качество"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}

            {showSettings && canShowSettings && (
              <div className="absolute bottom-full right-8 z-30 mb-4 min-w-32 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur">
                <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-white/45">Качество</div>
                {hasServerQualities ? qualities.map(quality => (
                  <button
                    key={quality}
                    onClick={() => {
                      onQualityChange?.(quality);
                      setShowSettings(false);
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${selectedQuality === quality ? 'bg-[#F43F5E] text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                  >
                    {quality}p
                  </button>
                )) : (
                  <>
                    <button
                      onClick={() => changeHlsLevel(-1)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${currentLevel === -1 ? 'bg-[#F43F5E] text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                    >
                      Авто
                    </button>
                    {levels.map((level, index) => (
                      <button
                        key={`${level.height}-${index}`}
                        onClick={() => changeHlsLevel(index)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${currentLevel === index ? 'bg-[#F43F5E] text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                      >
                        {level.height}p
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white" title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}>
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
