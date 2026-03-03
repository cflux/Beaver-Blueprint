import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { documentsApi } from '../api/documents';
import { useApi } from '../hooks/useApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';

export function DocEditor() {
  const { slug, docSlug } = useParams<{ slug: string; docSlug: string }>();
  const { data: doc, loading, refresh } = useApi(() => documentsApi.get(slug!, docSlug!), [slug, docSlug]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['document']);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (doc) {
      setContent(doc.content);
      setTitle(doc.title);
      setDirty(false);
      setPreview(!!doc.content.trim());
    }
  }, [doc]);

  const handleSave = async () => {
    if (hasUpdates && !window.confirm('The agent has updated this document since you started editing. Saving will overwrite those changes. Continue?')) {
      return;
    }
    setSaving(true);
    try {
      await documentsApi.update(slug!, docSlug!, { content, title });
      await refresh();
      setDirty(false);
      dismiss();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!doc) return null;

  return (
    <div>
      <Breadcrumb slug={slug!} items={[
        { label: 'Docs', to: `/projects/${slug}/docs` },
        { label: doc.title },
      ]} />
      {hasUpdates && <AgentUpdateBanner updates={updates} onRefresh={refresh} onDismiss={dismiss} />}

      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{doc.category}</span>
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
            placeholder="Write document content in Markdown..."
          />
        </div>
      )}
    </div>
  );
}
