import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Lock, MoreVertical, Trash2, ChevronRight,
  CreditCard, User, Eye, EyeOff, Copy, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { PersonalInfo, PersonalInfoCategory } from '@/lib/types';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog, EmptyState } from '@/components/Dialogs';
import { showToast } from '@/components/Toast';

const IDENTITY_FIELDS = ['Full Name', 'Date of Birth', 'PAN', 'Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'Other ID'];
const BANK_FIELDS = ['Account Holder', 'Account Number', 'IFSC Code', 'Branch', 'Account Type', 'UPI ID'];

export function PersonalScreen() {
  const { user } = useAuth();
  const { isUnlocked, hasPin, timeRemaining } = useSensitiveVault();
  const [items, setItems] = useState<PersonalInfo[]>([]);
  const [addSheet, setAddSheet] = useState(false);
  const [viewItem, setViewItem] = useState<PersonalInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PersonalInfo | null>(null);
  const [editItem, setEditItem] = useState<PersonalInfo | null>(null);

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('personal_info').select('*').order('created_at', { ascending: false });
    if (data) setItems(data as PersonalInfo[]);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: {
    title: string;
    category: PersonalInfoCategory;
    fields: Record<string, string>;
  }) => {
    if (editItem) {
      const { error } = await supabase.from('personal_info').update({
        title: data.title,
        data: data.fields,
      }).eq('id', editItem.id);
      if (error) { showToast('Something went wrong while saving', 'error'); return; }
      showToast('Updated', 'success');
    } else {
      const { error } = await supabase.from('personal_info').insert({
        title: data.title,
        category: data.category,
        data: data.fields,
        is_sensitive: true,
        user_id: user?.id,
      });
      if (error) { showToast('Something went wrong while saving', 'error'); return; }
      showToast('Added', 'success');
    }
    setAddSheet(false);
    setEditItem(null);
    loadItems();
  };

  const handleDelete = async (item: PersonalInfo) => {
    await supabase.from('personal_info').delete().eq('id', item.id);
    showToast('Deleted', 'success');
    setConfirmDelete(null);
    loadItems();
  };

  if (!hasPin) {
    return (
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal Vault</h1>
        <EmptyState
          icon={<Shield size={28} />}
          title="Set up your security PIN"
          message="You need a security PIN to access sensitive personal information. Set one in Settings."
          actionLabel="Go to Settings"
          onAction={() => {}}
        />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal Vault</h1>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center mb-4">
            <Shield size={28} className="text-warning-600 dark:text-warning-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sensitive Information</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
            Enter your security PIN to access your personal vault.
          </p>
          <UnlockInline />
        </div>
      </div>
    );
  }

  const identityItems = items.filter((i) => i.category === 'identity');
  const bankItems = items.filter((i) => i.category === 'bank');
  const otherItems = items.filter((i) => i.category === 'other');

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Vault</h1>
        <button
          onClick={() => { setEditItem(null); setAddSheet(true); }}
          className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Timer indicator */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-warning-50 dark:bg-warning-500/10 mb-5">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-warning-600 dark:text-warning-500" />
          <span className="text-sm font-medium text-warning-700 dark:text-warning-500">Vault unlocked</span>
        </div>
        <span className="text-sm font-mono text-warning-700 dark:text-warning-500 tabular-nums">
          00:{timeRemaining.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Identity */}
      <Section title="Identity" icon={<User size={16} />} items={identityItems} onView={setViewItem} onEdit={(item) => { setEditItem(item); setAddSheet(true); }} />

      {/* Bank */}
      <Section title="Bank Accounts" icon={<CreditCard size={16} />} items={bankItems} onView={setViewItem} onEdit={(item) => { setEditItem(item); setAddSheet(true); }} />

      {/* Other */}
      {otherItems.length > 0 && (
        <Section title="Other" icon={<Shield size={16} />} items={otherItems} onView={setViewItem} onEdit={(item) => { setEditItem(item); setAddSheet(true); }} />
      )}

      {items.length === 0 && (
        <EmptyState
          icon={<Shield size={28} />}
          title="Your personal vault is empty"
          message="Add identity details, bank accounts, and other sensitive information."
          actionLabel="Add Information"
          onAction={() => setAddSheet(true)}
        />
      )}

      {/* Add/Edit form */}
      <BottomSheet open={addSheet} onClose={() => { setAddSheet(false); setEditItem(null); }} title={editItem ? 'Edit' : 'Add Personal Info'} fullHeight>
        <PersonalForm initial={editItem} onSubmit={handleSave} onCancel={() => { setAddSheet(false); setEditItem(null); }} />
      </BottomSheet>

      {/* View detail */}
      <BottomSheet open={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.title}>
        {viewItem && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning-50 dark:bg-warning-500/10 mb-2">
              <Lock size={14} className="text-warning-500" />
              <span className="text-xs text-warning-700 dark:text-warning-500 font-medium">Sensitive information — handle with care</span>
            </div>
            {Object.entries(viewItem.data).map(([key, value]) => (
              <PersonalField key={key} label={key} value={value} />
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setViewItem(null); setEditItem(viewItem); setAddSheet(true); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => { setConfirmDelete(viewItem); setViewItem(null); }}
                className="flex-1 py-3 rounded-xl bg-error-500 text-white font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete"
        message={`Delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function Section({
  title,
  icon,
  items,
  onView,
  onEdit,
}: {
  title: string;
  icon: React.ReactNode;
  items: PersonalInfo[];
  onView: (item: PersonalInfo) => void;
  onEdit: (item: PersonalInfo) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        <span className="text-xs text-gray-400">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
            <button onClick={() => onView(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center shrink-0">
                <Lock size={16} className="text-warning-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Object.keys(item.data).length} {Object.keys(item.data).length === 1 ? 'field' : 'fields'}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
            </button>
            <button onClick={() => onEdit(item)} className="p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <MoreVertical size={16} className="text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonalField({ label, value }: { label: string; value: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    showToast('Copied securely', 'success');
    setTimeout(() => { setCopied(false); navigator.clipboard.writeText('').catch(() => {}); }, 20000);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setRevealed((r) => !r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {revealed ? <EyeOff size={15} className="text-gray-400" /> : <Eye size={15} className="text-gray-400" />}
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {copied ? <Check size={15} className="text-success-500" /> : <Copy size={15} className="text-gray-400" />}
          </button>
        </div>
      </div>
      <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
        {revealed ? value : '••••••••••'}
      </p>
    </div>
  );
}

function PersonalForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: PersonalInfo | null;
  onSubmit: (data: { title: string; category: PersonalInfoCategory; fields: Record<string, string> }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState<PersonalInfoCategory>(initial?.category || 'identity');
  const [fields, setFields] = useState<Record<string, string>>(initial?.data || {});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  const suggestedFields = category === 'bank' ? BANK_FIELDS : IDENTITY_FIELDS;

  const addField = (key: string) => {
    if (!key.trim() || fields[key.trim()]) return;
    setFields({ ...fields, [key.trim()]: newFieldValue });
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const removeField = (key: string) => {
    const newFields = { ...fields };
    delete newFields[key];
    setFields(newFields);
  };

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Title" value={title} onChange={setTitle} placeholder="e.g. HDFC Bank Account" />

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Category</label>
        <div className="flex gap-2">
          {(['identity', 'bank', 'other'] as PersonalInfoCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                category === cat ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Existing fields */}
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <div className="flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{key}</span>
            <p className="text-sm text-gray-900 dark:text-white font-mono">{value}</p>
          </div>
          <button onClick={() => removeField(key)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Trash2 size={14} className="text-gray-400" />
          </button>
        </div>
      ))}

      {/* Add new field */}
      <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Field</p>
        {/* Quick suggestions */}
        <div className="flex gap-1.5 flex-wrap">
          {suggestedFields.filter((f) => !fields[f]).map((f) => (
            <button
              key={f}
              onClick={() => setNewFieldKey(f)}
              className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-500 transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={newFieldKey}
          onChange={(e) => setNewFieldKey(e.target.value)}
          placeholder="Field name (e.g. PAN)"
          className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="text"
          value={newFieldValue}
          onChange={(e) => setNewFieldValue(e.target.value)}
          placeholder="Value"
          className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={() => addField(newFieldKey)}
          disabled={!newFieldKey.trim()}
          className="w-full py-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium disabled:opacity-50"
        >
          Add Field
        </button>
      </div>

      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => title.trim() && onSubmit({ title: title.trim(), category, fields })}
          disabled={!title.trim()}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-sm disabled:opacity-50"
        >
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function UnlockInline() {
  const { unlock } = useSensitiveVault();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    const result = await unlock(pin);
    if (result.error) {
      setError(result.error);
      setPin('');
    }
  };

  return (
    <div className="w-full max-w-xs">
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => { setPin(e.target.value); setError(null); }}
        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        placeholder="Enter PIN"
        className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
      />
      {error && <p className="text-sm text-error-500 mb-3 text-center">{error}</p>}
      <button
        onClick={handleUnlock}
        className="w-full py-3.5 rounded-xl bg-warning-500 text-white font-semibold text-sm hover:bg-warning-600"
      >
        Unlock
      </button>
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
