import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { progressApi } from '../api/progress';
import { milestonesApi } from '../api/milestones';
import { projectsApi } from '../api/projects';
import { useApi } from '../hooks/useApi';
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

export function ProgressView() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entries, refresh: refreshEntries } = useApi(() => progressApi.list(slug!), [slug]);
  const { data: milestones, refresh: refreshMilestones } = useApi(() => milestonesApi.list(slug!), [slug]);
  const { data: stats } = useApi(() => projectsApi.stats(slug!), [slug]);

  const [note, setNote] = useState('');
  const { hasUpdates, updates, dismiss } = useAgentUpdates(slug, ['progress', 'milestone']);
  const [percentage, setPercentage] = useState(0);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Milestone create
  const [showMilestone, setShowMilestone] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDueDate, setMsDueDate] = useState('');
  const [msCreating, setMsCreating] = useState(false);

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await progressApi.create(slug!, {
        note: note.trim(),
        percentage,
        milestone_id: milestoneId ? Number(milestoneId) : undefined,
      });
      setNote('');
      refreshEntries();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    setMsCreating(true);
    try {
      await milestonesApi.create(slug!, {
        title: msTitle.trim(),
        due_date: msDueDate || undefined,
      });
      setMsTitle('');
      setMsDueDate('');
      setShowMilestone(false);
      refreshMilestones();
    } finally {
      setMsCreating(false);
    }
  };

  const toggleMilestoneStatus = async (id: number, currentStatus: string) => {
    await milestonesApi.update(slug!, id, {
      status: currentStatus === 'open' ? 'completed' : 'open',
    });
    refreshMilestones();
  };

  const currentProgress = stats?.progress ?? (entries && entries.length > 0 ? entries[0].percentage : 0);

  return (
    <div>
      <Breadcrumb slug={slug!} items={[{ label: 'Progress' }]} />
      {hasUpdates && (
        <AgentUpdateBanner
          updates={updates}
          onRefresh={() => { refreshEntries(); refreshMilestones(); }}
          onDismiss={dismiss}
        />
      )}

      <h1 className="text-2xl font-bold mb-6">Progress</h1>

      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Overall Completion</span>
          <span className="text-lg font-bold text-primary-600">{currentProgress}%</span>
        </div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log progress form + timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Log progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3">Log Progress</h2>
            <form onSubmit={handleLogProgress} className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                placeholder="What progress was made?"
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm text-gray-500 whitespace-nowrap">Completion:</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-10 text-right">{percentage}%</span>
                </div>
                {milestones && milestones.length > 0 && (
                  <select
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="">No milestone</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                )}
                <button
                  type="submit"
                  disabled={saving || !note.trim()}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Logging...' : 'Log'}
                </button>
              </div>
            </form>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="font-semibold mb-3">Timeline</h2>
            <div className="space-y-3">
              {!entries || entries.length === 0 ? (
                <p className="text-gray-500 text-sm">No progress entries yet.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{entry.percentage}% complete</span>
                      <span className="text-xs text-gray-400">{entry.created_by} &middot; {timeAgo(entry.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{entry.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Milestones</h2>
            <button
              onClick={() => setShowMilestone(true)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {!milestones || milestones.length === 0 ? (
              <p className="text-gray-500 text-sm">No milestones yet.</p>
            ) : (
              milestones.map((ms) => (
                <div key={ms.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMilestoneStatus(ms.id, ms.status)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        ms.status === 'completed'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {ms.status === 'completed' && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${ms.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {ms.title}
                      </p>
                      {ms.due_date && (
                        <p className="text-xs text-gray-400">Due: {ms.due_date}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create milestone modal */}
          {showMilestone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMilestone(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">New Milestone</h2>
                <form onSubmit={handleCreateMilestone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={msTitle}
                      onChange={(e) => setMsTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
                    <input
                      type="date"
                      value={msDueDate}
                      onChange={(e) => setMsDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowMilestone(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button type="submit" disabled={msCreating || !msTitle.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">
                      {msCreating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
