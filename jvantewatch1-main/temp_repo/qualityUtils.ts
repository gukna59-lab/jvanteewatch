/**
 * Video Quality Management Utilities
 * Handles quality selection, caching, and playback preferences
 */

export interface QualityOption {
  label: string;
  value: string;
  bitrate?: number;
}

export interface QualityPreference {
  animeId: string;
  preferredQuality: string;
  lastQualityUsed: string;
  timestamp: number;
}

const QUALITY_STORAGE_KEY = 'anime_quality_preferences';
const DEFAULT_QUALITY = '720';
const QUALITY_OPTIONS: QualityOption[] = [
  { label: '1080p', value: '1080', bitrate: 5000 },
  { label: '720p', value: '720', bitrate: 2500 },
  { label: '480p', value: '480', bitrate: 1000 },
];

/**
 * Get user's quality preference for a specific anime
 */
export const getQualityPreference = (animeId: string): string => {
  try {
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (!stored) return DEFAULT_QUALITY;

    const preferences: QualityPreference[] = JSON.parse(stored);
    const preference = preferences.find(p => p.animeId === animeId);
    return preference?.preferredQuality || DEFAULT_QUALITY;
  } catch (error) {
    console.error('Error reading quality preference:', error);
    return DEFAULT_QUALITY;
  }
};

/**
 * Save user's quality preference
 */
export const setQualityPreference = (animeId: string, quality: string): void => {
  try {
    let preferences: QualityPreference[] = [];
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    
    if (stored) {
      preferences = JSON.parse(stored);
    }

    const existingIndex = preferences.findIndex(p => p.animeId === animeId);
    const newPreference: QualityPreference = {
      animeId,
      preferredQuality: quality,
      lastQualityUsed: quality,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      preferences[existingIndex] = newPreference;
    } else {
      preferences.push(newPreference);
    }

    localStorage.setItem(QUALITY_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving quality preference:', error);
  }
};

/**
 * Get best available quality based on bandwidth and available options
 */
export const getBestAvailableQuality = (
  availableQualities: string[],
  preferredQuality?: string
): string => {
  if (!availableQualities || availableQualities.length === 0) {
    return DEFAULT_QUALITY;
  }

  // If preferred quality is available, use it
  if (preferredQuality && availableQualities.includes(preferredQuality)) {
    return preferredQuality;
  }

  // Default fallback: use highest available quality
  const sorted = [...availableQualities].sort((a, b) => {
    return parseInt(b) - parseInt(a);
  });

  return sorted[0];
};

/**
 * Estimate required bandwidth for quality
 */
export const getQualityBitrate = (quality: string): number => {
  const option = QUALITY_OPTIONS.find(q => q.value === quality);
  return option?.bitrate || 2500;
};

/**
 * Format quality for display
 */
export const formatQuality = (quality: string): string => {
  return `${quality}p`;
};

/**
 * Check if quality change requires buffer reset
 */
export const shouldResetBufferOnQualityChange = (
  oldQuality: string,
  newQuality: string
): boolean => {
  const oldBitrate = getQualityBitrate(oldQuality);
  const newBitrate = getQualityBitrate(newQuality);
  
  // Reset if dropping more than one quality level
  return Math.abs(oldBitrate - newBitrate) > 2000;
};

/**
 * Get quality recommendation based on network conditions
 */
export const getQualityRecommendation = (
  availableQualities: string[],
  connectionSpeed?: 'slow' | 'medium' | 'fast'
): string => {
  if (!availableQualities || availableQualities.length === 0) {
    return DEFAULT_QUALITY;
  }

  const sorted = [...availableQualities].sort((a, b) => parseInt(b) - parseInt(a));

  switch (connectionSpeed) {
    case 'slow':
      return sorted[sorted.length - 1]; // Lowest quality
    case 'medium':
      return sorted[Math.floor(sorted.length / 2)]; // Middle quality
    case 'fast':
      return sorted[0]; // Highest quality
    default:
      return DEFAULT_QUALITY;
  }
};

/**
 * Clear all quality preferences
 */
export const clearQualityPreferences = (): void => {
  try {
    localStorage.removeItem(QUALITY_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing quality preferences:', error);
  }
};

/**
 * Get all stored quality preferences
 */
export const getAllQualityPreferences = (): QualityPreference[] => {
  try {
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading quality preferences:', error);
    return [];
  }
};

export default {
  getQualityPreference,
  setQualityPreference,
  getBestAvailableQuality,
  getQualityBitrate,
  formatQuality,
  shouldResetBufferOnQualityChange,
  getQualityRecommendation,
  clearQualityPreferences,
  getAllQualityPreferences,
  QUALITY_OPTIONS,
  DEFAULT_QUALITY,
};
