import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { issuesApi } from '../api/issues';
import { useApi } from '../hooks/useApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';
import type { Issue } from '../types';

export function IssueDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { data: issue, loading, error, refresh } = useApi(
    () => issuesApi.get(slug!, Number(id)),
    [slug, id]
  );
  const [editing, setEditing] = useState(false);
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['issue']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description || '');
    }
  }, [issue]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!issue) return null;

  const handleSave = async () => {
    if (hasUpdates && !window.confirm('The agent has updated this issue since you started editing. Saving will overwrite those changes. Continue?')) {
      return;
    }
    setSaving(true);
    try {
      await issuesApi.update(slug!, issue.id, { title, description });
      setEditing(false);
      await refresh();
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    await issuesApi.update(slug!, issue.id, { status: status as Issue['status'] });
    await refresh();
  };

  const handlePriorityChange = async (priority: string) => {
    await issuesApi.update(slug!, issue.id, { priority: priority as Issue['priority'] });
    await refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this issue?')) return;
    await issuesApi.delete(slug!, issue.id);
    navigate(`/projects/${slug}/issues`);
  };

  return (
    <div>
      <Breadcrumb slug={slug!} items={[
        { label: 'Issues', to: `/projects/${slug}/issues` },
        { label: `#${issue.id}` },
      ]} />
      {hasUpdates && <AgentUpdateBanner updates={updates} onRefresh={refresh} onDismiss={dismiss} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3">
          {editing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <MarkdownToolbar textareaRef={descriptionRef} value={description} onChange={setDescription} />
              <textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-700 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Description (Markdown supported)"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold">{issue.title}</h1>
                <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Edit
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 prose dark:prose-invert max-w-none">
                {issue.description ? (
                  <MarkdownRenderer>{issue.description}</MarkdownRenderer>
                ) : (
                  <p className="text-gray-400 italic">No description.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={issue.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={issue.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created by</label>
              <p className="text-sm">{issue.created_by}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
              <p className="text-sm">{new Date(issue.created_at).toLocaleString()}</p>
            </div>
            {issue.closed_at && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Closed</label>
                <p className="text-sm">{new Date(issue.closed_at).toLocaleString()}</p>
              </div>
            )}
            {issue.labels && issue.labels.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Labels</label>
                <div className="flex flex-wrap gap-1">
                  {issue.labels.map((l) => (
                    <span key={l} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
          >
            Delete Issue
          </button>
        </div>
      </div>
    </div>
  );
}
