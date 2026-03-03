import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { plansApi } from '../api/plans';
import { useApi } from '../hooks/useApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';
import type { PlanVersion } from '../types';

export function PlanEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { data: plan, loading, refresh } = useApi(() => plansApi.get(slug!), [slug]);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [dirty, setDirty] = useState(false);
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['plan']);

  useEffect(() => {
    if (plan) {
      setContent(plan.content);
      setDirty(false);
      setPreview(!!plan.content.trim());
    }
  }, [plan]);

  const handleSave = async () => {
    if (hasUpdates && !window.confirm('The agent has updated this plan since you started editing. Saving will overwrite those changes (the agent\'s version is preserved in version history). Continue?')) {
      return;
    }
    setSaving(true);
    try {
      await plansApi.update(slug!, content);
      await refresh();
      setDirty(false);
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  const loadVersions = async () => {
    const v = await plansApi.versions(slug!);
    setVersions(v);
    setShowHistory(true);
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <Breadcrumb slug={slug!} items={[{ label: 'Plan' }]} />
      {hasUpdates && <AgentUpdateBanner updates={updates} onRefresh={refresh} onDismiss={dismiss} />}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Plan</h1>
        <div className="flex items-center gap-2">
          {plan && (
            <span className="text-xs text-gray-400">v{plan.version} by {plan.updated_by}</span>
          )}
          <button
            onClick={loadVersions}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            History
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className={`px-3 py-1.5 text-sm rounded-lg ${preview ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 prose dark:prose-invert max-w-none">
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>
      ) : (
        <div>
          <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={(v) => { setContent(v); setDirty(true); }} />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); setDirty(true); }}
            className="w-full h-[calc(100vh-240px)] px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Write your project plan in Markdown..."
          />
        </div>
      )}

      {/* Version history modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowHistory(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Version History</h2>
            {versions.length === 0 ? (
              <p className="text-gray-500">No previous versions.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Version {v.version}</span>
                      <span className="text-xs text-gray-400">{v.created_by} &middot; {new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => { setContent(v.content); setDirty(true); setShowHistory(false); }}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Restore this version
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowHistory(false)} className="mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
