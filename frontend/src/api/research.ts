import { api } from './client';
import type { ResearchItem } from '../types';

export const researchApi = {
  list: (slug: string) =>
    api.get<ResearchItem[]>(`/projects/${slug}/research`),

  tags: (slug: string) =>
    api.get<string[]>(`/projects/${slug}/research/tags`),

  create: (slug: string, data: { title: string; url?: string; notes?: string; tag?: string }) =>
    api.post<ResearchItem>(`/projects/${slug}/research`, data),

  update: (slug: string, id: number, data: Partial<Pick<ResearchItem, 'title' | 'url' | 'notes' | 'tag'>>) =>
    api.put<ResearchItem>(`/projects/${slug}/research/${id}`, data),

  delete: (slug: string, id: number) =>
    api.del(`/projects/${slug}/research/${id}`),

  renameTag: (slug: string, tag: string, newName: string) =>
    api.put(`/projects/${slug}/research/tags/${encodeURIComponent(tag)}`, { name: newName }),

  deleteTag: (slug: string, tag: string) =>
    api.del(`/projects/${slug}/research/tags/${encodeURIComponent(tag)}`),
};
