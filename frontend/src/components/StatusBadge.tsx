const statusColors: Record<string, string> = {
  concept: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  complete: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  retired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  // Issue statuses
  open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status] || statusColors.active}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[priority] || priorityColors.medium}`}>
      {priority}
    </span>
  );
}
