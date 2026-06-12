import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCOptions {
  socket: Socket | null;
  projectId: string;
}

export function useWebRTC({ socket, projectId }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
  const peerConnections = useRef<{ [id: string]: RTCPeerConnection }>({});

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);

      // We already joined the project room in useMultiplayer. 
      // If there are already peers, they will not automatically get our stream unless we offer.
      // But the signaling server emits 'peer-joined' when someone joins, so we can initiate offers then.
    } catch (err) {
      console.error('Failed to get local stream', err);
    }
  };

  const stopVoice = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setPeers({});
  };

  useEffect(() => {
    if (!socket || !localStream) return;

    const createPeerConnection = (targetSocketId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            target: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers(prev => ({
          ...prev,
          [targetSocketId]: event.streams[0]
        }));
      };

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      peerConnections.current[targetSocketId] = pc;
      return pc;
    };

    socket.on('peer-joined', async (peerId: string) => {
      console.log('Peer joined, creating offer:', peerId);
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { target: peerId, offer });
    });

    socket.on('webrtc-offer', async ({ caller, offer }) => {
      console.log('Received offer from:', caller);
      const pc = createPeerConnection(caller);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { target: caller, answer });
    });

    socket.on('webrtc-answer', async ({ caller, answer }) => {
      console.log('Received answer from:', caller);
      const pc = peerConnections.current[caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('webrtc-ice-candidate', async ({ caller, candidate }) => {
      const pc = peerConnections.current[caller];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    socket.on('peer-left', (peerId: string) => {
      if (peerConnections.current[peerId]) {
        peerConnections.current[peerId].close();
        delete peerConnections.current[peerId];
      }
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[peerId];
        return newPeers;
      });
    });

    return () => {
      socket.off('peer-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('peer-left');
    };
  }, [socket, localStream]);

  return { startVoice, stopVoice, isVoiceActive: !!localStream, peers };
}
