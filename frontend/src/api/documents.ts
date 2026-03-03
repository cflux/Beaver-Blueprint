import { api } from './client';
import type { Document } from '../types';

export const documentsApi = {
  list: (slug: string, category?: string) =>
    api.get<Document[]>(`/projects/${slug}/docs${category ? `?category=${category}` : ''}`),

  get: (slug: string, docSlug: string) =>
    api.get<Document>(`/projects/${slug}/docs/${docSlug}`),

  create: (slug: string, data: { title: string; content?: string; category?: string }) =>
    api.post<Document>(`/projects/${slug}/docs`, data),

  update: (slug: string, docSlug: string, data: Partial<Pick<Document, 'title' | 'content' | 'category'>>) =>
    api.put<Document>(`/projects/${slug}/docs/${docSlug}`, data),

  delete: (slug: string, docSlug: string) =>
    api.del(`/projects/${slug}/docs/${docSlug}`),
};
