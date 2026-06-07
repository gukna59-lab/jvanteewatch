import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface VKPlayerProps {
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

export const VKPlayer = forwardRef(({
  url,
  playing,
  timestamp,
  lastUpdateAt,
  isAdmin,
  onPlay,
  onPause,
  onSeek,
  onReportProgress
}: VKPlayerProps, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [videoCode, setVideoCode] = useState<{ oid: string; id: string; hash?: string } | null>(null);
  const currentTimeRef = useRef(timestamp);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      currentTimeRef.current = time;
    },
    getCurrentTime: () => currentTimeRef.current
  }));

  useEffect(() => {
    // try to match vk.com/video-123_456
    const match = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
    if (match) {
      setVideoCode({ oid: match[1], id: match[2] });
    } else {
      // try to match video_ext.php?oid=...&id=...
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const oid = urlObj.searchParams.get('oid');
      const id = urlObj.searchParams.get('id');
      const hash = urlObj.searchParams.get('hash');
      if (oid && id) {
        setVideoCode({ oid, id, hash: hash || undefined });
      }
    }
  }, [url]);


  useEffect(() => {
    const interval = setInterval(() => {
      if (playing) {
         const expectedTime = timestamp + (Date.now() - lastUpdateAt) / 1000;
         onReportProgress(expectedTime);
      } else {
         onReportProgress(timestamp);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, timestamp, lastUpdateAt, onReportProgress]);

  if (!videoCode) return <div className="text-white flex items-center justify-center h-full">Неверная ссылка VK</div>;

  let embedUrl = `https://vk.com/video_ext.php?oid=${videoCode.oid}&id=${videoCode.id}&hd=2&autoplay=${playing ? 1 : 0}&t=${Math.floor(timestamp)}`;
  if (videoCode.hash) {
    embedUrl += `&hash=${videoCode.hash}`;
  }

  // Reload iframe completely when jump is large (manual seek)
  const [iframeKey, setIframeKey] = useState(0);
  const lastTimeRef = useRef(timestamp);
  
  useEffect(() => {
    if (Math.abs(timestamp - lastTimeRef.current) > 5) {
      setIframeKey(k => k + 1);
    }
    lastTimeRef.current = timestamp;
  }, [timestamp]);

  return (
    <div className="w-full h-full relative">
      {/* VK iframe has limited postMessage API for time sync, so we reload on major seeks */}
       <iframe
          key={iframeKey}
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
    </div>
  );
});
