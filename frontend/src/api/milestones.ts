import { api } from './client';
import type { Milestone } from '../types';

export const milestonesApi = {
  list: (slug: string) => api.get<Milestone[]>(`/projects/${slug}/milestones`),

  create: (slug: string, data: { title: string; description?: string; due_date?: string }) =>
    api.post<Milestone>(`/projects/${slug}/milestones`, data),

  update: (slug: string, id: number, data: Partial<Pick<Milestone, 'title' | 'description' | 'due_date' | 'status'>>) =>
    api.put<Milestone>(`/projects/${slug}/milestones/${id}`, data),

  delete: (slug: string, id: number) =>
    api.del(`/projects/${slug}/milestones/${id}`),
};
