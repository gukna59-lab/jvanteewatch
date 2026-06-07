/**
 * Watch History and Progress Tracking
 * Saves episode progress and watch history
 */

export interface WatchProgress {
  animeId: string;
  episode: number;
  progress: number; // 0-100
  currentTime: number;
  duration: number;
  timestamp: number;
}

export interface WatchHistoryItem {
  animeId: string;
  animeName: string;
  posterUrl?: string;
  lastWatchedEpisode: number;
  lastWatchedTime: number;
  totalEpisodesWatched: number;
  timestamp: number;
}

const WATCH_PROGRESS_KEY = 'anime_watch_progress';
const WATCH_HISTORY_KEY = 'anime_watch_history';

/**
 * Save watch progress for an episode
 */
export const saveWatchProgress = (
  animeId: string,
  episode: number,
  currentTime: number,
  duration: number
): void => {
  try {
    let progress: WatchProgress[] = [];
    const stored = localStorage.getItem(WATCH_PROGRESS_KEY);

    if (stored) {
      progress = JSON.parse(stored);
    }

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const existingIndex = progress.findIndex(
      p => p.animeId === animeId && p.episode === episode
    );

    const newProgress: WatchProgress = {
      animeId,
      episode,
      progress: progressPercent,
      currentTime,
      duration,
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      progress[existingIndex] = newProgress;
    } else {
      progress.push(newProgress);
    }

    localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving watch progress:', error);
  }
};

/**
 * Get watch progress for an episode
 */
export const getWatchProgress = (animeId: string, episode: number): WatchProgress | null => {
  try {
    const stored = localStorage.getItem(WATCH_PROGRESS_KEY);
    if (!stored) return null;

    const progress: WatchProgress[] = JSON.parse(stored);
    return progress.find(p => p.animeId === animeId && p.episode === episode) || null;
  } catch (error) {
    console.error('Error reading watch progress:', error);
    return null;
  }
};

/**
 * Get all watch progress for an anime
 */
export const getAnimeWatchProgress = (animeId: string): WatchProgress[] => {
  try {
    const stored = localStorage.getItem(WATCH_PROGRESS_KEY);
    if (!stored) return [];

    const progress: WatchProgress[] = JSON.parse(stored);
    return progress.filter(p => p.animeId === animeId);
  } catch (error) {
    console.error('Error reading anime watch progress:', error);
    return [];
  }
};

/**
 * Add to watch history
 */
export const addToWatchHistory = (
  animeId: string,
  animeName: string,
  episode: number,
  posterUrl?: string
): void => {
  try {
    let history: WatchHistoryItem[] = [];
    const stored = localStorage.getItem(WATCH_HISTORY_KEY);

    if (stored) {
      history = JSON.parse(stored);
    }

    const existingIndex = history.findIndex(h => h.animeId === animeId);

    if (existingIndex >= 0) {
      history[existingIndex] = {
        ...history[existingIndex],
        lastWatchedEpisode: episode,
        lastWatchedTime: Date.now(),
        totalEpisodesWatched: Math.max(
          history[existingIndex].totalEpisodesWatched,
          episode
        ),
        timestamp: Date.now()
      };
    } else {
      history.push({
        animeId,
        animeName,
        posterUrl,
        lastWatchedEpisode: episode,
        lastWatchedTime: Date.now(),
        totalEpisodesWatched: episode,
        timestamp: Date.now()
      });
    }

    // Keep only last 100 items
    if (history.length > 100) {
      history.sort((a, b) => b.timestamp - a.timestamp);
      history = history.slice(0, 100);
    }

    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error adding to watch history:', error);
  }
};

/**
 * Get watch history
 */
export const getWatchHistory = (): WatchHistoryItem[] => {
  try {
    const stored = localStorage.getItem(WATCH_HISTORY_KEY);
    if (!stored) return [];

    const history: WatchHistoryItem[] = JSON.parse(stored);
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error reading watch history:', error);
    return [];
  }
};

/**
 * Get continue watching list (recently watched anime)
 */
export const getContinueWatchingList = (limit: number = 10): WatchHistoryItem[] => {
  const history = getWatchHistory();
  return history.slice(0, limit);
};

/**
 * Remove item from watch history
 */
export const removeFromWatchHistory = (animeId: string): void => {
  try {
    const stored = localStorage.getItem(WATCH_HISTORY_KEY);
    if (!stored) return;

    let history: WatchHistoryItem[] = JSON.parse(stored);
    history = history.filter(h => h.animeId !== animeId);

    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error removing from watch history:', error);
  }
};

/**
 * Clear entire watch history
 */
export const clearWatchHistory = (): void => {
  try {
    localStorage.removeItem(WATCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing watch history:', error);
  }
};

/**
 * Clear watch progress for specific anime
 */
export const clearAnimeProgress = (animeId: string): void => {
  try {
    const stored = localStorage.getItem(WATCH_PROGRESS_KEY);
    if (!stored) return;

    let progress: WatchProgress[] = JSON.parse(stored);
    progress = progress.filter(p => p.animeId !== animeId);

    localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error clearing anime progress:', error);
  }
};

/**
 * Get watch stats for an anime
 */
export const getAnimeWatchStats = (animeId: string) => {
  const progress = getAnimeWatchProgress(animeId);
  const history = getWatchHistory();
  const animeHistory = history.find(h => h.animeId === animeId);

  return {
    totalEpisodesWatched: animeHistory?.totalEpisodesWatched || 0,
    lastWatchedEpisode: animeHistory?.lastWatchedEpisode || 0,
    lastWatchedTime: animeHistory?.lastWatchedTime || 0,
    episodeProgress: progress
  };
};

/**
 * Export watch data as JSON
 */
export const exportWatchData = (): string => {
  try {
    const progress = localStorage.getItem(WATCH_PROGRESS_KEY) || '[]';
    const history = localStorage.getItem(WATCH_HISTORY_KEY) || '[]';

    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      watchProgress: JSON.parse(progress),
      watchHistory: JSON.parse(history)
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error exporting watch data:', error);
    return '';
  }
};

/**
 * Import watch data from JSON
 */
export const importWatchData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);

    if (data.version !== '1.0') {
      console.warn('Unsupported watch data version');
      return false;
    }

    localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(data.watchProgress || []));
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(data.watchHistory || []));

    return true;
  } catch (error) {
    console.error('Error importing watch data:', error);
    return false;
  }
};

export default {
  saveWatchProgress,
  getWatchProgress,
  getAnimeWatchProgress,
  addToWatchHistory,
  getWatchHistory,
  getContinueWatchingList,
  removeFromWatchHistory,
  clearWatchHistory,
  clearAnimeProgress,
  getAnimeWatchStats,
  exportWatchData,
  importWatchData
};
