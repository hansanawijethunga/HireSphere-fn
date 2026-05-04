import axios from 'axios';
import { io } from 'socket.io-client';
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_MESSAGING_API_URL ?? import.meta.env.VITE_API_BASE_URL;
const MAX_RETRIES = 2;

// ── Axios instance ─────────────────────────────────────────────────────────────
const messagingClient = axios.create({
  baseURL: BASE_URL,
  timeout: 5_000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Cognito ID token on every request
messagingClient.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // No session — server will 401; let it propagate naturally
  }
  return config;
});

// Retry on 5xx / timeout with exponential backoff; 4xx pass through immediately
messagingClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
    const isRetryable = isTimeout || (status !== undefined && status >= 500);

    if (!isRetryable || !config) return Promise.reject(error);

    config._retryCount = (config._retryCount ?? 0) + 1;
    if (config._retryCount > MAX_RETRIES) return Promise.reject(error);

    const delay = 1_000 * config._retryCount;
    await new Promise((r) => setTimeout(r, delay));
    return messagingClient(config);
  },
);

// ── Socket singleton ───────────────────────────────────────────────────────────
// One connection is shared across all messaging components.
// Call connectMessagingSocket() with a fresh token whenever you mount a chat.
// Call disconnectMessagingSocket() on sign-out.

let _socket = null;

export function connectMessagingSocket(token) {
  // Reuse if already connected
  if (_socket?.connected) return _socket;

  // Tear down a stale/disconnected socket before creating a new one
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(BASE_URL, {
    path: '/socket.io/messages',
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1_000,
    transports: ['websocket'],
  });

  return _socket;
}

export function disconnectMessagingSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export function getMessagingSocket() {
  return _socket;
}

export function markMessagesRead(targetUserId) {
  return messagingClient.patch(`/api/messages/${targetUserId}/read`);
}

export default messagingClient;
