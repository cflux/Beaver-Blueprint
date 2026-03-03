import type { Activity } from '../types';

interface Props {
  updates: Activity[];
  onRefresh: () => void;
  onDismiss: () => void;
}

function summarize(updates: Activity[]): string {
  const counts: Record<string, number> = {};
  for (const u of updates) {
    counts[u.entity_type] = (counts[u.entity_type] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, n]) => `${type}${n > 1 ? ` (${n})` : ''}`)
    .join(', ');
}

export function AgentUpdateBanner({ updates, onRefresh, onDismiss }: Props) {
  const handleRefresh = () => {
    onRefresh();
    onDismiss();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm">
      <span className="text-lg">🤖</span>
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        Agent updated this page — <span className="font-medium">{summarize(updates)}</span>
      </span>
      <button
        onClick={handleRefresh}
        className="px-3 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg"
      >
        Reload
      </button>
      <button
        onClick={onDismiss}
        className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-lg"
      >
        Dismiss
      </button>
    </div>
  );
}
