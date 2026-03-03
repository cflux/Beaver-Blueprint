import { api } from './client';
import type { Plan, PlanVersion } from '../types';

export const plansApi = {
  get: (slug: string) => api.get<Plan>(`/projects/${slug}/plan`),

  update: (slug: string, content: string, updated_by = 'human') =>
    api.put<Plan>(`/projects/${slug}/plan`, { content, updated_by }),

  versions: (slug: string) =>
    api.get<PlanVersion[]>(`/projects/${slug}/plan/versions`),
};
