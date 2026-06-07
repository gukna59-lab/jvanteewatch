import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export function useVoiceChat(socket: Socket | null, roomId: string, myId: string | undefined) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Record<string, AnalyserNode>>({});

  useEffect(() => {
    if (!socket || !myId) return;

    const createPeer = (targetUserId: string, initiator: boolean) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { target: targetUserId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(e => console.error('Audio play error:', e));

        // Setup audio analyzer to detect speaking
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        
        try {
           const ctx = audioContextRef.current;
           const src = ctx.createMediaStreamSource(event.streams[0]);
           const analyser = ctx.createAnalyser();
           analyser.fftSize = 256;
           src.connect(analyser);
           analyserNodesRef.current[targetUserId] = analyser;
        } catch(e) {
           console.error("Failed to setup audio analyser", e);
        }
      };

      if (initiator) {
        pc.createOffer().then(offer => {
          return pc.setLocalDescription(offer);
        }).then(() => {
          socket.emit('webrtc_offer', { target: targetUserId, offer: pc.localDescription });
        });
      }

      peersRef.current[targetUserId] = pc;
      setPeers({ ...peersRef.current });
      return pc;
    };

    socket.on('webrtc_offer', async ({ sender, offer }) => {
      let pc = peersRef.current[sender];
      if (!pc) {
        pc = createPeer(sender, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { target: sender, answer });
    });

    socket.on('webrtc_answer', async ({ sender, answer }) => {
      const pc = peersRef.current[sender];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('webrtc_ice_candidate', async ({ sender, candidate }) => {
      const pc = peersRef.current[sender];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // When someone joins, the current users (or the new user) can initiate connections.
    // We already have 'user_joined' in Room, but we need to notify that someone turned on the mic.
    socket.on('voice_user_joined', (sender) => {
       if (isMicOn && sender !== myId) {
          createPeer(sender, true);
       }
    });

    socket.on('voice_user_left', (sender) => {
       if (peersRef.current[sender]) {
          peersRef.current[sender].close();
          delete peersRef.current[sender];
          delete analyserNodesRef.current[sender];
          setPeers({ ...peersRef.current });
          setSpeakingUsers(prev => {
             const newSet = new Set(prev);
             newSet.delete(sender);
             return newSet;
          });
       }
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('voice_user_joined');
      socket.off('voice_user_left');
    };
  }, [socket, myId, isMicOn]);

  useEffect(() => {
     let authFrame = requestAnimationFrame(checkSpeaking);
     
     function checkSpeaking() {
        if (!audioContextRef.current) {
           authFrame = requestAnimationFrame(checkSpeaking);
           return;
        }

        const newSpeaking = new Set<string>();
        const dataArray = new Uint8Array(256);

        // Check local speaking
        if (analyserNodesRef.current['local']) {
           analyserNodesRef.current['local'].getByteFrequencyData(dataArray);
           const sum = dataArray.reduce((a, b) => a + b, 0);
           const avg = sum / dataArray.length;
           if (avg > 10) newSpeaking.add(myId!);
        }

        for (const [userId, analyser] of Object.entries(analyserNodesRef.current)) {
           if (userId === 'local') continue;
           analyser.getByteFrequencyData(dataArray);
           const sum = dataArray.reduce((a, b) => a + b, 0);
           const avg = sum / dataArray.length;
           if (avg > 10) {
              newSpeaking.add(userId);
           }
        }
        
        // Only update state if it changed to avoid excessive re-renders
        setSpeakingUsers(prev => {
           if (prev.size !== newSpeaking.size) return newSpeaking;
           for (const item of newSpeaking) {
              if (!prev.has(item)) return newSpeaking;
           }
           return prev;
        });

        authFrame = requestAnimationFrame(checkSpeaking);
     }
     
     return () => cancelAnimationFrame(authFrame);
  }, [myId]);

  const toggleMic = async () => {
    if (isMicOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      socket?.emit('voice_left');
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      delete analyserNodesRef.current['local'];
      setPeers({});
      setIsMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        
        // Setup local analyser
        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        const ctx = audioContextRef.current;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserNodesRef.current['local'] = analyser;

        setIsMicOn(true);
        socket?.emit('voice_joined');
      } catch (err) {
        console.error('Failed to access microphone', err);
        alert('Не удалось получить доступ к микрофону');
      }
    }
  };

  return { isMicOn, toggleMic, speakingUsers };
}
