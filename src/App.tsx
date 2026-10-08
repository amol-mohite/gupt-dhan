import { useState, useEffect, useRef } from 'react';
import { Home, FolderKanban, FileText, Search, Settings, Plus } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { SensitiveVaultProvider } from '@/lib/sensitive-vault-context';
import { AuthScreen } from '@/screens/AuthScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { VaultScreen } from '@/screens/VaultScreen';
import { CredentialDetail } from '@/screens/CredentialDetail';
import { DocumentsScreen } from '@/screens/DocumentsScreen';
import { NotesScreen } from '@/screens/NotesScreen';
import { PersonalScreen } from '@/screens/PersonalScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ToastContainer } from '@/components/Toast';
import { BottomSheet } from '@/components/BottomSheet';
import { LogoMark } from '@/components/Logo';
import { VaultOpenAnimation } from '@/components/VaultAnimation';
import { logSecurityEvent } from '@/lib/security-log';
import type { Project, Credential } from '@/lib/types';

type Tab = 'home' | 'vault' | 'documents' | 'search' | 'settings' | 'notes' | 'personal';
type View = { tab: Tab } | { tab: 'credential'; credential: Credential };

function AppContent() {
  const { user, loading, encKeyReady, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [view, setView] = useState<View>({ tab: 'home' });
  const [fabOpen, setFabOpen] = useState(false);
  const [showVaultAnim, setShowVaultAnim] = useState(false);
  const prevEncKeyReady = useRef(false);

  useEffect(() => {
    if (user && encKeyReady) {
      logSecurityEvent(user.id, 'login', 'User signed in');
      if (!prevEncKeyReady.current) {
        setShowVaultAnim(true);
      }
    }
    prevEncKeyReady.current = !!encKeyReady;
  }, [user, encKeyReady]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #1c1008 0%, #2d1a0a 40%, #0d0804 100%)' }}>
        <div className="text-3xl animate-float mb-4">🔐</div>
        <span className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !encKeyReady) {
    return <AuthScreen />;
  }

  if (showVaultAnim) {
    return <VaultOpenAnimation onComplete={() => setShowVaultAnim(false)} />;
  }

  const navigate = (newTab: string) => {
    setTab(newTab as Tab);
    setView({ tab: newTab as Tab });
    setFabOpen(false);
  };

  const openProject = (project: Project) => {
    setTab('vault');
    setView({ tab: 'vault' });
  };

  const openCredential = (cred: Credential) => {
    setView({ tab: 'credential', credential: cred });
  };

  const openSearch = () => navigate('search');

  const goBack = () => {
    setView({ tab });
  };

  if (view.tab === 'credential') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md mx-auto">
          <CredentialDetail credential={view.credential} onBack={goBack} />
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl relative">
        <div className="min-h-screen page-enter">
          {tab === 'home' && (
            <HomeScreen
              onNavigate={navigate}
              onOpenProject={openProject}
              onOpenCredential={openCredential}
              onOpenSearch={openSearch}
            />
          )}
          {tab === 'vault' && (
            <VaultScreen onOpenProject={openProject} onOpenCredential={openCredential} />
          )}
          {tab === 'documents' && <DocumentsScreen />}
          {tab === 'search' && (
            <SearchScreen onOpenProject={openProject} onOpenCredential={openCredential} onNavigate={navigate} />
          )}
          {tab === 'settings' && <SettingsScreen onSignOut={signOut} />}
          {tab === 'notes' && <NotesScreen />}
          {tab === 'personal' && <PersonalScreen />}
        </div>

        {/* FAB */}
        {tab !== 'search' && tab !== 'settings' && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 md:left-auto md:right-6 md:bottom-6">
            <button
              onClick={() => setFabOpen(true)}
              className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform press-feedback"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 8px 24px rgba(180,83,9,0.4)' }}
            >
              <Plus size={26} />
            </button>
          </div>
        )}

        <BottomSheet open={fabOpen} onClose={() => setFabOpen(false)} title="Add to Vault">
          <div className="space-y-2 py-2">
            <FabOption icon={<FolderKanban size={20} />} label="Project" onClick={() => { navigate('vault'); setFabOpen(false); }} />
            <FabOption icon={<Plus size={20} />} label="App / Service Credential" onClick={() => { navigate('vault'); setFabOpen(false); }} />
            <FabOption icon={<FileText size={20} />} label="Document" onClick={() => { navigate('documents'); setFabOpen(false); }} />
            <FabOption icon={<FileText size={20} />} label="Note" onClick={() => { navigate('notes'); setFabOpen(false); }} />
            <FabOption icon={<Home size={20} />} label="Personal Information" onClick={() => { navigate('personal'); setFabOpen(false); }} />
          </div>
        </BottomSheet>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
          <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl flex items-center justify-around px-2 py-1.5">
            <NavButton icon={<Home size={22} />} label="Home" active={tab === 'home'} onClick={() => navigate('home')} />
            <NavButton icon={<FolderKanban size={22} />} label="Vault" active={tab === 'vault'} onClick={() => navigate('vault')} />
            <NavButton icon={<FileText size={22} />} label="Docs" active={tab === 'documents'} onClick={() => navigate('documents')} />
            <NavButton icon={<Search size={22} />} label="Search" active={tab === 'search'} onClick={() => navigate('search')} />
            <NavButton icon={<Settings size={22} />} label="More" active={tab === 'settings'} onClick={() => navigate('settings')} />
          </div>
        </nav>

        <ToastContainer />
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[60px] ${
        active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function FabOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left press-feedback"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SensitiveVaultProvider>
          <AppContent />
        </SensitiveVaultProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
