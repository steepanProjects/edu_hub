import { api } from './client';

export const joinRequestsApi = {
  tutor: (userId) => api.get(`/api/join-requests/tutor?userId=${encodeURIComponent(userId)}`),
  mine: (userId) => api.get(`/api/join-requests/mine?userId=${encodeURIComponent(userId)}`),
  get: (id) => api.get(`/api/join-requests/${encodeURIComponent(id)}`),
  accept: (id, payload) => api.post(`/api/join-requests/${encodeURIComponent(id)}/accept`, payload),
  reject: (id, payload) => api.post(`/api/join-requests/${encodeURIComponent(id)}/reject`, payload),
  cancel: (id, payload) => api.post(`/api/join-requests/${encodeURIComponent(id)}/cancel`, payload)
};
