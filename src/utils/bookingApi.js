import { fetchAuthSession, signOut } from 'aws-amplify/auth';

const BOOKING_API_URL = import.meta.env.VITE_BOOKING_API_URL;

// Auth-aware fetch scoped to the booking microservice's base URL.
async function bookingApiFetch(path, options = {}) {
  let token;
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.accessToken?.toString();
    if (!token) throw new Error('missing token');
  } catch {
    await signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  const { headers: extraHeaders, ...restOptions } = options;
  const response = await fetch(`${BOOKING_API_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  });

  if (response.status === 401) {
    await signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  return response;
}

/**
 * Fetch available time slots for an interviewer.
 * Unprotected endpoint — no auth header required.
 *
 * @param {string} interviewerId
 * @param {string} [date] - Optional YYYY-MM-DD filter (local date)
 * @returns {Promise<string[]>} Array of ISO-8601 UTC timestamps
 */
export async function fetchSlots(interviewerId, date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const response = await fetch(
    `${BOOKING_API_URL}/api/bookings/interviewer/${interviewerId}/slots${query}`,
  );
  if (!response.ok) throw new Error(`Failed to fetch slots: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.slots) ? data.slots : [];
}

/**
 * Create a booking. Distinguishes 400 (payment failure) and 409 (conflict)
 * from generic errors so the UI can show specific messages.
 *
 * @param {{ interviewerId: string, scheduledAt: string, paymentMethodId: string }} payload
 * @returns {Promise<Object>} Created booking record (201)
 */
export async function createBooking(payload) {
  const response = await bookingApiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message || 'This slot has already been booked. Please select another time.',
    );
  }

  if (response.status === 400) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Payment failed. Booking was not created.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Booking failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the authenticated interviewer's current availability rules.
 * Returns an empty array when no rules have been saved yet (404).
 *
 * @returns {Promise<Array>}
 */
export async function fetchAvailabilityRules() {
  const response = await bookingApiFetch('/api/bookings/rules');
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Failed to load availability: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.rules) ? data.rules : [];
}

/**
 * Persist weekly availability rules. Times must already be in UTC (HH:mm).
 *
 * @param {Array<{ dayOfWeek: number, startTime: string, endTime: string }>} rules - available days only, times in UTC HH:mm
 * @returns {Promise<Object>}
 */
/**
 * Fetch the authenticated user's own bookings.
 * Candidates  → GET /api/bookings/candidate/me
 * Interviewers → GET /api/bookings/interviewer/me
 *
 * @param {'Candidate'|'Interviewer'} profileType
 * @returns {Promise<Array>}
 */
export async function fetchMyBookings(profileType) {
  const path =
    profileType === 'Interviewer'
      ? '/api/bookings/interviewer/me'
      : '/api/bookings/candidate/me';

  const response = await bookingApiFetch(path);
  if (!response.ok) throw new Error(`Failed to load bookings: ${response.status}`);
  const data = await response.json();
  // Accept either a plain array or { bookings: [...] }
  return Array.isArray(data) ? data : (Array.isArray(data.bookings) ? data.bookings : []);
}

/**
 * Confirm or reject a booking (interviewer only).
 *
 * @param {string} bookingId
 * @param {'Confirmed'|'Rejected'} status
 * @returns {Promise<Object>} Updated booking record
 */
export async function updateBookingStatus(bookingId, status) {
  const response = await bookingApiFetch(`/api/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Failed to update booking: ${response.status}`);
  }

  return response.json();
}

export async function saveAvailabilityRules(rules) {
  const response = await bookingApiFetch('/api/bookings/rules', {
    method: 'PUT',
    body: JSON.stringify(rules),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Failed to save availability: ${response.status}`);
  }

  return response.json();
}
