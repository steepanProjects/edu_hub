import { api } from './client';

export const documentsApi = {
  view: (id, userId) => api.post(`/api/documents/${encodeURIComponent(id)}/view`, { user_id: userId }),
  delete: (id) => api.delete(`/api/documents/${encodeURIComponent(id)}`),
  upload: ({ classroom_id, uploaded_by, title, description, file }) => {
    const fd = new FormData();
    fd.append('classroom_id', classroom_id);
    fd.append('uploaded_by', uploaded_by);
    fd.append('title', title);
    if (description) fd.append('description', description);
    fd.append('file', file);
    return fetch('/api/documents/upload', {
      method: 'POST',
      body: fd,
      credentials: 'include'
    }).then(async (res) => {
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const body = isJson ? await res.json() : await res.text();
      if (!res.ok) throw new Error(isJson && body && body.error ? body.error : (res.statusText || 'Upload failed'));
      return body;
    });
  },
  listViews: (id) => api.get(`/api/documents/${encodeURIComponent(id)}/views`)
};
