import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useApi } from '../hooks/useApi';
import { useSidebar } from '../context/SidebarContext';

const ACTIVE_STATUSES = ['concept', 'active', 'in_progress', 'complete'] as const;

const statusColors: Record<string, string> = {
  concept: 'text-purple-600 dark:text-purple-400',
  active: 'text-green-600 dark:text-green-400',
  in_progress: 'text-yellow-600 dark:text-yellow-400',
  complete: 'text-blue-600 dark:text-blue-400',
};

export function RetiredProjects() {
  const { data, loading, error, refresh } = useApi(() => projectsApi.list('retired'), []);
  const { refreshSidebar } = useSidebar();
  const [updating, setUpdating] = useState<number | null>(null);

  const handleRestore = async (slug: string, id: number, status: string) => {
    setUpdating(id);
    try {
      await projectsApi.update(slug, { status });
      await refresh();
      refreshSidebar();
    } finally {
      setUpdating(null);
    }
  };

  const projects = data?.projects ?? [];

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-primary-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Retired Projects</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Retired Projects</h1>
        <span className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {!loading && projects.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">No retired projects.</p>
        </div>
      )}

      {projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Project</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Retired</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Restore as</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${p.slug}`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.category}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {p.description || <span className="italic text-gray-300 dark:text-gray-600">No description</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {ACTIVE_STATUSES.map((s) => (
                        <button
                          key={s}
                          disabled={updating === p.id}
                          onClick={() => handleRestore(p.slug, p.id, s)}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${statusColors[s]} border-current hover:bg-gray-100 dark:hover:bg-gray-700`}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
