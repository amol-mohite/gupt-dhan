import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Lock, FileText, StickyNote, FolderKanban, KeyRound, Shield, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Project, Credential, DocumentItem, Note, PersonalInfo } from '@/lib/types';
import { showToast } from '@/components/Toast';
import { ServiceLogo } from '@/components/ServiceLogo';

interface SearchResults {
  projects: Project[];
  credentials: Credential[];
  documents: DocumentItem[];
  notes: Note[];
  personalInfo: PersonalInfo[];
}

interface SearchScreenProps {
  onOpenProject: (project: Project) => void;
  onOpenCredential: (cred: Credential) => void;
  onNavigate: (tab: string) => void;
}

export function SearchScreen({ onOpenProject, onOpenCredential, onNavigate }: SearchScreenProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user) {
      setResults(null);
      return;
    }
    setLoading(true);
    const term = q.trim();
    const [projRes, credRes, docRes, noteRes, piRes] = await Promise.all([
      supabase.from('projects').select('*').ilike('name', `%${term}%`),
      supabase
        .from('credentials')
        .select('*, service:services(*), project:projects(*)')
        .or(`title.ilike.%${term}%`)
        .limit(10),
      supabase.from('documents').select('*').ilike('name', `%${term}%`).limit(10),
      supabase.from('notes').select('*, project:projects(*)').ilike('title', `%${term}%`).limit(10),
      supabase.from('personal_info').select('*').ilike('title', `%${term}%`).limit(10),
    ]);

    // Also search by service name
    let creds = (credRes.data as Credential[]) || [];
    if (creds.length < 10) {
      const { data: svcCreds } = await supabase
        .from('credentials')
        .select('*, service:services(*), project:projects(*)')
        .limit(10);
      if (svcCreds) {
        const filtered = (svcCreds as Credential[]).filter(
          (c) =>
            c.service?.name?.toLowerCase().includes(term.toLowerCase()) &&
            !creds.find((existing) => existing.id === c.id)
        );
        creds = [...creds, ...filtered];
      }
    }

    setResults({
      projects: (projRes.data as Project[]) || [],
      credentials: creds,
      documents: (docRes.data as DocumentItem[]) || [],
      notes: (noteRes.data as Note[]) || [],
      personalInfo: (piRes.data as PersonalInfo[]) || [],
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const totalCount = results
    ? results.projects.length + results.credentials.length + results.documents.length + results.notes.length + results.personalInfo.length
    : 0;

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen">
      {/* Search header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your vault..."
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && !results && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Search across projects, credentials, documents, and notes.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Sensitive values are never shown in search results.
          </p>
        </div>
      )}

      {!loading && results && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No results found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try searching for a project name, service, or document.
          </p>
        </div>
      )}

      {!loading && results && totalCount > 0 && (
        <div className="space-y-6">
          {results.projects.length > 0 && (
            <ResultSection title="Projects" icon={<FolderKanban size={14} />}>
              {results.projects.map((project) => (
                <ResultItem
                  key={project.id}
                  icon={<FolderKanban size={18} style={{ color: project.color }} />}
                  title={project.name}
                  subtitle={project.description || undefined}
                  onClick={() => onOpenProject(project)}
                />
              ))}
            </ResultSection>
          )}

          {results.credentials.length > 0 && (
            <ResultSection title="Credentials" icon={<KeyRound size={14} />}>
              {results.credentials.map((cred) => (
                <ResultItem
                  key={cred.id}
                  icon={<ServiceLogo service={cred.service?.name || cred.title} size={36} />}
                  title={cred.service?.name || cred.title}
                  subtitle={cred.title + (cred.project ? ` · ${cred.project.name}` : '')}
                  badge={cred.is_sensitive ? <Lock size={12} className="text-warning-500" /> : undefined}
                  onClick={() => onOpenCredential(cred)}
                />
              ))}
            </ResultSection>
          )}

          {results.documents.length > 0 && (
            <ResultSection title="Documents" icon={<FileText size={14} />}>
              {results.documents.map((doc) => (
                <ResultItem
                  key={doc.id}
                  icon={<FileText size={18} className="text-gray-400" />}
                  title={doc.name}
                  subtitle={doc.category}
                  badge={doc.is_sensitive ? <Lock size={12} className="text-warning-500" /> : undefined}
                  onClick={() => onNavigate('documents')}
                />
              ))}
            </ResultSection>
          )}

          {results.notes.length > 0 && (
            <ResultSection title="Notes" icon={<StickyNote size={14} />}>
              {results.notes.map((note) => (
                <ResultItem
                  key={note.id}
                  icon={<StickyNote size={18} className="text-gray-400" />}
                  title={note.title}
                  subtitle={note.project?.name || undefined}
                  badge={note.is_sensitive ? <Lock size={12} className="text-warning-500" /> : undefined}
                  onClick={() => onNavigate('notes')}
                />
              ))}
            </ResultSection>
          )}

          {results.personalInfo.length > 0 && (
            <ResultSection title="Personal Vault" icon={<Shield size={14} />}>
              {results.personalInfo.map((pi) => (
                <ResultItem
                  key={pi.id}
                  icon={<Shield size={18} className="text-gray-400" />}
                  title={pi.title}
                  subtitle={pi.category}
                  badge={<Lock size={12} className="text-warning-500" />}
                  onClick={() => onNavigate('personal')}
                />
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultItem({
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
      {badge}
      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
    </button>
  );
}
