import { useState, useEffect, useRef, useCallback } from 'react';
import { activityApi } from '../api/activity';
import type { Activity } from '../types';

const POLL_INTERVAL_MS = 10_000;

export function useAgentUpdates(slug: string | undefined, watchTypes: string[]) {
  const sinceRef = useRef(new Date().toISOString());
  const watchTypesRef = useRef(watchTypes);
  watchTypesRef.current = watchTypes;

  const [updates, setUpdates] = useState<Activity[]>([]);

  const check = useCallback(async () => {
    if (!slug) return;
    try {
      const activity = await activityApi.list(slug, 20);
      const since = sinceRef.current;
      const fresh = activity.filter(
        (a) => a.actor === 'claude' && watchTypesRef.current.includes(a.entity_type) && a.created_at > since,
      );
      if (fresh.length > 0) setUpdates(fresh);
    } catch {
      // silently ignore polling errors
    }
  }, [slug]);

  useEffect(() => {
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  const dismiss = useCallback(() => {
    sinceRef.current = new Date().toISOString();
    setUpdates([]);
  }, []);

  return { hasUpdates: updates.length > 0, updates, dismiss };
}
