import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Plus, Lock, MoreVertical, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { Note, Project } from '@/lib/types';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog, EmptyState } from '@/components/Dialogs';
import { showToast } from '@/components/Toast';
import { SensitiveVaultUnlock } from '@/components/PinPad';

export function NotesScreen() {
  const { user } = useAuth();
  const { isUnlocked } = useSensitiveVault();
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [addSheet, setAddSheet] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [sensitiveSheet, setSensitiveSheet] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*, project:projects(*)')
      .order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);

    const { data: projData } = await supabase.from('projects').select('*').order('name');
    if (projData) setProjects(projData as Project[]);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSave = async (data: {
    title: string;
    content: string;
    projectId: string | null;
    isSensitive: boolean;
  }) => {
    if (editNote) {
      const { error } = await supabase.from('notes').update({
        title: data.title,
        content: data.content,
        project_id: data.projectId,
        is_sensitive: data.isSensitive,
      }).eq('id', editNote.id);
      if (error) { showToast('Something went wrong while saving', 'error'); return; }
      showToast('Note updated', 'success');
    } else {
      const { error } = await supabase.from('notes').insert({
        title: data.title,
        content: data.content,
        project_id: data.projectId,
        is_sensitive: data.isSensitive,
        user_id: user?.id,
      });
      if (error) { showToast('Something went wrong while saving', 'error'); return; }
      showToast('Note created', 'success');
    }
    setAddSheet(false);
    setEditNote(null);
    loadNotes();
  };

  const handleDelete = async (note: Note) => {
    await supabase.from('notes').delete().eq('id', note.id);
    showToast('Note deleted', 'success');
    setConfirmDelete(null);
    loadNotes();
  };

  const canView = (note: Note) => !note.is_sensitive || isUnlocked;

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
        <button
          onClick={() => { setEditNote(null); setAddSheet(true); }}
          className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={28} />}
          title="No notes yet"
          message="Create secure notes for anything you don't want to forget."
          actionLabel="Add Note"
          onAction={() => setAddSheet(true)}
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <button
                  onClick={() => {
                    if (canView(note)) setViewNote(note);
                    else { setViewNote(note); setSensitiveSheet(true); }
                  }}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {note.title}
                    </p>
                    {note.is_sensitive && <Lock size={12} className="text-warning-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {canView(note) ? (note.content || 'No content') : 'Sensitive — unlock to view'}
                  </p>
                  {note.project && (
                    <span className="inline-block mt-1.5 text-xs text-primary-500 font-medium">
                      {note.project.name}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setEditNote(note); setAddSheet(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                >
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit note */}
      <BottomSheet
        open={addSheet}
        onClose={() => { setAddSheet(false); setEditNote(null); }}
        title={editNote ? 'Edit Note' : 'Add Note'}
        fullHeight
      >
        <NoteForm
          projects={projects}
          initial={editNote ? {
            title: editNote.title,
            content: editNote.content || '',
            projectId: editNote.project_id,
            isSensitive: editNote.is_sensitive,
          } : undefined}
          onSubmit={handleSave}
          onCancel={() => { setAddSheet(false); setEditNote(null); }}
        />
      </BottomSheet>

      {/* View note */}
      <BottomSheet
        open={!!viewNote && (viewNote ? canView(viewNote) : false)}
        onClose={() => setViewNote(null)}
        title={viewNote?.title}
        fullHeight
      >
        {viewNote && (
          <div className="py-2">
            {viewNote.project && (
              <span className="inline-block mb-3 text-xs text-primary-500 font-medium">
                {viewNote.project.name}
              </span>
            )}
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
              {viewNote.content || 'No content'}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setViewNote(null); setEditNote(viewNote); setAddSheet(true); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => { setConfirmDelete(viewNote); setViewNote(null); }}
                className="flex-1 py-3 rounded-xl bg-error-500 text-white font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Sensitive unlock for viewing */}
      <BottomSheet open={sensitiveSheet} onClose={() => setSensitiveSheet(false)} title="Unlock Sensitive Vault">
        <SensitiveVaultUnlock
          onUnlock={() => {
            setSensitiveSheet(false);
            showToast('Sensitive vault unlocked', 'success');
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Note"
        message={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function NoteForm({
  projects,
  initial,
  onSubmit,
  onCancel,
}: {
  projects: Project[];
  initial?: { title: string; content: string; projectId: string | null; isSensitive: boolean };
  onSubmit: (data: { title: string; content: string; projectId: string | null; isSensitive: boolean }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [projectId, setProjectId] = useState<string | null>(initial?.projectId ?? null);
  const [isSensitive, setIsSensitive] = useState(initial?.isSensitive ?? false);

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Title" value={title} onChange={setTitle} placeholder="e.g. AWS Deployment Notes" />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Write your note..."
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Project (optional)</label>
        <select
          value={projectId ?? ''}
          onChange={(e) => setProjectId(e.target.value || null)}
          className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={isSensitive}
          onChange={(e) => setIsSensitive(e.target.checked)}
          className="w-5 h-5 rounded accent-primary-500"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Sensitive</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Requires PIN to view</p>
        </div>
      </label>
      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => title.trim() && onSubmit({ title: title.trim(), content, projectId, isSensitive })}
          disabled={!title.trim()}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
      />
    </div>
  );
}
