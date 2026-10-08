import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Lock, ChevronRight, MoreVertical, Edit2, Trash2, Star, Copy,
  FolderKanban, Search, FolderPlus, KeyRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { Project, Credential, CredentialField, Service, FieldType } from '@/lib/types';
import { getEncryptionKey, encryptValue, decryptValue, isEncrypted } from '@/lib/crypto';
import { logSecurityEvent } from '@/lib/security-log';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog, EmptyState } from '@/components/Dialogs';
import { MaskedField } from '@/components/MaskedField';
import { showToast } from '@/components/Toast';
import { SensitiveVaultUnlock } from '@/components/PinPad';
import { ServiceLogo } from '@/components/ServiceLogo';

const PRESET_SERVICES = [
  { name: 'GitHub', icon: 'github', color: '#1f2937', website_url: 'https://github.com' },
  { name: 'Netlify', icon: 'netlify', color: '#00c7b7', website_url: 'https://netlify.com' },
  { name: 'Supabase', icon: 'supabase', color: '#3ecf8e', website_url: 'https://supabase.com' },
  { name: 'AWS', icon: 'aws', color: '#ff9900', website_url: 'https://aws.amazon.com' },
  { name: 'Bolt', icon: 'bolt', color: '#3b82f6', website_url: 'https://bolt.new' },
  { name: 'Gmail', icon: 'gmail', color: '#ea4335', website_url: 'https://gmail.com' },
  { name: 'Vercel', icon: 'vercel', color: '#000000', website_url: 'https://vercel.com' },
  { name: 'Cloudflare', icon: 'cloudflare', color: '#f38020', website_url: 'https://cloudflare.com' },
  { name: 'Figma', icon: 'figma', color: '#f24e1e', website_url: 'https://figma.com' },
  { name: 'Canva', icon: 'canva', color: '#00c4cc', website_url: 'https://canva.com' },
];

interface VaultScreenProps {
  onOpenProject: (project: Project) => void;
  onOpenCredential: (cred: Credential) => void;
}

