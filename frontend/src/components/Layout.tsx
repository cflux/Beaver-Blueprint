import { useState, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';
import { projectsApi } from '../api/projects';
import { useApi } from '../hooks/useApi';
import { StatusBadge } from './StatusBadge';
import { SidebarContext } from '../context/SidebarContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const [dark, toggleDark] = useDarkMode();
  const location = useLocation();
  const params = useParams();
  const { data: projectList, refresh: refreshSidebar } = useApi(() => projectsApi.list(), []);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    if (!projectList) return {};
    const groups: Record<string, typeof projectList.projects> = {};
    for (const p of projectList.projects) {
      if (p.status === 'retired') continue;
      const cat = p.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    // Sort categories alphabetically
    const sorted: Record<string, typeof projectList.projects> = {};
    for (const key of Object.keys(groups).sort()) {
      sorted[key] = groups[key];
    }
    return sorted;
  }, [projectList]);

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const activeSlug = params.slug || location.pathname.split('/projects/')[1]?.split('/')[0];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-600 dark:text-primary-400">
            <span className="text-2xl">🦫</span>
            Beaver Blueprint
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <span>▦</span>
            Dashboard
          </Link>

          {/* Retired projects link */}
          <Link
            to="/retired"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-2 ${
              location.pathname === '/retired'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-700'
            }`}
          >
            <span>⊘</span>
            Retired Projects
          </Link>

          {/* Project categories */}
          {Object.entries(grouped).map(([category, projects]) => (
            <div key={category} className="mt-3">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span className="truncate">{category}</span>
                <span className="text-[10px] ml-1">{collapsed[category] ? '▸' : '▾'}</span>
              </button>
              {!collapsed[category] && (
                <div className="mt-0.5 space-y-0.5">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.slug}`}
                      className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        activeSlug === p.slug
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <StatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleDark}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {dark ? '☀ Light mode' : '☾ Dark mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <SidebarContext.Provider value={{ refreshSidebar }}>
            {children}
          </SidebarContext.Provider>
        </div>
      </main>
    </div>
  );
}
