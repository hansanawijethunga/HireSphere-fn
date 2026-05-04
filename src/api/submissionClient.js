import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// ─── Circuit breaker config ───────────────────────────────────────────────────
const MAX_RETRIES        = 2;
const FAILURE_THRESHOLD  = 3;   // consecutive full-retry-exhaustion failures to open
const CIRCUIT_OPEN_MS    = 60_000; // 60 s cooldown

// Module-level state — survives re-renders, resets only on success or cooldown
let failureCount      = 0;
let circuitOpenUntil  = null; // timestamp (ms) or null

export function isCircuitOpen() {
  if (circuitOpenUntil !== null && Date.now() >= circuitOpenUntil) {
    // Cooldown elapsed — auto-heal
    failureCount     = 0;
    circuitOpenUntil = null;
  }
  return circuitOpenUntil !== null;
}

export function getCircuitOpenUntil() {
  return circuitOpenUntil;
}

function recordSuccess() {
  failureCount     = 0;
  circuitOpenUntil = null;
}

function recordFailure() {
  failureCount += 1;
  if (failureCount >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    console.warn('[SubmissionClient] Circuit opened — too many failures. Cooldown 60 s.');
  }
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const submissionClient = axios.create({
  baseURL: import.meta.env.VITE_SUBMISSION_API_URL ?? import.meta.env.VITE_API_BASE_URL,
  timeout: 5_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: circuit check + ID token injection ──────────────────
submissionClient.interceptors.request.use(async (config) => {
  if (isCircuitOpen()) {
    // Reject immediately — do not hit the network
    const err = new Error('Submission service is temporarily unavailable.');
    err.isCircuitOpen = true;
    return Promise.reject(err);
  }

  try {
    const session = await fetchAuthSession();
    const token   = session.tokens?.idToken?.toString();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // No token — server will return 401; we let it through rather than crash
  }

  return config;
});

// ── Response interceptor: success clears circuit; 5xx/timeout retries ────────
submissionClient.interceptors.response.use(
  (response) => {
    recordSuccess();
    return response;
  },
  async (error) => {
    // Circuit-open rejections pass straight through — never retry
    if (error.isCircuitOpen) return Promise.reject(error);

    const config  = error.config;
    const status  = error.response?.status;
    const isTimeout   = error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
    const isRetryable = isTimeout || (status !== undefined && status >= 500);

    // 4xx errors: surface immediately, do not count toward circuit trips
    if (!isRetryable || !config) return Promise.reject(error);

    config._retryCount = (config._retryCount ?? 0) + 1;

    if (config._retryCount > MAX_RETRIES) {
      // All retries exhausted → trip circuit breaker counter
      recordFailure();
      return Promise.reject(error);
    }

    // Exponential backoff: attempt 1 → 1 s, attempt 2 → 2 s
    const delay = 1_000 * config._retryCount;
    console.warn(`[SubmissionClient] Retry ${config._retryCount}/${MAX_RETRIES} in ${delay} ms`);
    await new Promise((r) => setTimeout(r, delay));
    return submissionClient(config);
  },
);

export default submissionClient;
