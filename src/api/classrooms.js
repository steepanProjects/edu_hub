import { api } from './client';

export const classroomsApi = {
  mine: (userId) => api.get(`/api/classrooms/mine?userId=${encodeURIComponent(userId)}`),
  join: (payload) => api.post('/api/classrooms/join', payload),
  create: (payload) => api.post('/api/classrooms/create', payload),
  delete: (id) => api.delete(`/api/classrooms/${id}`),
  leave: (payload) => api.delete('/api/classrooms/members', payload),
  full: (id, userId) => api.get(`/api/classrooms/${encodeURIComponent(id)}/full?userId=${encodeURIComponent(userId)}`)
};
