import { useState, useEffect, useCallback } from 'react';
import { Search, Lock, FileText, StickyNote, Shield, Star, ChevronRight, Clock, Plus, FolderKanban } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { Project, Credential, DocumentItem, Favorite } from '@/lib/types';
import { LogoMark } from '@/components/Logo';
import { ServiceLogo } from '@/components/ServiceLogo';
import { SensitiveVaultUnlock } from '@/components/PinPad';
import { BottomSheet } from '@/components/BottomSheet';
import { showToast } from '@/components/Toast';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  onOpenProject: (project: Project) => void;
  onOpenCredential: (cred: Credential) => void;
  onOpenSearch: () => void;
}

export function HomeScreen({ onNavigate, onOpenProject, onOpenCredential, onOpenSearch }: HomeScreenProps) {
  const { user, profile } = useAuth();
  const { isUnlocked, timeRemaining, unlock, hasPin } = useSensitiveVault();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentCreds, setRecentCreds] = useState<Credential[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<DocumentItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteCreds, setFavoriteCreds] = useState<Credential[]>([]);
  const [sensitiveSheet, setSensitiveSheet] = useState(false);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const loadData = useCallback(async () => {
    if (!user) return;
    const [projRes, credRes, docRes, favRes] = await Promise.all([
      supabase.from('projects').select('*').order('sort_order').limit(5),
      supabase.from('credentials').select('*, service:services(*), project:projects(*)').order('created_at', { ascending: false }).limit(5),
      supabase.from('documents').select('*').not('expiry_date', 'is', null).order('expiry_date', { ascending: true }).limit(5),
      supabase.from('favorites').select('*').eq('entity_type', 'credential'),
    ]);

    if (projRes.data) setProjects(projRes.data as Project[]);
    if (credRes.data) setRecentCreds(credRes.data as Credential[]);
    if (docRes.data) {
      const now = new Date();
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      setExpiringDocs((docRes.data as DocumentItem[]).filter((d) => d.expiry_date && new Date(d.expiry_date) <= ninetyDays));
    }
    if (favRes.data) {
      setFavorites(favRes.data as Favorite[]);
      if (favRes.data.length > 0) {
        const favIds = favRes.data.map((f) => f.entity_id);
        const { data: favCreds } = await supabase.from('credentials').select('*, service:services(*)').in('id', favIds).limit(5);
        if (favCreds) setFavoriteCreds(favCreds as Credential[]);
      }
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const daysUntil = (dateStr: string): number => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {greeting} 👋
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#d97706' }}>GuptDhan</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Aapka digital khazana.</p>
        </div>
        <LogoMark size={40} />
      </div>

      {/* Search bar */}
      <button
        onClick={onOpenSearch}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow mb-6 press-feedback"
      >
        <Search size={20} className="text-gray-400" />
        <span className="text-sm text-gray-400 dark:text-gray-500">Search your vault...</span>
        <span className="ml-auto text-xs text-gray-300 dark:text-gray-600">🔍</span>
      </button>

      {/* Quick Access */}
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">Quick Access</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <QuickAccessBtn icon="🔐" label="Credentials" color="#b45309" bg="#fef3c7" darkBg="rgba(180,83,9,0.15)" onClick={() => onNavigate('vault')} />
        <QuickAccessBtn icon="📄" label="Documents" color="#16a34a" bg="#dcfce7" darkBg="rgba(22,163,74,0.15)" onClick={() => onNavigate('documents')} />
        <QuickAccessBtn
          icon="🛡️"
          label="Sensitive"
          color="#d97706"
          bg="#fef3c7"
          darkBg="rgba(217,119,6,0.15)"
          onClick={() => {
            if (!hasPin) { showToast('Set a security PIN in Settings first', 'info'); onNavigate('settings'); return; }
            if (!isUnlocked) { setSensitiveSheet(true); } else { onNavigate('personal'); }
          }}
        />
        <QuickAccessBtn icon="📝" label="Notes" color="#0891b2" bg="#cffafe" darkBg="rgba(8,145,178,0.15)" onClick={() => onNavigate('notes')} />
      </div>

      {/* Sensitive vault indicator */}
      {isUnlocked && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-warning-50 dark:bg-warning-500/10 mb-6 animate-fade-in border border-warning-200 dark:border-warning-500/20">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-warning-600 dark:text-warning-500" />
            <span className="text-sm font-medium text-warning-700 dark:text-warning-500">Sensitive vault unlocked</span>
          </div>
          <span className="text-sm font-mono text-warning-700 dark:text-warning-500 tabular-nums">
            00:{timeRemaining.toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Projects */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">My Projects</h2>
        <button onClick={() => onNavigate('vault')} className="text-xs text-primary-500 font-medium">See all</button>
      </div>
      <div className="space-y-2 mb-6">
        {projects.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">📦</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your treasure chest is empty.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first project to get started.</p>
            <button onClick={() => onNavigate('vault')} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <Plus size={14} /> Add Project
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onOpenProject(project)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left press-feedback"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: project.color + '20' }}>
                <FolderKanban size={20} style={{ color: project.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</p>
                {project.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description}</p>}
              </div>
              <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Favorites */}
      {favoriteCreds.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Star size={16} className="text-warning-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Favorites</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-6">
            {favoriteCreds.map((cred) => (
              <button
                key={cred.id}
                onClick={() => onOpenCredential(cred)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow shrink-0 press-feedback"
                style={{ minWidth: 80 }}
              >
                <ServiceLogo service={cred.service?.name || cred.title} size={36} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[72px] truncate">
                  {cred.service?.name || cred.title}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Expiring Soon */}
      {expiringDocs.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock size={16} className="text-warning-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Expiring Soon</h2>
          </div>
          <div className="space-y-2 mb-6">
            {expiringDocs.map((doc) => {
              const days = daysUntil(doc.expiry_date!);
              return (
                <button
                  key={doc.id}
                  onClick={() => onNavigate('documents')}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left press-feedback"
                >
                  <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-warning-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.name}</p>
                    <p className="text-xs text-warning-500">Expires in {days} {days === 1 ? 'day' : 'days'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Recently Added */}
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">Recently Added</h2>
      <div className="space-y-2">
        {recentCreds.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700">
            <div className="text-3xl mb-2">🔐</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nothing hidden here yet.</p>
            <button onClick={() => onNavigate('vault')} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <Plus size={14} /> Add Credential
            </button>
          </div>
        ) : (
          recentCreds.map((cred) => (
            <button
              key={cred.id}
              onClick={() => onOpenCredential(cred)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left press-feedback"
            >
              <ServiceLogo service={cred.service?.name || cred.title} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cred.service?.name || cred.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{cred.title}</p>
              </div>
              {cred.is_sensitive && <Lock size={14} className="text-warning-500 shrink-0" />}
              <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Sensitive vault unlock sheet */}
      <BottomSheet open={sensitiveSheet} onClose={() => setSensitiveSheet(false)} title="Unlock Sensitive Vault">
        <SensitiveVaultUnlock
          onUnlock={() => {
            setSensitiveSheet(false);
            showToast('Sensitive vault unlocked', 'success');
            onNavigate('personal');
          }}
        />
      </BottomSheet>
    </div>
  );
}

function QuickAccessBtn({
  icon, label, color, bg, darkBg, onClick,
}: {
  icon: string; label: string; color: string; bg: string; darkBg: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-95 transition-transform press-feedback">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
        style={{ backgroundColor: bg }}
      >
        <span>{icon}</span>
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">{label}</span>
    </button>
  );
}
