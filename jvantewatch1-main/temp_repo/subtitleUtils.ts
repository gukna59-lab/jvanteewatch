/**
 * Subtitle Support for Video Player
 * Handles SRT, WebVTT, and ASS subtitle formats
 */

export interface Subtitle {
  id: string;
  language: string;
  url: string;
  format: 'srt' | 'vtt' | 'ass';
  label?: string;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleTrack {
  language: string;
  cues: SubtitleCue[];
  label?: string;
}

/**
 * Parse WebVTT subtitle format
 */
export const parseWebVTT = (content: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match timing line: HH:MM:SS.mmm --> HH:MM:SS.mmm
    const timingMatch = line.match(/(\d{1,2}:\d{2}:\d{2}.\d{3}|\d{2}:\d{2}.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}.\d{3}|\d{2}:\d{2}.\d{3})/);

    if (timingMatch) {
      const startTime = timeToSeconds(timingMatch[1]);
      const endTime = timeToSeconds(timingMatch[2]);

      // Collect text until next empty line
      let text = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        if (text) text += '\n';
        text += lines[i].trim();
        i++;
      }

      if (text) {
        cues.push({
          startTime,
          endTime,
          text: sanitizeHTML(text)
        });
      }
    }
  }

  return cues;
};

/**
 * Parse SRT subtitle format
 */
export const parseSRT = (content: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const blocks = content.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // First line is index (skip)
    // Second line is timing: HH:MM:SS,mmm --> HH:MM:SS,mmm
    const timingMatch = lines[1].match(/(\d{1,2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2},\d{3})/);

    if (timingMatch) {
      const startTime = timeToSeconds(timingMatch[1].replace(',', '.'));
      const endTime = timeToSeconds(timingMatch[2].replace(',', '.'));

      // Rest is subtitle text
      const text = lines.slice(2).join('\n').trim();

      if (text) {
        cues.push({
          startTime,
          endTime,
          text: sanitizeHTML(text)
        });
      }
    }
  }

  return cues;
};

/**
 * Parse ASS/SSA subtitle format (simplified)
 */
export const parseASS = (content: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');

  let inDialogueSection = false;

  for (const line of lines) {
    // Check for [Events] section
    if (line.includes('[Events]')) {
      inDialogueSection = true;
      continue;
    }

    if (!inDialogueSection || !line.startsWith('Dialogue:')) continue;

    // Parse dialogue line: Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const parts = line.substring(9).split(',');
    
    if (parts.length >= 10) {
      const startTime = assTimeToSeconds(parts[1].trim());
      const endTime = assTimeToSeconds(parts[2].trim());
      const text = parts.slice(9).join(',').trim();

      if (text && !isNaN(startTime) && !isNaN(endTime)) {
        cues.push({
          startTime,
          endTime,
          text: sanitizeHTML(removeASSFormatting(text))
        });
      }
    }
  }

  return cues;
};

/**
 * Convert time string (HH:MM:SS.mmm) to seconds
 */
const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Convert ASS time format (H:MM:SS.cc) to seconds
 */
const assTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2]);

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Remove ASS formatting tags
 */
const removeASSFormatting = (text: string): string => {
  // Remove color, style, and other tags
  return text
    .replace(/{[^}]*}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, ' ');
};

/**
 * Sanitize HTML in subtitle text
 */
const sanitizeHTML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Load and parse subtitle file
 */
export const loadSubtitleFile = async (url: string, format: 'srt' | 'vtt' | 'ass'): Promise<SubtitleCue[]> => {
  try {
    const response = await fetch(url);
    const content = await response.text();

    switch (format) {
      case 'vtt':
        return parseWebVTT(content);
      case 'srt':
        return parseSRT(content);
      case 'ass':
        return parseASS(content);
      default:
        return [];
    }
  } catch (error) {
    console.error(`Failed to load subtitle file from ${url}:`, error);
    return [];
  }
};

/**
 * Detect subtitle format from URL
 */
export const detectSubtitleFormat = (url: string): 'srt' | 'vtt' | 'ass' | null => {
  if (url.includes('.vtt')) return 'vtt';
  if (url.includes('.srt')) return 'srt';
  if (url.includes('.ass') || url.includes('.ssa')) return 'ass';
  return null;
};

/**
 * Find matching cue for given time
 */
export const findCueAtTime = (cues: SubtitleCue[], currentTime: number): SubtitleCue | null => {
  return cues.find(cue => currentTime >= cue.startTime && currentTime < cue.endTime) || null;
};

/**
 * Store subtitle preferences
 */
const SUBTITLE_STORAGE_KEY = 'anime_subtitle_preferences';

export interface SubtitlePreference {
  animeId: string;
  selectedLanguage: string;
  fontSize: number;
  opacity: number;
  enabled: boolean;
}

export const saveSubtitlePreference = (animeId: string, preference: SubtitlePreference): void => {
  try {
    let preferences: SubtitlePreference[] = [];
    const stored = localStorage.getItem(SUBTITLE_STORAGE_KEY);

    if (stored) {
      preferences = JSON.parse(stored);
    }

    const existingIndex = preferences.findIndex(p => p.animeId === animeId);
    if (existingIndex >= 0) {
      preferences[existingIndex] = preference;
    } else {
      preferences.push(preference);
    }

    localStorage.setItem(SUBTITLE_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving subtitle preference:', error);
  }
};

export const getSubtitlePreference = (animeId: string): SubtitlePreference | null => {
  try {
    const stored = localStorage.getItem(SUBTITLE_STORAGE_KEY);
    if (!stored) return null;

    const preferences: SubtitlePreference[] = JSON.parse(stored);
    return preferences.find(p => p.animeId === animeId) || null;
  } catch (error) {
    console.error('Error reading subtitle preference:', error);
    return null;
  }
};

export default {
  parseWebVTT,
  parseSRT,
  parseASS,
  loadSubtitleFile,
  detectSubtitleFormat,
  findCueAtTime,
  saveSubtitlePreference,
  getSubtitlePreference
};
