import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';
import { useApi } from '../hooks/useApi';
import { useSidebar } from '../context/SidebarContext';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const PROJECT_STATUSES = ['concept', 'active', 'in_progress', 'complete', 'retired'] as const;

const statusColors: Record<string, string> = {
  concept: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  complete: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  retired: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, loading, error, refresh } = useApi(() => projectsApi.get(slug!), [slug]);
  const { data: stats } = useApi(() => projectsApi.stats(slug!), [slug]);
  const { data: activity } = useApi(() => projectsApi.activity(slug!, 10), [slug]);
  const [statusOpen, setStatusOpen] = useState(false);
  const { refreshSidebar } = useSidebar();

  const handleStatusChange = async (newStatus: Project['status']) => {
    setStatusOpen(false);
    await projectsApi.update(slug!, { status: newStatus });
    await refresh();
    refreshSidebar();
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!project) return null;

  const tabs = [
    { label: 'Discovery', to: `/projects/${slug}/discovery` },
    { label: 'Plan', to: `/projects/${slug}/plan` },
    { label: 'Issues', to: `/projects/${slug}/issues` },
    { label: 'Docs', to: `/projects/${slug}/docs` },
    { label: 'Progress', to: `/projects/${slug}/progress` },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-primary-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {project.name}
            <div className="relative">
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer ${statusColors[project.status] || statusColors.concept}`}
              >
                {project.status.replace('_', ' ')}
                <span className="text-[10px]">▾</span>
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                    {PROJECT_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${s === project.status ? 'font-semibold' : ''}`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusColors[s]?.split(' ')[0]}`} />
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </h1>
          {project.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 border-b-2 border-transparent hover:border-primary-500 transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Overview content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Open Issues</p>
              <p className="text-xl font-bold">{stats?.open_issues ?? '—'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Closed Issues</p>
              <p className="text-xl font-bold">{stats?.closed_issues ?? '—'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Progress</p>
              <p className="text-xl font-bold">{stats?.progress ?? 0}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">Milestones</p>
              <p className="text-xl font-bold">{stats?.milestones_completed ?? 0}/{stats?.milestones_total ?? 0}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Overall Progress</span>
              <span className="text-gray-500">{stats?.progress ?? 0}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${stats?.progress ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Activity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Recent Activity</h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {!activity || activity.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No activity yet.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="p-3">
                  <p className="text-sm">{a.action} {a.entity_type}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.actor} &middot; {timeAgo(a.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
