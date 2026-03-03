import { api } from './client';
import type { Activity } from '../types';

export const activityApi = {
  list: (slug: string, limit = 20) =>
    api.get<Activity[]>(`/projects/${slug}/activity?limit=${limit}`),
};
