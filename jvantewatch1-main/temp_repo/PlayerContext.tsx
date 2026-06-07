/**
 * Anime Player Context Hook
 * Global state management for player and playback
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface PlayerContextType {
  // Playback state
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Video info
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;

  // Quality
  currentQuality: string;
  setCurrentQuality: (quality: string) => void;
  availableQualities: string[];
  setAvailableQualities: (qualities: string[]) => void;
  autoQuality: boolean;
  setAutoQuality: (auto: boolean) => void;

  // Subtitles
  subtitlesEnabled: boolean;
  setSubtitlesEnabled: (enabled: boolean) => void;
  currentSubtitleLanguage: string;
  setCurrentSubtitleLanguage: (lang: string) => void;
  availableSubtitles: string[];
  setAvailableSubtitles: (subs: string[]) => void;

  // Volume
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;

  // Fullscreen
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;

  // UI
  showControls: boolean;
  setShowControls: (show: boolean) => void;

  // Playback rate
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  // Episode navigation
  nextEpisodeCallback?: () => void;
  setNextEpisodeCallback: (callback: () => void) => void;
  prevEpisodeCallback?: () => void;
  setPrevEpisodeCallback: (callback: () => void) => void;

  // Anime metadata
  animeTitle: string;
  setAnimeTitle: (title: string) => void;
  episodeNumber: number;
  setEpisodeNumber: (episode: number) => void;

  // Reset
  resetPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

/**
 * Provider component
 */
export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Quality
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [autoQuality, setAutoQuality] = useState(true);

  // Subtitles
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [currentSubtitleLanguage, setCurrentSubtitleLanguage] = useState('ru');
  const [availableSubtitles, setAvailableSubtitles] = useState<string[]>([]);

  // Volume
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UI
  const [showControls, setShowControls] = useState(true);

  // Playback rate
  const [playbackRate, setPlaybackRate] = useState(1);

  // Episode navigation
  const [nextEpisodeCallback, setNextEpisodeCallback] = useState<(() => void) | undefined>();
  const [prevEpisodeCallback, setPrevEpisodeCallback] = useState<(() => void) | undefined>();

  // Anime metadata
  const [animeTitle, setAnimeTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState(1);

  const resetPlayer = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentQuality('auto');
    setAutoQuality(true);
    setVolume(80);
    setIsMuted(false);
    setIsFullscreen(false);
    setShowControls(true);
    setPlaybackRate(1);
  }, []);

  const value: PlayerContextType = {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    currentQuality,
    setCurrentQuality,
    availableQualities,
    setAvailableQualities,
    autoQuality,
    setAutoQuality,
    subtitlesEnabled,
    setSubtitlesEnabled,
    currentSubtitleLanguage,
    setCurrentSubtitleLanguage,
    availableSubtitles,
    setAvailableSubtitles,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isFullscreen,
    setIsFullscreen,
    showControls,
    setShowControls,
    playbackRate,
    setPlaybackRate,
    nextEpisodeCallback,
    setNextEpisodeCallback,
    prevEpisodeCallback,
    setPrevEpisodeCallback,
    animeTitle,
    setAnimeTitle,
    episodeNumber,
    setEpisodeNumber,
    resetPlayer
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

/**
 * Hook to use player context
 */
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};

export default PlayerContext;
