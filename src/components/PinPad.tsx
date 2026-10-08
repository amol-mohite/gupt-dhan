import { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { useSensitiveVault } from '@/lib/sensitive-vault-context';

interface PinPadProps {
  onSubmit: (pin: string) => Promise<{ error: string | null }>;
  title: string;
  subtitle?: string;
  maxLength?: number;
  onSuccess?: () => void;
}

export function PinPad({ onSubmit, title, subtitle, maxLength = 6, onSuccess }: PinPadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    setError(null);
    if (pin.length < maxLength) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === maxLength) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  const submitPin = async (pinValue: string) => {
    setLoading(true);
    const result = await onSubmit(pinValue);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPin('');
    } else {
      onSuccess?.();
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="w-14 h-14 rounded-2xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center mb-4">
        <Lock size={24} className="text-warning-600 dark:text-warning-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">{title}</h2>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-6">{subtitle}</p>
      )}

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i < pin.length
                ? 'bg-primary-500'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-error-500 mb-4 text-center animate-fade-in">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
        {digits.map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={loading}
            className="aspect-square rounded-2xl bg-gray-50 dark:bg-gray-800 text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="aspect-square rounded-2xl bg-gray-50 dark:bg-gray-800 text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || pin.length === 0}
          className="aspect-square rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-30"
        >
          <Delete size={22} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}

export function SensitiveVaultUnlock({ onUnlock }: { onUnlock: () => void }) {
  const { unlock } = useSensitiveVault();
  return (
    <PinPad
      title="Sensitive Information"
      subtitle="Enter your security PIN to continue"
      onSubmit={unlock}
      onSuccess={onUnlock}
    />
  );
}
