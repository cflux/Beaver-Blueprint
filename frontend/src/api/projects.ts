import { api } from './client';
import type { Project, ProjectStats, Dashboard, Activity } from '../types';

interface ProjectList {
  projects: Project[];
  total: number;
}

export const projectsApi = {
  list: (status?: string) =>
    api.get<ProjectList>(`/projects${status ? `?status=${status}` : ''}`),

  get: (slug: string) => api.get<Project>(`/projects/${slug}`),

  create: (data: { name: string; description?: string; category: string }) =>
    api.post<Project>('/projects', data),

  update: (slug: string, data: Partial<Pick<Project, 'name' | 'description' | 'category' | 'status' | 'goal'>>) =>
    api.put<Project>(`/projects/${slug}`, data),

  categories: () => api.get<string[]>('/projects/categories'),

  delete: (slug: string) => api.del(`/projects/${slug}`),

  stats: (slug: string) => api.get<ProjectStats>(`/projects/${slug}/stats`),

  activity: (slug: string, limit = 50) =>
    api.get<Activity[]>(`/projects/${slug}/activity?limit=${limit}`),
};

export const dashboardApi = {
  get: () => api.get<Dashboard>('/dashboard'),
};

export const activityApi = {
  global: (limit = 50) => api.get<Activity[]>(`/activity?limit=${limit}`),
};
