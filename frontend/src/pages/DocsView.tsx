import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import { useApi } from '../hooks/useApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';

const categories = [
  { value: '', label: 'All' },
  { value: 'guide', label: 'Guides' },
  { value: 'api', label: 'API' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'runbook', label: 'Runbooks' },
  { value: 'other', label: 'Other' },
];

export function DocsView() {
  const { slug } = useParams<{ slug: string }>();
  const [categoryFilter, setCategoryFilter] = useState('');
  const { data: docs, loading, refresh } = useApi(
    () => documentsApi.list(slug!, categoryFilter || undefined),
    [slug, categoryFilter]
  );
  const [showCreate, setShowCreate] = useState(false);
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['document']);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [creating, setCreating] = useState(false);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await documentsApi.create(slug!, { title: newTitle.trim(), category: newCategory });
      setNewTitle('');
      setShowCreate(false);
      refresh();
    } finally {
      setCreating(false);
    }
  };

  // Group docs by category
  const grouped = (docs || []).reduce<Record<string, typeof docs>>((acc, doc) => {
    const cat = doc!.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(doc!);
    return acc;
  }, {});

  return (
    <div>
      <Breadcrumb slug={slug!} items={[{ label: 'Docs' }]} />
      {hasUpdates && <AgentUpdateBanner updates={updates} onRefresh={refresh} onDismiss={dismiss} />}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          + New Document
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              categoryFilter === cat.value
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Doc list */}
      {!docs || docs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
          No documents yet.
        </div>
      ) : (
        Object.entries(grouped).map(([category, categoryDocs]) => (
          <div key={category} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">{category}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {categoryDocs!.map((doc) => (
                <Link
                  key={doc!.id}
                  to={`/projects/${slug}/docs/${doc!.slug}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium">{doc!.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated by {doc!.updated_by} &middot; {new Date(doc!.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New Document</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="guide">Guide</option>
                  <option value="api">API</option>
                  <option value="architecture">Architecture</option>
                  <option value="runbook">Runbook</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={creating || !newTitle.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
