import { api } from './client';

export const assignmentsApi = {
  create: (payload) => api.post('/api/assignments', payload),
  update: (id, payload) => api.patch(`/api/assignments/${encodeURIComponent(id)}`, payload),
};
