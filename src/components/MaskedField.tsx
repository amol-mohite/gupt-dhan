import { useState, useCallback } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { showToast } from './Toast';
import { useAuth } from '@/lib/auth-context';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';
import { logSecurityEvent } from '@/lib/security-log';

interface MaskedFieldProps {
  label: string;
  value: string;
  isSensitive: boolean;
  revealable?: boolean;
  userId?: string;
  copyLabel?: string;
}

export function MaskedField({
  label,
  value,
  isSensitive,
  revealable = true,
  userId,
  copyLabel = 'Copied securely',
}: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { isUnlocked } = useSensitiveVault();

  const canReveal = !isSensitive || isUnlocked;

  const handleReveal = useCallback(() => {
    if (!canReveal) return;
    setRevealed((r) => !r);
  }, [canReveal]);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        showToast(copyLabel, 'success');
        if (userId || user) {
          logSecurityEvent(
            (userId || user!.id),
            'credential_copied',
            `Copied field: ${label}`
          );
        }
        setTimeout(() => {
          setCopied(false);
          navigator.clipboard.writeText('').catch(() => {});
        }, 20000);
      } catch {
        showToast('Could not copy to clipboard', 'error');
      }
    },
    [value, label, userId, user, copyLabel]
  );

  const displayValue = isSensitive
    ? canReveal && revealed
      ? value
      : '••••••••••'
    : revealed || !revealable
    ? value
    : value.length > 30
    ? value.slice(0, 30) + '...'
    : value;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-gray-900 dark:text-white font-medium break-all">
          {displayValue}
        </span>
        {isSensitive && !canReveal && (
          <span className="text-xs text-warning-600 dark:text-warning-500 font-medium">
            PIN required
          </span>
        )}
        {revealable && canReveal && (
          <button
            onClick={handleReveal}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? (
              <EyeOff size={16} className="text-gray-400" />
            ) : (
              <Eye size={16} className="text-gray-400" />
            )}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label="Copy"
        >
          {copied ? (
            <Check size={16} className="text-success-500" />
          ) : (
            <Copy size={16} className="text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}
