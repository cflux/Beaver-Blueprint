import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issuesApi } from '../api/issues';
import { useApi } from '../hooks/useApi';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { CreateIssueModal } from '../components/CreateIssueModal';
import { Breadcrumb } from '../components/Breadcrumb';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function IssueBoard() {
  const { slug } = useParams<{ slug: string }>();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const { data: issues, loading, refresh } = useApi(
    () => issuesApi.list(slug!, { status: statusFilter || undefined, priority: priorityFilter || undefined }),
    [slug, statusFilter, priorityFilter]
  );
  const [showCreate, setShowCreate] = useState(false);
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['issue']);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <Breadcrumb slug={slug!} items={[{ label: 'Issues' }]} />
      {hasUpdates && <AgentUpdateBanner updates={updates} onRefresh={refresh} onDismiss={dismiss} />}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Issues</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          + New Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Issue list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {!issues || issues.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No issues found.</p>
        ) : (
          issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/projects/${slug}/issues/${issue.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">#{issue.id}</span>
                  <h3 className="font-medium truncate">{issue.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{issue.created_by}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(issue.created_at)}</span>
                  {issue.labels && issue.labels.length > 0 && (
                    <>
                      <span>&middot;</span>
                      {issue.labels.map((l) => (
                        <span key={l} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{l}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <PriorityBadge priority={issue.priority} />
                <StatusBadge status={issue.status} />
              </div>
            </Link>
          ))
        )}
      </div>

      <CreateIssueModal slug={slug!} open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
    </div>
  );
}
