import { api } from './client';

export const quizzesApi = {
  create: (payload) => api.post('/api/quizzes', payload),
};
