import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Maximize, Play, Pause } from 'lucide-react';

interface CustomPlayerProps {
  src: string;
  title?: string;
  qualities?: string[];
  onQualityChange?: (quality: string) => void;
  onTimeUpdate?: (time: number) => void;
  isPlaying?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  currentTime?: number;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({
  src,
  title = 'Anime Player',
  qualities = ['720', '480'],
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
  const [selectedQuality, setSelectedQuality] = useState(qualities[0] || '720');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    const container: any = containerRef.current;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
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
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={videoRef.current?.currentTime || 0}
            onChange={handleProgressChange}
            className="w-full h-1 bg-gray-700 rounded cursor-pointer hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                ((videoRef.current?.currentTime || 0) / duration) * 100
              }%, #4b5563 ${((videoRef.current?.currentTime || 0) / duration) * 100}%, #4b5563 100%)`
            }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="p-2 hover:bg-white/20 rounded transition-colors text-white"
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
                className="p-2 hover:bg-white/20 rounded transition-colors text-white"
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
                className="w-20 h-1 bg-gray-600 rounded cursor-pointer"
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
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded text-white text-sm transition-colors"
                title="Quality"
              >
                {selectedQuality}p
              </button>
              
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded shadow-lg z-50 min-w-20">
                  {qualities.map(quality => (
                    <button
                      key={quality}
                      onClick={() => handleQualityChange(quality)}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedQuality === quality
                          ? 'bg-red-500 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {quality}p
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded transition-colors text-white"
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
    </div>
  );
};

export default CustomPlayer;
