import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Maximize, Play, Pause, Settings } from 'lucide-react';
import { 
  getQualityPreference, 
  setQualityPreference, 
  getBestAvailableQuality,
  formatQuality 
} from './qualityUtils';

interface EnhancedPlayerProps {
  src: string;
  title?: string;
  animeId?: string;
  qualities?: string[];
  onQualityChange?: (quality: string) => void;
  onTimeUpdate?: (time: number) => void;
  isPlaying?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  currentTime?: number;
}

export const EnhancedPlayer: React.FC<EnhancedPlayerProps> = ({
  src,
  title = 'Anime Player',
  animeId,
  qualities = ['1080', '720', '480'],
  onQualityChange,
  onTimeUpdate,
  isPlaying = false,
  onPlayStateChange,
  currentTime = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<string>(() => {
    if (animeId) {
      const saved = getQualityPreference(animeId);
      return getBestAvailableQuality(qualities, saved);
    }
    return getBestAvailableQuality(qualities);
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(err => console.log('Play failed:', err));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentTime) return;
    
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const newState = !video.paused;
    onPlayStateChange?.(newState);
    
    if (newState) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume / 100;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    const container: any = containerRef.current;
    
    if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
    } else {
      if (container.requestFullscreen) await container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (container.mozRequestFullScreen) container.mozRequestFullScreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    if (animeId) {
      setQualityPreference(animeId, quality);
    }
    onQualityChange?.(quality);
    setShowQualityMenu(false);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    onTimeUpdate?.(newTime);
  };

  const showPlayerControls = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return duration > 0 ? ((videoRef.current?.currentTime || 0) / duration) * 100 : 0;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black group"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={showPlayerControls}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !videoRef.current?.paused && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => onPlayStateChange?.(true)}
        onPause={() => onPlayStateChange?.(false)}
      />

      {/* Player Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent pt-8 pb-4 px-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={videoRef.current?.currentTime || 0}
              onChange={handleProgressChange}
              className="w-full h-1 bg-gray-700 rounded cursor-pointer appearance-none hover:h-2 transition-all"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${getProgressPercentage()}%, #4b5563 ${getProgressPercentage()}%, #4b5563 100%)`
              }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-red-500"
              title="Play/Pause"
            >
              {videoRef.current?.paused ? (
                <Play size={20} fill="white" />
              ) : (
                <Pause size={20} fill="white" />
              )}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-red-500"
                title="Mute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded cursor-pointer appearance-none"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`
                }}
              />
              <span className="text-white text-sm w-8">{volume}%</span>
            </div>

            {/* Time Display */}
            <div className="text-white text-sm ml-4">
              {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded text-white text-sm transition-colors hover:text-red-400"
                title="Video Quality"
              >
                {formatQuality(selectedQuality)}
              </button>
              
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded shadow-lg z-50 min-w-24 border border-gray-700">
                  {qualities.map(quality => (
                    <button
                      key={quality}
                      onClick={() => handleQualityChange(quality)}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedQuality === quality
                          ? 'bg-red-500 text-white font-bold'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {formatQuality(quality)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-red-500"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-red-500"
              title="Fullscreen"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>

        {/* Title */}
        {title && (
          <div className="text-white text-sm mt-2 truncate opacity-75">
            {title}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 right-4 bg-gray-900 rounded-lg p-4 shadow-lg z-50 border border-gray-700 min-w-64">
          <h3 className="text-white font-bold mb-3">Параметры</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm">Качество видео</label>
              <p className="text-white font-semibold">{formatQuality(selectedQuality)}</p>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Громкость</label>
              <p className="text-white font-semibold">{volume}%</p>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Буфер</label>
              <p className="text-white font-semibold">{Math.round((videoRef.current?.buffered.length || 0) * 100)}%</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="mt-4 w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors text-sm"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Center Play Button */}
      {videoRef.current?.paused && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={handlePlayPause}
        >
          <button className="p-6 rounded-full bg-white/20 group-hover:bg-white/30 transition-all transform group-hover:scale-110">
            <Play size={48} fill="white" className="text-white ml-1" />
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPlayer;
