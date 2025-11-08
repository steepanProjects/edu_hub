import { api } from './client';

export const notificationsApi = {
  list: (userId) => api.get(`/api/notifications?userId=${encodeURIComponent(userId)}`),
  delete: (id) => api.delete(`/api/notifications/${encodeURIComponent(id)}`),
};
