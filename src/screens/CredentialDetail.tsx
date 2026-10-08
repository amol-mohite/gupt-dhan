import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, Plus, Lock, MoreVertical, Trash2, Eye, EyeOff, Copy, Check,
  ExternalLink, Edit2, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import type { Credential, CredentialField, FieldType } from '@/lib/types';
import { getEncryptionKey, encryptValue, decryptValue, isEncrypted } from '@/lib/crypto';
import { logSecurityEvent } from '@/lib/security-log';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/Dialogs';
import { showToast } from '@/components/Toast';
import { SensitiveVaultUnlock } from '@/components/PinPad';
import { ServiceLogo } from '@/components/ServiceLogo';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'secret', label: 'Secret' },
];

const SENSITIVE_TYPES: FieldType[] = ['password', 'secret'];

interface CredentialDetailProps {
  credential: Credential;
  onBack: () => void;
}

export function CredentialDetail({ credential: initialCred, onBack }: CredentialDetailProps) {
  const { user } = useAuth();
  const { isUnlocked } = useSensitiveVault();
  const [credential, setCredential] = useState(initialCred);
  const [fields, setFields] = useState<CredentialField[]>([]);
  const [decryptedFields, setDecryptedFields] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [addFieldSheet, setAddFieldSheet] = useState(false);
  const [editField, setEditField] = useState<CredentialField | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sensitiveSheet, setSensitiveSheet] = useState(false);

  const loadFields = useCallback(async () => {
    const { data } = await supabase
      .from('credential_fields')
      .select('*')
      .eq('credential_id', credential.id)
      .order('sort_order');
    if (data) {
      setFields(data as CredentialField[]);
    }
  }, [credential.id]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  // Decrypt sensitive fields when vault is unlocked
  useEffect(() => {
    if (!isUnlocked) {
      setDecryptedFields({});
      return;
    }
    const key = getEncryptionKey();
    if (!key) return;
    (async () => {
      const decrypted: Record<string, string> = {};
      for (const field of fields) {
        if (field.is_sensitive && field.field_value && isEncrypted(field.field_value)) {
          try {
            decrypted[field.id] = await decryptValue(field.field_value, key);
          } catch {
            decrypted[field.id] = '••••';
          }
        }
      }
      setDecryptedFields(decrypted);
    })();
  }, [isUnlocked, fields]);

  const canSeeSensitive = !credential.is_sensitive || isUnlocked;

  const handleAddField = async (data: {
    name: string;
    value: string;
    type: FieldType;
    isSensitive: boolean;
  }) => {
    const key = getEncryptionKey();
    let storedValue = data.value;
    if (data.isSensitive && key && data.value) {
      storedValue = await encryptValue(data.value, key);
    }
    const { error } = await supabase.from('credential_fields').insert({
      credential_id: credential.id,
      field_name: data.name,
      field_value: storedValue,
      field_type: data.type,
      is_sensitive: data.isSensitive,
      user_id: user?.id,
    });
    if (error) {
      showToast('Something went wrong while saving', 'error');
      return;
    }
    showToast('Field added', 'success');
    setAddFieldSheet(false);
    loadFields();
  };

  const handleUpdateField = async (
    fieldId: string,
    data: { name: string; value: string; type: FieldType; isSensitive: boolean }
  ) => {
    const key = getEncryptionKey();
    let storedValue = data.value;
    if (data.isSensitive && key && data.value) {
      storedValue = await encryptValue(data.value, key);
    }
    const { error } = await supabase
      .from('credential_fields')
      .update({
        field_name: data.name,
        field_value: storedValue,
        field_type: data.type,
        is_sensitive: data.isSensitive,
      })
      .eq('id', fieldId);
    if (error) {
      showToast('Something went wrong while saving', 'error');
      return;
    }
    showToast('Field updated', 'success');
    setEditField(null);
    loadFields();
  };

  const handleDeleteField = async (fieldId: string) => {
    const { error } = await supabase.from('credential_fields').delete().eq('id', fieldId);
    if (error) {
      showToast('Something went wrong while deleting', 'error');
      return;
    }
    showToast('Field deleted', 'success');
    loadFields();
  };

  const handleCopyField = async (field: CredentialField, value: string) => {
    await navigator.clipboard.writeText(value);
    showToast('Copied securely', 'success');
    if (user) logSecurityEvent(user.id, 'credential_copied', `Copied: ${field.field_name}`);
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 20000);
  };

  const getFieldValue = (field: CredentialField): string => {
    if (field.is_sensitive) {
      if (!canSeeSensitive) return '';
      return decryptedFields[field.id] || '';
    }
    return field.field_value || '';
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 -ml-1"
      >
        <ChevronRight size={16} className="rotate-180" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <ServiceLogo service={credential.service?.name || credential.title} size={56} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {credential.service?.name || credential.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{credential.title}</p>
          {credential.is_sensitive && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-warning-600 dark:text-warning-500 font-medium">
              <Lock size={12} /> Sensitive
            </span>
          )}
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MoreVertical size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Open website button */}
      {credential.service?.website_url && (
        <a
          href={credential.service.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium text-sm mb-6 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
        >
          <ExternalLink size={16} /> Open {credential.service.name}
        </a>
      )}

      {/* Fields */}
      {credential.is_sensitive && !isUnlocked && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center mb-3">
            <Lock size={24} className="text-warning-600 dark:text-warning-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Sensitive Information
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enter your security PIN to view this credential's fields.
          </p>
          <button
            onClick={() => setSensitiveSheet(true)}
            className="px-6 py-2.5 rounded-xl bg-warning-500 text-white font-medium text-sm hover:bg-warning-600 transition-colors"
          >
            Unlock
          </button>
        </div>
      )}

      {(canSeeSensitive || fields.filter((f) => !f.is_sensitive).length > 0) && (
        <>
          {fields.length > 0 && (
            <div className="space-y-4 mb-6">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={getFieldValue(field)}
                  canReveal={canSeeSensitive}
                  onCopy={() => handleCopyField(field, getFieldValue(field))}
                  onEdit={() => setEditField(field)}
                  onDelete={() => handleDeleteField(field.id)}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setAddFieldSheet(true)}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium text-sm hover:border-primary-400 hover:text-primary-500 transition-colors"
          >
            <Plus size={18} /> Add Field
          </button>
        </>
      )}

      {/* Menu */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options">
        <div className="space-y-1 py-2">
          <MenuAction icon={<Star size={18} />} label="Toggle Favorite" onClick={async () => {
            setMenuOpen(false);
            const { data: existing } = await supabase.from('favorites').select('id').eq('entity_type', 'credential').eq('entity_id', credential.id).maybeSingle();
            if (existing) {
              await supabase.from('favorites').delete().eq('id', existing.id);
              showToast('Removed from favorites', 'info');
            } else {
              await supabase.from('favorites').insert({ entity_type: 'credential', entity_id: credential.id, user_id: user?.id });
              showToast('Added to favorites', 'success');
            }
          }} />
          <MenuAction icon={<Trash2 size={18} />} label="Delete Credential" danger onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} />
        </div>
      </BottomSheet>

      {/* Sensitive unlock */}
      <BottomSheet open={sensitiveSheet} onClose={() => setSensitiveSheet(false)} title="Unlock Sensitive Vault">
        <SensitiveVaultUnlock onUnlock={() => { setSensitiveSheet(false); showToast('Sensitive vault unlocked', 'success'); }} />
      </BottomSheet>

      {/* Add field */}
      <BottomSheet open={addFieldSheet} onClose={() => setAddFieldSheet(false)} title="Add Field">
        <FieldForm onSubmit={handleAddField} onCancel={() => setAddFieldSheet(false)} />
      </BottomSheet>

      {/* Edit field */}
      <BottomSheet open={!!editField} onClose={() => setEditField(null)} title="Edit Field">
        {editField && (
          <FieldForm
            initial={{
              name: editField.field_name,
              value: getFieldValue(editField),
              type: editField.field_type,
              isSensitive: editField.is_sensitive,
            }}
            onSubmit={(data) => handleUpdateField(editField.id, data)}
            onCancel={() => setEditField(null)}
          />
        )}
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Credential"
        message={`Delete "${credential.title}" and all its fields? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await supabase.from('credentials').delete().eq('id', credential.id);
          if (user) logSecurityEvent(user.id, 'record_deleted', `Deleted: ${credential.title}`);
          showToast('Credential deleted', 'success');
          onBack();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function FieldRow({
  field,
  value,
  canReveal,
  onCopy,
  onEdit,
  onDelete,
}: {
  field: CredentialField;
  value: string;
  canReveal: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSensitive = field.is_sensitive || SENSITIVE_TYPES.includes(field.field_type);
  const showValue = isSensitive ? (canReveal && revealed ? value : '••••••••••') : value;

  const handleCopy = () => {
    if (!value) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {field.field_name}
        </span>
        <div className="flex items-center gap-1">
          {(isSensitive ? canReveal : true) && value && (
            <>
              {isSensitive && (
                <button
                  onClick={() => setRevealed((r) => !r)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {revealed ? <EyeOff size={15} className="text-gray-400" /> : <Eye size={15} className="text-gray-400" />}
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {copied ? <Check size={15} className="text-success-500" /> : <Copy size={15} className="text-gray-400" />}
              </button>
            </>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Edit2 size={15} className="text-gray-400" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Trash2 size={15} className="text-gray-400" />
          </button>
        </div>
      </div>
      <p className={`text-sm ${isSensitive ? 'font-mono' : ''} text-gray-900 dark:text-white break-all`}>
        {showValue || <span className="text-gray-400 dark:text-gray-600">Not set</span>}
      </p>
      {field.field_type === 'url' && !isSensitive && value && (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1 text-xs text-primary-500 hover:underline"
        >
          <ExternalLink size={12} /> Open
        </a>
      )}
    </div>
  );
}

function FieldForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; value: string; type: FieldType; isSensitive: boolean };
  onSubmit: (data: { name: string; value: string; type: FieldType; isSensitive: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [value, setValue] = useState(initial?.value || '');
  const [type, setType] = useState<FieldType>(initial?.type || 'text');
  const [isSensitive, setIsSensitive] = useState(
    initial?.isSensitive ?? SENSITIVE_TYPES.includes(type)
  );

  return (
    <div className="space-y-4 py-2">
      <FormInput label="Field Name" value={name} onChange={setName} placeholder="e.g. Password" />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Value</label>
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
          />
        ) : (
          <input
            type={isSensitive || type === 'password' ? 'password' : type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value..."
            className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Type</label>
        <div className="flex gap-2 flex-wrap">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => {
                setType(ft.value);
                if (SENSITIVE_TYPES.includes(ft.value)) setIsSensitive(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === ft.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={isSensitive}
          onChange={(e) => setIsSensitive(e.target.checked)}
          className="w-5 h-5 rounded accent-primary-500"
          disabled={SENSITIVE_TYPES.includes(type)}
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Sensitive</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Encrypted and masked by default</p>
        </div>
      </label>
      <div className="flex gap-3 pt-2 pb-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm">
          Cancel
        </button>
        <button
          onClick={() => name.trim() && onSubmit({ name: name.trim(), value, type, isSensitive })}
          disabled={!name.trim()}
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
