import { useState, useEffect, useCallback } from 'react';
import {
  User, Shield, Palette, Database, Info, LogOut, ChevronRight,
  Sun, Moon, Monitor, KeyRound, Clock, Fingerprint, Download, Upload,
  History, Lock, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { logSecurityEvent } from '@/lib/security-log';
import type { SecurityLog } from '@/lib/types';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/Dialogs';
import { showToast } from '@/components/Toast';
import { PinPad } from '@/components/PinPad';

interface SettingsScreenProps {
  onSignOut: () => void;
}

export function SettingsScreen({ onSignOut }: SettingsScreenProps) {
  const { user, profile, updateProfile } = useAuth();
  const { hasPin, setupPin, changePin, lock } = useSensitiveVault();
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<'main' | 'security' | 'appearance' | 'data' | 'activity' | 'about'>('main');
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [pinSheet, setPinSheet] = useState<'setup' | 'change_old' | 'change_new' | null>(null);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data as SecurityLog[]);
  }, [user]);

  useEffect(() => {
    if (section === 'activity') loadLogs();
  }, [section, loadLogs]);

  const handleSetPin = async (pin: string) => {
    const { error } = await setupPin(pin);
    if (error) return { error };
    showToast('Security PIN set', 'success');
    setPinSheet(null);
    return { error: null };
  };

  const handleChangePinOld = async (pin: string) => {
    setOldPin(pin);
    setPinSheet('change_new');
    return { error: null };
  };

  const handleChangePinNew = async (pin: string) => {
    const { error } = await changePin(oldPin, pin);
    if (error) return { error };
    showToast('PIN changed', 'success');
    setPinSheet(null);
    setOldPin('');
    setNewPin('');
    return { error: null };
  };

  const handleExport = async () => {
    setConfirmExport(false);
    if (!user) return;
    showToast('Export feature requires sensitive vault to be unlocked first', 'info');
  };

  if (section !== 'main') {
    return (
      <div className="px-4 pt-6 pb-24">
        <button
          onClick={() => setSection('main')}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 -ml-1"
        >
          <ChevronRight size={16} className="rotate-180" /> Back
        </button>

        {section === 'security' && (
          <SecuritySection
            profile={profile}
            hasPin={hasPin}
            onSetupPin={() => setPinSheet('setup')}
            onChangePin={() => setPinSheet('change_old')}
            updateProfile={updateProfile}
          />
        )}
        {section === 'appearance' && (
          <AppearanceSection theme={theme} setTheme={setTheme} updateProfile={updateProfile} />
        )}
        {section === 'activity' && <ActivitySection logs={logs} />}
        {section === 'data' && <DataSection onExport={() => setConfirmExport(true)} />}
        {section === 'about' && <AboutSection />}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">More</h1>

      {/* Profile card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
          {(profile?.display_name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {profile?.display_name || 'User'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Settings groups */}
      <SettingsGroup title="Security">
        <SettingsRow icon={<Shield size={20} />} label="Security & PIN" onClick={() => setSection('security')} />
        <SettingsRow icon={<History size={20} />} label="Activity Log" onClick={() => setSection('activity')} />
        <SettingsRow icon={<Lock size={20} />} label="Lock Sensitive Vault" onClick={() => { lock(); showToast('Sensitive vault locked', 'info'); }} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow icon={<Palette size={20} />} label="Appearance" onClick={() => setSection('appearance')} />
        <SettingsRow icon={<Database size={20} />} label="Data & Backup" onClick={() => setSection('data')} />
      </SettingsGroup>

      <SettingsGroup title="Other">
        <SettingsRow icon={<Info size={20} />} label="About" onClick={() => setSection('about')} />
      </SettingsGroup>

      <button
        onClick={() => setConfirmSignOut(true)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-500 font-medium text-sm mt-6"
      >
        <LogOut size={18} /> Sign Out
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">GuptDhan v1.0.0</p>

      {/* PIN setup / change sheets */}
      <BottomSheet open={pinSheet === 'setup'} onClose={() => setPinSheet(null)} title="Set Security PIN">
        <PinPad
          title="Set Security PIN"
          subtitle="This PIN protects your sensitive information"
          onSubmit={handleSetPin}
          maxLength={4}
          onSuccess={() => {}}
        />
      </BottomSheet>

      <BottomSheet open={pinSheet === 'change_old'} onClose={() => { setPinSheet(null); setOldPin(''); }} title="Change PIN — Step 1">
        <PinPad
          title="Current PIN"
          subtitle="Enter your current security PIN"
          onSubmit={handleChangePinOld}
          maxLength={4}
          onSuccess={() => {}}
        />
      </BottomSheet>

      <BottomSheet open={pinSheet === 'change_new'} onClose={() => { setPinSheet(null); setOldPin(''); setNewPin(''); }} title="Change PIN — Step 2">
        <PinPad
          title="New PIN"
          subtitle="Enter your new security PIN"
          onSubmit={handleChangePinNew}
          maxLength={4}
          onSuccess={() => {}}
        />
      </BottomSheet>

      <ConfirmDialog
        open={confirmExport}
        title="Export Data"
        message="Exporting your vault may expose sensitive information. Make sure you're in a private location. Continue?"
        confirmLabel="Export"
        onConfirm={handleExport}
        onCancel={() => setConfirmExport(false)}
      />

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign Out"
        message="You'll need to sign in again to access your vault."
        confirmLabel="Sign Out"
        danger
        onConfirm={() => {
          setConfirmSignOut(false);
          if (user) logSecurityEvent(user.id, 'logout', 'User signed out');
          onSignOut();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">{title}</h2>
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0 text-left ${
        danger ? 'text-error-500' : 'text-gray-900 dark:text-white'
      }`}
    >
      <span className={danger ? 'text-error-500' : 'text-gray-400'}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
    </button>
  );
}

function SecuritySection({
  profile,
  hasPin,
  onSetupPin,
  onChangePin,
  updateProfile,
}: {
  profile: any;
  hasPin: boolean;
  onSetupPin: () => void;
  onChangePin: () => void;
  updateProfile: (updates: any) => Promise<void>;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Security</h1>

      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <KeyRound size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Security PIN</span>
            </div>
            <span className={`text-xs font-medium ${hasPin ? 'text-success-500' : 'text-warning-500'}`}>
              {hasPin ? 'Set' : 'Not set'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {hasPin
              ? 'Your sensitive vault is protected with a PIN.'
              : 'Set a PIN to protect your sensitive information.'}
          </p>
          <button
            onClick={hasPin ? onChangePin : onSetupPin}
            className="w-full py-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium"
          >
            {hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Auto-lock timer</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lock sensitive vault after inactivity</p>
              </div>
            </div>
            <select
              value={profile?.auto_lock_seconds || 60}
              onChange={async (e) => {
                await updateProfile({ auto_lock_seconds: parseInt(e.target.value) });
                showToast('Auto-lock updated', 'success');
              }}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none"
            >
              <option value={30}>30s</option>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Fingerprint size={20} className="text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Biometric unlock</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Use Face ID / Touch ID if available</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.biometric_enabled || false}
                onChange={async (e) => {
                  if (e.target.checked && !('credentials' in navigator)) {
                    showToast('Biometric authentication not available on this device', 'error');
                    return;
                  }
                  await updateProfile({ biometric_enabled: e.target.checked });
                  showToast(e.target.checked ? 'Biometric enabled' : 'Biometric disabled', 'success');
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection({
  theme,
  setTheme,
  updateProfile,
}: {
  theme: string;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  updateProfile: (updates: any) => Promise<void>;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Appearance</h1>
      <div className="space-y-2">
        {([
          { value: 'light', label: 'Light', icon: <Sun size={20} /> },
          { value: 'dark', label: 'Dark', icon: <Moon size={20} /> },
          { value: 'system', label: 'System', icon: <Monitor size={20} /> },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            onClick={async () => {
              setTheme(opt.value);
              await updateProfile({ theme: opt.value });
              showToast(`Theme: ${opt.label}`, 'success');
            }}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
              theme === opt.value
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50'
            }`}
          >
            <span className={theme === opt.value ? 'text-primary-500' : 'text-gray-400'}>{opt.icon}</span>
            <span className={`flex-1 text-sm font-medium text-left ${theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
              {opt.label}
            </span>
            {theme === opt.value && <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivitySection({ logs }: { logs: SecurityLog[] }) {
  const formatEvent = (type: string): string => {
    const labels: Record<string, string> = {
      login: 'Signed in',
      logout: 'Signed out',
      sensitive_unlocked: 'Sensitive vault unlocked',
      sensitive_locked: 'Sensitive vault locked',
      document_viewed: 'Document viewed',
      credential_copied: 'Field copied',
      password_changed: 'Password changed',
      pin_changed: 'PIN changed',
      record_deleted: 'Record deleted',
      record_created: 'Record created',
      record_updated: 'Record updated',
    };
    return labels[type] || type;
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Group by date
  const grouped: Record<string, SecurityLog[]> = {};
  logs.forEach((log) => {
    const date = new Date(log.created_at).toDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(log);
  });

  const dateLabels: Record<string, string> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  Object.keys(grouped).forEach((date) => {
    if (date === today) dateLabels[date] = 'Today';
    else if (date === yesterday) dateLabels[date] = 'Yesterday';
    else dateLabels[date] = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Security Activity</h1>
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <History size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateLogs]) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">
                {dateLabels[date]}
              </h2>
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                {dateLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-3.5 ${idx < dateLogs.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{formatEvent(log.event_type)}</span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{formatTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataSection({ onExport }: { onExport: () => void }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Data & Backup</h1>

      <div className="p-4 rounded-2xl bg-warning-50 dark:bg-warning-500/10 mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="text-warning-600 dark:text-warning-500 shrink-0 mt-0.5" />
          <p className="text-xs text-warning-700 dark:text-warning-500 leading-relaxed">
            Exporting your vault may expose sensitive information. Only export in a private location and store the file securely.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onExport}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left"
        >
          <Download size={20} className="text-gray-400" />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white block">Export Data</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Download your vault data (encrypted)</span>
          </div>
          <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
        </button>

        <button
          onClick={() => showToast('Import coming soon', 'info')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-shadow text-left"
        >
          <Upload size={20} className="text-gray-400" />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white block">Import Data</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Restore from a backup file</span>
          </div>
          <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
        </button>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About</h1>
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Version</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">1.0.0</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Build</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">2026.10.08</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Privacy</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Your data is encrypted client-side before being stored. Sensitive values are never displayed in logs, search results, or notifications. Only you can access your vault with your password and PIN.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Security</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            GuptDhan uses AES-GCM encryption for sensitive fields, PBKDF2 key derivation from your master password, and Row Level Security in the database. Your encryption key is held in memory only and is never persisted.
          </p>
        </div>
      </div>
    </div>
  );
}
