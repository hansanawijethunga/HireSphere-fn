import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders() {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('No auth token available');
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const { headers: extraHeaders, ...restOptions } = options;

  return fetch(`${BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...extraHeaders,
    },
  });
}
