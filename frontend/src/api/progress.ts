import { api } from './client';
import type { ProgressEntry } from '../types';

export const progressApi = {
  list: (slug: string) => api.get<ProgressEntry[]>(`/projects/${slug}/progress`),

  create: (slug: string, data: { note: string; percentage: number; milestone_id?: number }) =>
    api.post<ProgressEntry>(`/projects/${slug}/progress`, data),
};
