import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface RutubePlayerProps {
  url: string;
  playing: boolean;
  timestamp: number;
  lastUpdateAt: number;
  isAdmin: boolean;
  onPlay: (time?: number) => void;
  onPause: (time?: number) => void;
  onSeek: (time: number) => void;
  onReportProgress: (time: number, duration?: number) => void;
}

export const RutubePlayer = forwardRef(({
  url,
  playing,
  timestamp,
  lastUpdateAt,
  isAdmin,
  onPlay,
  onPause,
  onSeek,
  onReportProgress
}: RutubePlayerProps, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const skipNextEventRef = useRef(false);
  const durationRef = useRef(0);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      currentTimeRef.current = time;
      skipNextEventRef.current = true;
      sendCommand('player:setCurrentTime', { time });
      setTimeout(() => { skipNextEventRef.current = false; }, 1000);
    },
    getCurrentTime: () => currentTimeRef.current,
    getDuration: () => durationRef.current
  }));

  useEffect(() => {
    const match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (match) {
      setVideoId(match[1]);
    } else {
      const matchEmbed = url.match(/rutube\.ru\/play\/embed\/([a-zA-Z0-9]+)/);
      if (matchEmbed) {
        setVideoId(matchEmbed[1]);
      }
    }
  }, [url]);

  const sendCommand = (type: string, data: any = {}) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type, data }), '*');
    }
  };

  const prevPlayingRef = useRef(playing);

  useEffect(() => {
    if (playing !== prevPlayingRef.current) {
      prevPlayingRef.current = playing;
      if (playing) {
        skipNextEventRef.current = true;
        sendCommand('player:play');
        setTimeout(() => { skipNextEventRef.current = false; }, 500);
      } else {
        skipNextEventRef.current = true;
        sendCommand('player:pause');
        setTimeout(() => { skipNextEventRef.current = false; }, 500);
      }
    }
  }, [playing]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('rutube.ru')) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'player:currentTime') {
          const newTime = message.data.time;
          if (isAdmin && !skipNextEventRef.current) {
            // Detect native seek by creator
            if (Math.abs(newTime - currentTimeRef.current) > 2) {
               onSeek(newTime);
            }
          }
          currentTimeRef.current = newTime;
        } else if (message.type === 'player:durationChange') {
          durationRef.current = message.data.time;
        } else if (message.type === 'player:changeState') {
          const state = message.data.state;
          if (state === 'playing') {
            isPlayingRef.current = true;
            if (isAdmin && !skipNextEventRef.current) onPlay(currentTimeRef.current);
          } else if (state === 'paused') {
            isPlayingRef.current = false;
            // When seeking or pausing
            if (isAdmin && !skipNextEventRef.current) onPause(currentTimeRef.current);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isAdmin, onPlay, onPause]);

  useEffect(() => {
    const interval = setInterval(() => {
      onReportProgress(currentTimeRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [onReportProgress]);

  // Sync with state periodically for late-joiners or drifted viewers
  useEffect(() => {
    const interval = setInterval(() => {
      const expectedTime = playing 
        ? timestamp + (Date.now() - lastUpdateAt) / 1000 
        : timestamp;
      
      const diff = Math.abs(currentTimeRef.current - expectedTime);
      
      // Viewers must sync with the room state if they deviate (prevents native seeking)
      if (diff > 3 && !isAdmin && !skipNextEventRef.current) {
        skipNextEventRef.current = true;
        sendCommand('player:setCurrentTime', { time: expectedTime });
        setTimeout(() => { skipNextEventRef.current = false; }, 1000);
      }

      // If user manually alters state natively, override them to match room
      if (playing && !isPlayingRef.current && !isAdmin) {
        sendCommand('player:play');
      } else if (!playing && isPlayingRef.current && !isAdmin) {
        sendCommand('player:pause');
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [playing, timestamp, lastUpdateAt]);

  if (!videoId) return <div className="text-white flex items-center justify-center h-full">Неверная ссылка Rutube</div>;

  return (
    <div className="w-full h-full relative">
       <iframe
          ref={iframeRef}
          src={`https://rutube.ru/play/embed/${videoId}?pver=v2`}
          className="w-full h-full"
          frameBorder="0"
          allow="clipboard-write; autoplay"
          allowFullScreen
        />
    </div>
  );
});
