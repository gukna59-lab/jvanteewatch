/**
 * Keyboard Controls Handler for Video Player
 * Standard hotkeys for anime streaming
 */

export interface KeyboardConfig {
  enableControls: boolean;
  customBindings?: Record<string, (player: HTMLVideoElement) => void>;
}

/**
 * Default keyboard bindings for video player
 */
export const setupKeyboardControls = (
  videoElement: HTMLVideoElement | null,
  config: KeyboardConfig = { enableControls: true }
): (() => void) => {
  if (!videoElement || !config.enableControls) return () => {};

  const handleKeyPress = (event: KeyboardEvent) => {
    // Skip if input field is focused
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const video = videoElement;
    if (!video) return;

    // Prevent default only for player-specific keys
    const playerKeys = [' ', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'm', 'f', 'p', 'n', 'c'];
    if (playerKeys.includes(event.key) || /^\d+$/.test(event.key)) {
      event.preventDefault();
    }

    switch (event.key.toLowerCase()) {
      // Play/Pause (Space or P)
      case ' ':
      case 'p':
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;

      // Seek forward (Right Arrow or D)
      case 'arrowright':
      case 'd':
        video.currentTime = Math.min(video.currentTime + 5, video.duration);
        break;

      // Seek backward (Left Arrow or A)
      case 'arrowleft':
      case 'a':
        video.currentTime = Math.max(video.currentTime - 5, 0);
        break;

      // Big forward (Ctrl + Right)
      case 'arrowright':
        if (event.ctrlKey) {
          video.currentTime = Math.min(video.currentTime + 30, video.duration);
        }
        break;

      // Big backward (Ctrl + Left)
      case 'arrowleft':
        if (event.ctrlKey) {
          video.currentTime = Math.max(video.currentTime - 30, 0);
        }
        break;

      // Volume up (Up Arrow or W)
      case 'arrowup':
      case 'w':
        video.volume = Math.min(video.volume + 0.1, 1);
        break;

      // Volume down (Down Arrow or S)
      case 'arrowdown':
      case 's':
        video.volume = Math.max(video.volume - 0.1, 0);
        break;

      // Mute (M)
      case 'm':
        video.muted = !video.muted;
        break;

      // Fullscreen (F)
      case 'f':
        const container = video.parentElement;
        if (container) {
          if (!document.fullscreenElement) {
            container.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }
        break;

      // Next episode (N)
      case 'n':
        triggerCustomEvent('nextEpisode');
        break;

      // Previous episode (P)
      case 'b':
        triggerCustomEvent('prevEpisode');
        break;

      // Toggle captions (C)
      case 'c':
        triggerCustomEvent('toggleCaptions');
        break;

      // Jump to percentage (0-9)
      if (/^\d+$/.test(event.key)) {
        const percentage = parseInt(event.key);
        video.currentTime = (percentage / 10) * video.duration;
      }
      break;
    }
  };

  document.addEventListener('keydown', handleKeyPress);

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyPress);
  };
};

/**
 * Trigger custom events for player controls
 */
const triggerCustomEvent = (eventName: string, detail?: any) => {
  const event = new CustomEvent(eventName, { detail });
  document.dispatchEvent(event);
};

/**
 * Get keyboard controls help text
 */
export const getKeyboardHelpText = (): string => {
  return `
Горячие клавиши плеера:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Пробел / P     - Воспроизведение/Пауза
→ / D          - Перемотка на 5 сек
← / A          - Возврат на 5 сек
Ctrl + → / ←   - Перемотка на 30 сек
↑ / W          - Громче
↓ / S          - Тише
M              - Без звука
F              - Полноэкран
N              - Следующая серия
B              - Предыдущая серия
C              - Субтитры
0-9            - Перейти к %% времени
  `;
};

/**
 * Create and show keyboard help overlay
 */
export const showKeyboardHelp = (): void => {
  const helpText = getKeyboardHelpText();
  alert(helpText);
};

/**
 * Gesture controls for mobile (swipe to seek, pinch to zoom)
 */
export interface GestureConfig {
  enableTouchControls: boolean;
  seekThreshold: number; // pixels to seek
}

export const setupGestureControls = (
  videoElement: HTMLVideoElement | null,
  config: GestureConfig = { enableTouchControls: true, seekThreshold: 30 }
): (() => void) => {
  if (!videoElement || !config.enableTouchControls) return () => {};

  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Horizontal swipe for seeking
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > config.seekThreshold) {
      if (diffX > 0) {
        // Swipe right - backward
        videoElement.currentTime = Math.max(videoElement.currentTime - 10, 0);
      } else {
        // Swipe left - forward
        videoElement.currentTime = Math.min(
          videoElement.currentTime + 10,
          videoElement.duration
        );
      }
    }

    // Vertical swipe for volume
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > config.seekThreshold) {
      if (diffY > 0) {
        // Swipe down - decrease volume
        videoElement.volume = Math.max(videoElement.volume - 0.2, 0);
      } else {
        // Swipe up - increase volume
        videoElement.volume = Math.min(videoElement.volume + 0.2, 1);
      }
    }
  };

  if (videoElement) {
    videoElement.addEventListener('touchstart', handleTouchStart);
    videoElement.addEventListener('touchend', handleTouchEnd);
  }

  // Return cleanup function
  return () => {
    if (videoElement) {
      videoElement.removeEventListener('touchstart', handleTouchStart);
      videoElement.removeEventListener('touchend', handleTouchEnd);
    }
  };
};

export default {
  setupKeyboardControls,
  setupGestureControls,
  getKeyboardHelpText,
  showKeyboardHelp
};
