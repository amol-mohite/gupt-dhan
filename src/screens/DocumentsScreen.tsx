import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Lock, MoreVertical, Trash2, Download, Eye, Calendar,
  ChevronRight, Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { DocumentItem, DocumentCategory, Project } from '@/lib/types';
import { logSecurityEvent } from '@/lib/security-log';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog, EmptyState } from '@/components/Dialogs';
import { showToast } from '@/components/Toast';
import { SensitiveVaultUnlock } from '@/components/PinPad';

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'identity', label: 'Identity' },
  { value: 'banking', label: 'Banking' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'property', label: 'Property' },
  { value: 'education', label: 'Education' },
  { value: 'work', label: 'Work' },
  { value: 'legal', label: 'Legal' },
  { value: 'business', label: 'Business' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export function DocumentsScreen() {
  const { user } = useAuth();
  const { isUnlocked } = useSensitiveVault();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [addSheet, setAddSheet] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocumentItem | null>(null);
  const [sensitiveSheet, setSensitiveSheet] = useState(false);
  const [filter, setFilter] = useState<DocumentCategory | 'all'>('all');

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*, project:projects(*)')
      .order('created_at', { ascending: false });
    if (data) setDocuments(data as DocumentItem[]);

    const { data: projData } = await supabase.from('projects').select('*').order('name');
    if (projData) setProjects(projData as Project[]);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleAddDocument = async (data: {
    name: string;
    category: DocumentCategory;
    description: string;
    projectId: string | null;
    expiryDate: string | null;
    isSensitive: boolean;
    file: File | null;
  }) => {
    let filePath: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (data.file && user) {
      const ext = data.file.name.split('.').pop()?.toLowerCase() || '';
      filePath = `${user.id}/${Date.now()}-${data.file.name.replace(/\s/g, '_')}`;
      fileType = ext;
      fileSize = data.file.size;
      const { error: uploadError } = await supabase.storage
        .from('vault-documents')
        .upload(filePath, data.file);
      if (uploadError) {
        showToast('Failed to upload file', 'error');
        return;
      }
    }

    const { error } = await supabase.from('documents').insert({
      name: data.name,
      category: data.category,
      description: data.description || null,
      project_id: data.projectId,
      expiry_date: data.expiryDate,
      is_sensitive: data.isSensitive,
      file_path: filePath,
      file_type: fileType,
      file_size: fileSize,
      user_id: user?.id,
    });
    if (error) {
      showToast('Something went wrong while saving', 'error');
      return;
    }
    if (user) logSecurityEvent(user.id, 'record_created', `Document: ${data.name}`, 'document');
    showToast('Document added', 'success');
    setAddSheet(false);
    loadDocuments();
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (doc.is_sensitive && !isUnlocked) {
      setSelectedDoc(doc);
      setSensitiveSheet(true);
      return;
    }
    if (!doc.file_path) {
      showToast('No file attached', 'info');
      return;
    }
    const { data, error } = await supabase.storage.from('vault-documents').createSignedUrl(doc.file_path, 300);
    if (error || !data) {
      showToast('Could not download file', 'error');
      return;
    }
    window.open(data.signedUrl, '_blank');
    if (user) logSecurityEvent(user.id, 'document_viewed', `Viewed: ${doc.name}`, 'document', doc.id);
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (doc.file_path) {
      await supabase.storage.from('vault-documents').remove([doc.file_path]);
    }
    await supabase.from('documents').delete().eq('id', doc.id);
    if (user) logSecurityEvent(user.id, 'record_deleted', `Deleted: ${doc.name}`, 'document', doc.id);
    showToast('Document deleted', 'success');
    setConfirmDelete(null);
    loadDocuments();
  };

  const filteredDocs = filter === 'all' ? documents : documents.filter((d) => d.category === filter);

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <button
          onClick={() => setAddSheet(true)}
          className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.value}
            label={cat.label}
            active={filter === cat.value}
            onClick={() => setFilter(cat.value)}
          />
        ))}
      </div>

      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No documents yet"
          message="Upload your important documents for safekeeping."
          actionLabel="Upload Document"
          onAction={() => setAddSheet(true)}
        />
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const needsUnlock = doc.is_sensitive && !isUnlocked;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50"
              >
                <button
                  onClick={() => (needsUnlock ? handleDownload(doc) : setSelectedDoc(doc))}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    {doc.is_sensitive ? (
                      <Lock size={18} className="text-warning-500" />
                    ) : (
                      <FileText size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category}
                      {doc.expiry_date && ` · Expires ${new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                  aria-label="Download"
                >
                  <Download size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={() => setConfirmDelete(doc)}
                  className="p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                >
                  <Trash2 size={16} className="text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add document */}
      <BottomSheet open={addSheet} onClose={() => setAddSheet(false)} title="Add Document" fullHeight>
        <DocumentForm projects={projects} onSubmit={handleAddDocument} onCancel={() => setAddSheet(false)} />
      </BottomSheet>

      {/* Document detail */}
      <BottomSheet
        open={!!selectedDoc && !((selectedDoc?.is_sensitive && !isUnlocked))}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.name}
      >
        {selectedDoc && (
          <div className="space-y-4 py-2">
            <DetailRow label="Category" value={CATEGORIES.find((c) => c.value === selectedDoc.category)?.label || selectedDoc.category} />
            {selectedDoc.description && <DetailRow label="Description" value={selectedDoc.description} />}
            <DetailRow label="Uploaded" value={new Date(selectedDoc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            {selectedDoc.expiry_date && (
              <DetailRow label="Expires" value={new Date(selectedDoc.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
            )}
            {selectedDoc.file_type && <DetailRow label="File Type" value={selectedDoc.file_type.toUpperCase()} />}
            {selectedDoc.is_sensitive && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning-50 dark:bg-warning-500/10">
                <Lock size={14} className="text-warning-500" />
                <span className="text-xs text-warning-700 dark:text-warning-500 font-medium">Protected document</span>
              </div>
            )}
            {selectedDoc.file_path && (
              <button
                onClick={() => handleDownload(selectedDoc)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-500 text-white font-medium text-sm"
              >
                <Eye size={16} /> View / Download
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Sensitive unlock */}
      <BottomSheet open={sensitiveSheet} onClose={() => setSensitiveSheet(false)} title="Unlock Sensitive Vault">
        <SensitiveVaultUnlock
          onUnlock={() => {
            setSensitiveSheet(false);
            if (selectedDoc) handleDownload(selectedDoc);
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Document"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      }`}
    >
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function DocumentForm({
  projects,
  onSubmit,
  onCancel,
}: {
  projects: Project[];
  onSubmit: (data: {
    name: string;
    category: DocumentCategory;
    description: string;
    projectId: string | null;
    expiryDate: string | null;
    isSensitive: boolean;
    file: File | null;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('identity');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Document Name" value={name} onChange={setName} placeholder="e.g. PAN Card" />

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Add a note about this document..."
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

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Expiry Date (optional)</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">File</label>
        <label className="flex items-center justify-center gap-2 w-full py-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary-400 transition-colors">
          <Upload size={20} />
          <span className="text-sm font-medium">{file ? file.name : 'Choose file'}</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={isSensitive}
          onChange={(e) => setIsSensitive(e.target.checked)}
          className="w-5 h-5 rounded accent-primary-500"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Protected</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Requires PIN to view/download</p>
        </div>
      </label>

      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => name.trim() && onSubmit({
            name: name.trim(),
            category,
            description: description.trim(),
            projectId,
            expiryDate: expiryDate || null,
            isSensitive,
            file,
          })}
          disabled={!name.trim()}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          Add
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
