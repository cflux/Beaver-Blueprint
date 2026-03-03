import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { projectsApi } from '../api/projects';
import { researchApi } from '../api/research';
import { useApi } from '../hooks/useApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { AgentUpdateBanner } from '../components/AgentUpdateBanner';
import { useAgentUpdates } from '../hooks/useAgentUpdates';
import type { ResearchItem } from '../types';

function TagSelect({ value, onChange, existingTags }: { value: string; onChange: (v: string) => void; existingTags: string[] }) {
  const [custom, setCustom] = useState(false);

  // If current value isn't in existing tags and isn't empty, show as custom
  const isCustom = custom || (value !== '' && value !== '__new__' && !existingTags.includes(value));

  if (isCustom) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value === '__new__' ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter new tag"
          autoFocus
        />
        {existingTags.length > 0 && (
          <button
            type="button"
            onClick={() => { setCustom(false); onChange(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__new__') {
          setCustom(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <option value="">No tag</option>
      {existingTags.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
      <option value="__new__">+ New tag</option>
    </select>
  );
}

export function DiscoveryView() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, loading, refresh: refreshProject } = useApi(() => projectsApi.get(slug!), [slug]);
  const { data: items, loading: itemsLoading, refresh: refreshItems } = useApi(() => researchApi.list(slug!), [slug]);
  const { data: tags, refresh: refreshTags } = useApi(() => researchApi.tags(slug!), [slug]);

  // Goal state
  const [goal, setGoal] = useState('');
  const [goalDirty, setGoalDirty] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalPreview, setGoalPreview] = useState(false);
  const goalTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Research form state
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const formNotesRef = useRef<HTMLTextAreaElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const editNotesRef = useRef<HTMLTextAreaElement>(null);

  // Tag filter
  const [filterTag, setFilterTag] = useState('');
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['research', 'project']);

  // Tag management
  const [managingTags, setManagingTags] = useState(false);
  const [tagEdits, setTagEdits] = useState<Record<string, string>>({});
  const [tagSaving, setTagSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (project) {
      setGoal(project.goal);
      setGoalDirty(false);
      setGoalPreview(!!project.goal.trim());
    }
  }, [project]);

  const existingTags = tags || [];

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!filterTag) return items;
    return items.filter((i) => i.tag === filterTag);
  }, [items, filterTag]);

  // Group items by tag
  const groupedItems = useMemo(() => {
    const groups: Record<string, ResearchItem[]> = {};
    for (const item of filteredItems) {
      const key = item.tag || 'Untagged';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // Sort: tagged groups alphabetically, Untagged last
    const sorted: [string, ResearchItem[]][] = [];
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Untagged') return 1;
      if (b === 'Untagged') return -1;
      return a.localeCompare(b);
    });
    for (const k of keys) sorted.push([k, groups[k]]);
    return sorted;
  }, [filteredItems]);

  const handleGoalSave = async () => {
    if (hasUpdates && !window.confirm('The agent has made changes since you started editing. Saving will overwrite those changes. Continue?')) {
      return;
    }
    setGoalSaving(true);
    try {
      await projectsApi.update(slug!, { goal });
      await refreshProject();
      setGoalDirty(false);
      dismiss();
    } finally {
      setGoalSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    try {
      await researchApi.create(slug!, {
        title: formTitle,
        url: formUrl || undefined,
        notes: formNotes || undefined,
        tag: formTag || undefined,
      });
      setFormTitle('');
      setFormUrl('');
      setFormNotes('');
      setFormTag('');
      setShowForm(false);
      await refreshItems();
      await refreshTags();
    } finally {
      setFormSaving(false);
    }
  };

  const startEdit = (item: ResearchItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url || '');
    setEditNotes(item.notes);
    setEditTag(item.tag);
  };

  const handleUpdate = async (id: number) => {
    setEditSaving(true);
    try {
      await researchApi.update(slug!, id, {
        title: editTitle,
        url: editUrl || undefined,
        notes: editNotes || undefined,
        tag: editTag,
      });
      setEditingId(null);
      await refreshItems();
      await refreshTags();
    } finally {
      setEditSaving(false);
    }
  };

  const handleRenameTag = async (oldTag: string) => {
    const newTag = (tagEdits[oldTag] ?? oldTag).trim();
    if (!newTag || newTag === oldTag) return;
    setTagSaving((prev) => ({ ...prev, [oldTag]: true }));
    try {
      await researchApi.renameTag(slug!, oldTag, newTag);
      if (filterTag === oldTag) setFilterTag(newTag);
      setTagEdits((prev) => { const n = { ...prev }; delete n[oldTag]; return n; });
      await refreshItems();
      await refreshTags();
    } finally {
      setTagSaving((prev) => ({ ...prev, [oldTag]: false }));
    }
  };

  const handleDeleteTag = async (tag: string) => {
    await researchApi.deleteTag(slug!, tag);
    if (filterTag === tag) setFilterTag('');
    setTagEdits((prev) => { const n = { ...prev }; delete n[tag]; return n; });
    await refreshItems();
    await refreshTags();
  };

  const handleDelete = async (id: number) => {
    await researchApi.delete(slug!, id);
    await refreshItems();
    await refreshTags();
  };

  if (loading || itemsLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <Breadcrumb slug={slug!} items={[{ label: 'Discovery' }]} />

      <h1 className="text-2xl font-bold mb-6">Discovery</h1>
      {hasUpdates && (
        <AgentUpdateBanner
          updates={updates}
          onRefresh={() => { refreshProject(); refreshItems(); refreshTags(); }}
          onDismiss={dismiss}
        />
      )}

      {/* Goal Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Goal</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGoalPreview(!goalPreview)}
              className={`px-3 py-1.5 text-sm rounded-lg ${goalPreview ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {goalPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={handleGoalSave}
              disabled={goalSaving || !goalDirty}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {goalSaving ? 'Saving...' : 'Save Goal'}
            </button>
          </div>
        </div>

        {goalPreview ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 prose dark:prose-invert max-w-none">
            {goal ? <MarkdownRenderer>{goal}</MarkdownRenderer> : <p className="text-gray-400 italic">No goal defined yet.</p>}
          </div>
        ) : (
          <div>
            <MarkdownToolbar textareaRef={goalTextareaRef} value={goal} onChange={(v) => { setGoal(v); setGoalDirty(true); }} />
            <textarea
              ref={goalTextareaRef}
              value={goal}
              onChange={(e) => { setGoal(e.target.value); setGoalDirty(true); }}
              className="w-full h-40 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="What does success look like for this project?"
            />
          </div>
        )}
      </section>

      {/* Research Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Research</h2>
          <div className="flex items-center gap-2">
            {existingTags.length > 0 && (
              <>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All tags</option>
                  {existingTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={() => setManagingTags(!managingTags)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${managingTags ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  Edit Tags
                </button>
              </>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Add Research
            </button>
          </div>
        </div>

        {/* Tag management panel */}
        {managingTags && existingTags.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Rename or remove a tag across all research items.</p>
            <div className="space-y-2">
              {existingTags.map((tag) => (
                <div key={tag} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagEdits[tag] ?? tag}
                    onChange={(e) => setTagEdits((prev) => ({ ...prev, [tag]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => handleRenameTag(tag)}
                    disabled={tagSaving[tag] || !tagEdits[tag] || tagEdits[tag] === tag}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                  >
                    {tagSaving[tag] ? 'Saving…' : 'Rename'}
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Research item title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag</label>
                <TagSelect value={formTag} onChange={setFormTag} existingTags={existingTags} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <MarkdownToolbar textareaRef={formNotesRef} value={formNotes} onChange={setFormNotes} />
              <textarea
                ref={formNotesRef}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full h-32 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-b-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Key takeaways, relevant quotes, notes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formSaving || !formTitle.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                {formSaving ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormTitle(''); setFormUrl(''); setFormNotes(''); setFormTag(''); }}
                className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Research items grouped by tag */}
        {!items || items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
            No research items yet. Add links, notes, and references to inform your plan.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
            No research items match the selected tag.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map(([groupTag, groupItems]) => (
              <div key={groupTag}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{groupTag}</h3>
                <div className="space-y-3">
                  {groupItems.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      {editingId === item.id ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag</label>
                              <TagSelect value={editTag} onChange={setEditTag} existingTags={existingTags} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                            <input
                              type="url"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                            <MarkdownToolbar textareaRef={editNotesRef} value={editNotes} onChange={setEditNotes} />
                            <textarea
                              ref={editNotesRef}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full h-32 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-b-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(item.id)}
                              disabled={editSaving || !editTitle.trim()}
                              className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                            >
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{item.title}</h3>
                                {item.tag && (
                                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
                                >
                                  {item.url}
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-4 shrink-0">
                              <button
                                onClick={() => startEdit(item)}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {item.notes && (
                            <div className="mt-2 prose dark:prose-invert prose-sm max-w-none text-gray-600 dark:text-gray-400">
                              <MarkdownRenderer>{item.notes}</MarkdownRenderer>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">{item.created_by} &middot; {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
