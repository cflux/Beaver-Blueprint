import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/projects';
import { useApi } from '../hooks/useApi';
import { StatusBadge } from '../components/StatusBadge';
import { CreateProjectModal } from '../components/CreateProjectModal';
import type { Activity } from '../types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityText(a: Activity) {
  const details = a.details as Record<string, string> | null;
  const name = details?.name || details?.title || `#${a.entity_id}`;
  return `${a.action} ${a.entity_type} "${name}"`;
}

export function Dashboard() {
  const { data, loading, error, refresh } = useApi(() => dashboardApi.get());
  const [showCreate, setShowCreate] = useState(false);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
          <p className="text-2xl font-bold">{data.total_projects}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
          <p className="text-2xl font-bold text-green-600">{data.active_projects}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open Issues</p>
          <p className="text-2xl font-bold text-orange-600">{data.total_open_issues}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project cards */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Projects</h2>
          {data.projects.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center text-gray-500">
              No projects yet. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.projects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Updated {timeAgo(p.updated_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {data.recent_activity.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No activity yet.</p>
            ) : (
              data.recent_activity.slice(0, 10).map((a) => (
                <div key={a.id} className="p-3">
                  <p className="text-sm">{activityText(a)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {a.actor} &middot; {timeAgo(a.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />
    </div>
  );
}