export function VaultScreen({ onOpenProject, onOpenCredential }: VaultScreenProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [view, setView] = useState<'list' | 'project'>('list');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [addSheet, setAddSheet] = useState(false);
  const [addType, setAddType] = useState<'project' | 'credential' | null>(null);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('sort_order');
    if (data) setProjects(data as Project[]);
  }, []);

  const loadCredentials = useCallback(async () => {
    const { data } = await supabase
      .from('credentials')
      .select('*, service:services(*)')
      .order('created_at', { ascending: false });
    if (data) setCredentials(data as Credential[]);
  }, []);

  useEffect(() => {
    loadProjects();
    loadCredentials();
  }, [loadProjects, loadCredentials]);

  const projectCreds = activeProject
    ? credentials.filter((c) => c.project_id === activeProject.id)
    : [];

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    setView('project');
    onOpenProject(project);
  };

  const handleAddProject = async (name: string, description: string, color: string) => {
    const { error } = await supabase.from('projects').insert({
      name,
      description: description || null,
      color,
      user_id: user?.id,
    });
    if (error) {
      showToast('Something went wrong while saving', 'error');
      return;
    }
    showToast('Project created', 'success');
    loadProjects();
    setAddSheet(false);
    setAddType(null);
  };

  return (
    <div className="px-4 pt-6 pb-24">
      {view === 'project' && activeProject ? (
        <ProjectDetail
          project={activeProject}
          credentials={projectCreds}
          onBack={() => {
            setView('list');
            setActiveProject(null);
          }}
          onOpenCredential={onOpenCredential}
          onAddCredential={() => {
            setAddType('credential');
            setAddSheet(true);
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#d97706' }}>GuptDhan</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">Your vault</p>
            </div>
            <button
              onClick={() => {
                setAddSheet(true);
                setAddType(null);
              }}
              className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus size={22} />
            </button>
          </div>

          {/* Projects section */}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">Projects</h2>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={28} />}
              title="Your treasure chest is empty."
              message="Add your first project to get started."
              actionLabel="Add Project"
              onAction={() => {
                setAddType('project');
                setAddSheet(true);
              }}
            />
          ) : (
            <div className="space-y-2 mb-6">
              {projects.map((project) => {
                const credCount = credentials.filter((c) => c.project_id === project.id).length;
                return (
                  <button
                    key={project.id}
                    onClick={() => handleOpenProject(project)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: project.color + '20' }}
                    >
                      <FolderKanban size={20} style={{ color: project.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {credCount} {credCount === 1 ? 'service' : 'services'}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                  </button>
                );
              })}
            </div>
          )}

          {/* All credentials */}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">All Credentials</h2>
          {credentials.length === 0 ? (
            <EmptyState
              icon={<KeyRound size={28} />}
              title="Nothing hidden here yet. 🔐"
              message="Add credentials for your apps and services."
              actionLabel="Add Credential"
              onAction={() => {
                setAddType('credential');
                setAddSheet(true);
              }}
            />
          ) : (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <CredentialCard
                  key={cred.id}
                  credential={cred}
                  onOpen={() => onOpenCredential(cred)}
                  onRefresh={loadCredentials}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add bottom sheet */}
      <BottomSheet
        open={addSheet}
        onClose={() => {
          setAddSheet(false);
          setAddType(null);
        }}
        title={addType === 'project' ? 'New Project' : addType === 'credential' ? 'New Credential' : 'Add'}
      >
        {!addType && (
          <div className="space-y-2 py-2">
            <AddOption icon={<FolderPlus size={22} />} label="Project" onClick={() => setAddType('project')} />
            <AddOption icon={<KeyRound size={22} />} label="App / Service Credential" onClick={() => setAddType('credential')} />
          </div>
        )}
        {addType === 'project' && (
          <ProjectForm
            onSubmit={handleAddProject}
            onCancel={() => {
              setAddSheet(false);
              setAddType(null);
            }}
          />
        )}
        {addType === 'credential' && (
          <CredentialForm
            projects={projects}
            presetProject={activeProject}
            onSubmit={async (data) => {
              const { error } = await supabase.from('credentials').insert({
                title: data.title,
                project_id: data.projectId,
                is_sensitive: data.isSensitive,
                user_id: user?.id,
              });
              if (error) {
                showToast('Something went wrong while saving', 'error');
                return;
              }
              showToast('Credential created', 'success');
              loadCredentials();
              setAddSheet(false);
              setAddType(null);
            }}
            onCancel={() => {
              setAddSheet(false);
              setAddType(null);
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function AddOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
      <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 ml-auto" />
    </button>
  );
}

function ProjectForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, description: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Project Name" value={name} onChange={setName} placeholder="e.g. Aaditium Trades" />
      <FormInput label="Description (optional)" value={description} onChange={setDescription} placeholder="What is this project about?" />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#6b7280'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => name.trim() && onSubmit(name.trim(), description.trim(), color)}
          disabled={!name.trim()}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  );
}

function CredentialForm({
  projects,
  presetProject,
  onSubmit,
  onCancel,
  editing,
  initial,
}: {
  projects: Project[];
  presetProject?: Project | null;
  onSubmit: (data: { title: string; projectId: string | null; isSensitive: boolean }) => void;
  onCancel: () => void;
  editing?: Credential;
  initial?: { title: string; projectId: string | null; isSensitive: boolean };
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [projectId, setProjectId] = useState<string | null>(
    initial?.projectId ?? presetProject?.id ?? null
  );
  const [isSensitive, setIsSensitive] = useState(initial?.isSensitive ?? true);

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Title" value={title} onChange={setTitle} placeholder="e.g. GitHub Account" />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Project</label>
        <select
          value={projectId ?? ''}
          onChange={(e) => setProjectId(e.target.value || null)}
          className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Requires PIN to reveal fields</p>
        </div>
      </label>
      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => title.trim() && onSubmit({ title: title.trim(), projectId, isSensitive })}
          disabled={!title.trim()}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          {editing ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
  credentials,
  onBack,
  onOpenCredential,
  onAddCredential,
}: {
  project: Project;
  credentials: Credential[];
  onBack: () => void;
  onOpenCredential: (cred: Credential) => void;
  onAddCredential: () => void;
}) {
  return (
    <div className="px-4 pt-6 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 -ml-1"
      >
        <ChevronRight size={16} className="rotate-180" /> Back
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: project.color + '20', border: `2px solid ${project.color}40` }}
        >
          <FolderKanban size={26} style={{ color: project.color }} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Services ({credentials.length})
        </h2>
        <button
          onClick={onAddCredential}
          className="text-xs text-primary-500 font-medium flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {credentials.length === 0 ? (
        <EmptyState
          icon={<KeyRound size={28} />}
          title="No services yet"
          message="Add credentials for this project's services."
          actionLabel="Add Service"
          onAction={onAddCredential}
        />
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              onOpen={() => onOpenCredential(cred)}
              onRefresh={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialCard({
  credential,
  onOpen,
  onRefresh,
}: {
  credential: Credential;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const { isUnlocked } = useSensitiveVault();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sensitiveSheet, setSensitiveSheet] = useState(false);

  const toggleFavorite = async () => {
    setMenuOpen(false);
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('entity_type', 'credential')
      .eq('entity_id', credential.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
      showToast('Removed from favorites', 'info');
    } else {
      await supabase.from('favorites').insert({
        entity_type: 'credential',
        entity_id: credential.id,
        user_id: user?.id,
      });
      showToast('Added to favorites', 'success');
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('credentials').delete().eq('id', credential.id);
    if (error) {
      showToast('Something went wrong while deleting', 'error');
      return;
    }
    if (user) logSecurityEvent(user.id, 'record_deleted', `Deleted credential: ${credential.title}`, 'credential', credential.id);
    showToast('Credential deleted', 'success');
    onRefresh();
    setConfirmDelete(false);
  };

  const needsUnlock = credential.is_sensitive && !isUnlocked;

  return (
    <>
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow">
        <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <ServiceLogo service={credential.service?.name || credential.title} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {credential.service?.name || credential.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{credential.title}</p>
          </div>
          {credential.is_sensitive && <Lock size={14} className="text-warning-500 shrink-0" />}
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
        >
          <MoreVertical size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Action menu */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={credential.service?.name || credential.title}>
        <div className="space-y-1 py-2">
          <MenuAction icon={<Star size={18} />} label="Toggle Favorite" onClick={toggleFavorite} />
          <MenuAction icon={<Lock size={18} />} label="Delete" danger onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} />
        </div>
      </BottomSheet>

      <BottomSheet open={sensitiveSheet} onClose={() => setSensitiveSheet(false)} title="Unlock Sensitive Vault">
        <SensitiveVaultUnlock
          onUnlock={() => {
            setSensitiveSheet(false);
            onOpen();
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Credential"
        message={`Are you sure you want to delete "${credential.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
        danger ? 'text-error-500' : 'text-gray-900 dark:text-white'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
      />
    </div>
  );
}

export { PRESET_SERVICES };
export type { FieldType };
