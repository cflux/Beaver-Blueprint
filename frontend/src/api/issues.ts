import { api } from './client';
import type { Issue } from '../types';

export const issuesApi = {
  list: (slug: string, params?: { status?: string; priority?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.priority) qs.set('priority', params.priority);
    const query = qs.toString();
    return api.get<Issue[]>(`/projects/${slug}/issues${query ? `?${query}` : ''}`);
  },

  get: (slug: string, id: number) =>
    api.get<Issue>(`/projects/${slug}/issues/${id}`),

  create: (slug: string, data: { title: string; description?: string; priority?: string; labels?: string[] }) =>
    api.post<Issue>(`/projects/${slug}/issues`, data),

  update: (slug: string, id: number, data: Partial<Pick<Issue, 'title' | 'description' | 'status' | 'priority' | 'labels'>>) =>
    api.put<Issue>(`/projects/${slug}/issues/${id}`, data),

  delete: (slug: string, id: number) =>
    api.del(`/projects/${slug}/issues/${id}`),
};
