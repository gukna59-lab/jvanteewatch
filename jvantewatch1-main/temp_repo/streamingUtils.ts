/**
 * Adaptive Streaming Utilities
 * Supports seamless quality switching for HLS/DASH streams
 */

export interface StreamingQuality {
  resolution: string;
  bandwidth: number;
  url: string;
  bitrate: string;
}

export interface StreamingManifest {
  type: 'hls' | 'dash' | 'direct';
  url: string;
  qualities: StreamingQuality[];
  duration?: number;
}

/**
 * Parse HLS M3U8 manifest and extract quality options
 */
export const parseHLSManifest = (manifestContent: string): StreamingQuality[] => {
  const qualities: StreamingQuality[] = [];
  const lines = manifestContent.split('\n');
  
  let currentResolution = '';
  let currentBandwidth = 0;
  let currentBitrate = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse EXT-X-STREAM-INF for quality info
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
      
      if (resMatch) {
        currentResolution = resMatch[1];
        const height = parseInt(resMatch[1].split('x')[1]);
        currentBitrate = `${height}p`;
      }
      if (bandwidthMatch) {
        currentBandwidth = parseInt(bandwidthMatch[1]);
      }
    } else if (line && !line.startsWith('#') && currentResolution) {
      // Next line should be the URL
      qualities.push({
        resolution: currentResolution,
        bandwidth: currentBandwidth,
        url: line,
        bitrate: currentBitrate
      });
      currentResolution = '';
    }
  }

  return qualities;
};

/**
 * Detect streaming type from URL
 */
export const detectStreamingType = (url: string): StreamingManifest['type'] => {
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mpd')) return 'dash';
  return 'direct';
};

/**
 * Get quality label from resolution height
 */
export const getQualityLabel = (resolution: string | number): string => {
  const height = typeof resolution === 'string' 
    ? parseInt(resolution.split('x')[1]) 
    : resolution;
  
  if (height >= 2160) return '4K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return 'SD';
};

/**
 * Get recommended quality based on bandwidth
 */
export const getRecommendedQuality = (
  qualities: StreamingQuality[],
  estimatedBandwidth: number
): StreamingQuality | null => {
  // Filter qualities that fit within bandwidth (with 20% margin)
  const suitable = qualities.filter(q => q.bandwidth < estimatedBandwidth * 0.8);
  
  if (suitable.length === 0) {
    // Return lowest quality if none fit
    return qualities.reduce((prev, curr) => 
      curr.bandwidth < prev.bandwidth ? curr : prev
    );
  }

  // Return highest suitable quality
  return suitable.reduce((prev, curr) => 
    curr.bandwidth > prev.bandwidth ? curr : prev
  );
};

/**
 * Check if HLS variant supports seamless switching
 */
export const supportsSeamlessSwitching = (manifestContent: string): boolean => {
  // Check for INDEPENDENT-SEGMENTS tag (allows seamless switching)
  return manifestContent.includes('#EXT-X-INDEPENDENT-SEGMENTS');
};

/**
 * Extract duration from HLS manifest
 */
export const extractDurationFromHLS = (manifestContent: string): number => {
  const durationMatch = manifestContent.match(/#EXT-X-TARGETDURATION:(\d+)/);
  const playlistDuration = manifestContent.match(/#EXT-X-PLAYLIST-DURATION:([0-9.]+)/);
  
  if (playlistDuration) {
    return parseFloat(playlistDuration[1]);
  }
  if (durationMatch) {
    return parseInt(durationMatch[1]);
  }
  return 0;
};

/**
 * Normalize quality strings for comparison
 */
export const normalizeQuality = (quality: string): string => {
  return quality.toLowerCase().replace(/[^\d]/g, '');
};

/**
 * Cache streaming manifest data
 */
const manifestCache = new Map<string, { data: StreamingManifest; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cacheManifest = (url: string, manifest: StreamingManifest): void => {
  manifestCache.set(url, {
    data: manifest,
    timestamp: Date.now()
  });
};

export const getCachedManifest = (url: string): StreamingManifest | null => {
  const cached = manifestCache.get(url);
  
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    manifestCache.delete(url);
    return null;
  }
  
  return cached.data;
};

/**
 * Estimate bandwidth from video playback metrics
 */
export const estimateBandwidth = (
  bytesLoaded: number,
  timeElapsed: number
): number => {
  if (timeElapsed === 0) return 0;
  // Convert to bits per second
  return (bytesLoaded * 8) / timeElapsed;
};

/**
 * Format bandwidth for display
 */
export const formatBandwidth = (bandwidth: number): string => {
  if (bandwidth >= 1000000) {
    return `${(bandwidth / 1000000).toFixed(1)} Mbps`;
  }
  if (bandwidth >= 1000) {
    return `${(bandwidth / 1000).toFixed(1)} Kbps`;
  }
  return `${bandwidth.toFixed(0)} bps`;
};

export default {
  parseHLSManifest,
  detectStreamingType,
  getQualityLabel,
  getRecommendedQuality,
  supportsSeamlessSwitching,
  extractDurationFromHLS,
  normalizeQuality,
  cacheManifest,
  getCachedManifest,
  estimateBandwidth,
  formatBandwidth
};
