import React from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
}

export function HlsPlayer({ src }: HlsPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) return;

    const hls = new Hls({
      enableWorker: true,
    });

    hls.loadSource(src);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      className="w-full h-full bg-black outline-none"
    />
  );
}
