import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchAuthSession } from 'aws-amplify/auth';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const LOG = (...args) => console.log('[WebRTC]', ...args);
const ERR = (...args) => console.error('[WebRTC]', ...args);

export function useWebRTC({ bookingId, scheduledAt, durationMinutes, profileType }) {
  const [localStream, setLocalStream]           = useState(null);
  const [remoteStream, setRemoteStream]         = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError]                       = useState('');
  const [isMuted, setIsMuted]                   = useState(false);
  const [isVideoOff, setIsVideoOff]             = useState(false);

  const socketRef         = useRef(null);
  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const pendingCandidates = useRef([]);
  const didConnectRef     = useRef(false);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback((reason = 'manual') => {
    LOG('cleanup —', reason, '| didConnect:', didConnectRef.current);
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    if (pcRef.current)     { pcRef.current.close();          pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (didConnectRef.current) setConnectionStatus('ended');
    didConnectRef.current = false;
  }, []);

  // ── RTCPeerConnection factory ─────────────────────────────────────────────
  function createPeer(stream) {
    LOG('createPeer');
    const pc = new RTCPeerConnection(STUN);

    stream.getTracks().forEach((track) => {
      LOG('adding local track:', track.kind);
      pc.addTrack(track, stream);
    });

    const rs = new MediaStream();
    setRemoteStream(rs);

    pc.ontrack = (e) => {
      LOG('remote track received:', e.track.kind);
      e.streams[0]?.getTracks().forEach((t) => rs.addTrack(t));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        LOG('sending ice-candidate');
        socketRef.current?.emit('webrtc-signal', {
          bookingId,
          type: 'ice-candidate',
          data: e.candidate,
        });
      } else {
        LOG('ICE gathering complete');
      }
    };

    pc.oniceconnectionstatechange = () => LOG('ICE state:', pc.iceConnectionState);

    pc.onconnectionstatechange = () => {
      LOG('peer state:', pc.connectionState);
      const s = pc.connectionState;
      if (s === 'connected')                      setConnectionStatus('connected');
      if (s === 'disconnected' || s === 'failed') setConnectionStatus('error');
    };

    return pc;
  }

  // ── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;

    const signalingUrl = import.meta.env.VITE_SIGNALING_URL;
    LOG('init — bookingId:', bookingId, '| url:', signalingUrl);

    if (!signalingUrl) {
      ERR('VITE_SIGNALING_URL not set');
      setError('Signaling server URL is not configured.');
      setConnectionStatus('error');
      return;
    }

    let cancelled = false;

    async function start() {
      // 1. Camera + mic
      LOG('requesting media');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        LOG('media ok, tracks:', stream.getTracks().map((t) => t.kind));
      } catch (e) {
        ERR('getUserMedia failed:', e);
        if (!cancelled) setError('Camera / microphone access denied.');
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Cognito ID token (backend reads role from custom:profile_type claim)
      LOG('fetching ID token');
      let token;
      try {
        const session = await fetchAuthSession();
        token = session.tokens?.idToken?.toString();
        if (!token) throw new Error('idToken is empty');
        LOG('ID token ok, length:', token.length);
      } catch (e) {
        ERR('token fetch failed:', e);
        if (!cancelled) setError('Authentication error. Please sign in again.');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

      // 3. Socket connection
      LOG('connecting to signaling server');
      const socket = io(signalingUrl, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10_000,
      });
      socketRef.current = socket;

      socket.on('connect_error', (err) => {
        ERR('connect_error:', err.message);
        if (!cancelled) {
          setError(`Signaling connection failed: ${err.message}`);
          setConnectionStatus('error');
        }
      });

      socket.on('disconnect', (reason) => LOG('disconnected:', reason));

      socket.on('connect', () => {
        LOG('socket connected, id:', socket.id);
        didConnectRef.current = true;

        // role is NOT sent — backend reads custom:profile_type from the ID token
        const payload = { bookingId, scheduledAt, durationMinutes };
        LOG('emitting join-room:', payload);
        socket.emit('join-room', payload);
        setConnectionStatus('waiting');
      });

      // ── Room errors ────────────────────────────────────────────────────────
      socket.on('room-error', ({ code, message }) => {
        ERR('room-error — code:', code, '| message:', message);
        if (!cancelled) {
          setError(message || `Room error (${code}). Please try again.`);
          setConnectionStatus('error');
        }
      });

      // ── Participant joined (informational only) ────────────────────────────
      socket.on('participant-joined', ({ role } = {}) => {
        LOG('participant-joined — their role:', role);
      });

      // ── Participant left ───────────────────────────────────────────────────
      socket.on('participant-left', ({ role } = {}) => {
        LOG('participant-left — their role:', role);
        if (!cancelled) setConnectionStatus('waiting');
      });

      // ── Room ready — both participants present ────────────────────────────
      // Backend emits this to BOTH users with { initiatorRole }.
      // Only the user whose profileType matches initiatorRole creates the offer.
      socket.on('room-ready', async ({ initiatorRole } = {}) => {
        LOG('room-ready — initiatorRole:', initiatorRole, '| my role:', profileType);
        if (cancelled) return;

        if (profileType !== initiatorRole) {
          LOG('not the initiator — waiting for offer');
          return;
        }

        setConnectionStatus('calling');
        const pc = createPeer(stream);
        pcRef.current = pc;
        pendingCandidates.current.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
        pendingCandidates.current = [];

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          LOG('offer ready, sending');
          socket.emit('webrtc-signal', { bookingId, type: 'offer', data: offer });
        } catch (e) {
          ERR('createOffer failed:', e);
          if (!cancelled) { setError('Failed to create offer: ' + e.message); setConnectionStatus('error'); }
        }
      });

      // ── Incoming signals: offer / answer / ice-candidate ──────────────────
      socket.on('webrtc-signal', async ({ type, data, from }) => {
        LOG('webrtc-signal received — type:', type, '| from:', from);
        if (cancelled) return;

        if (type === 'offer') {
          if (profileType !== 'Candidate') {
            LOG('offer ignored — only Candidate answers offers');
            return;
          }
          setConnectionStatus('calling');
          const pc = createPeer(stream);
          pcRef.current = pc;
          pendingCandidates.current.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
          pendingCandidates.current = [];

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            LOG('answer ready, sending');
            socket.emit('webrtc-signal', { bookingId, type: 'answer', data: answer });
          } catch (e) {
            ERR('answer failed:', e);
            if (!cancelled) { setError('Failed to answer: ' + e.message); setConnectionStatus('error'); }
          }

        } else if (type === 'answer') {
          LOG('applying remote answer');
          try {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(data));
          } catch (e) {
            ERR('setRemoteDescription (answer) failed:', e);
          }

        } else if (type === 'ice-candidate') {
          const candidate = new RTCIceCandidate(data);
          if (pcRef.current?.remoteDescription) {
            LOG('adding ICE candidate');
            pcRef.current.addIceCandidate(candidate).catch((e) => ERR('addIceCandidate failed:', e));
          } else {
            LOG('buffering ICE candidate');
            pendingCandidates.current.push(candidate);
          }
        }
      });
    }

    start();

    return () => {
      LOG('effect teardown');
      cancelled = true;
      cleanup('effect-teardown');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => { LOG('muted:', !m); return !m; });
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff((v) => { LOG('videoOff:', !v); return !v; });
  }, []);

  const leaveCall = useCallback(() => {
    LOG('leaveCall');
    didConnectRef.current = true;
    cleanup('leave-call');
  }, [cleanup]);

  return { localStream, remoteStream, connectionStatus, error, isMuted, isVideoOff, toggleAudio, toggleVideo, leaveCall };
}
