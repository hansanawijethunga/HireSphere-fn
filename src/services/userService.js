import { apiFetch } from '../utils/api';

export const getProfile = () =>
  apiFetch('/api/users/profile');

export const syncUser = () =>
  apiFetch('/api/users/sync', { method: 'POST' });

export const updateProfile = (data) =>
  apiFetch('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
