import { fetchAuthSession, signOut } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (!token) throw new Error('No auth token available');
    return { Authorization: `Bearer ${token}` };
  } catch {
    await signOut();
    throw new Error('Session expired. Please sign in again.');
  }
}

export async function apiFetch(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const { headers: extraHeaders, ...restOptions } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...extraHeaders,
    },
  });

  if (response.status === 401) {
    await signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  return response;
}
