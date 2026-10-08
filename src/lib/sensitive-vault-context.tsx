import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { verifyPin, hashPin, generateNewSalt } from './crypto';
import { logSecurityEvent } from './security-log';

interface SensitiveVaultContextValue {
  isUnlocked: boolean;
  timeRemaining: number;
  unlock: (pin: string) => Promise<{ error: string | null }>;
  lock: () => void;
  hasPin: boolean;
  setupPin: (pin: string) => Promise<{ error: string | null }>;
  changePin: (oldPin: string, newPin: string) => Promise<{ error: string | null }>;
}

const SensitiveVaultContext = createContext<SensitiveVaultContextValue | undefined>(undefined);

const DEFAULT_TIMEOUT = 60;

export function SensitiveVaultProvider({ children }: { children: ReactNode }) {
  const { user, profile, updateProfile } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIMEOUT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saltRef = useRef<string>('');

  useEffect(() => {
    if (profile?.enc_salt) saltRef.current = profile.enc_salt;
  }, [profile?.enc_salt]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setTimeRemaining(DEFAULT_TIMEOUT);
    clearTimer();
    if (user) {
      logSecurityEvent(user.id, 'sensitive_locked', 'Sensitive vault locked');
    }
  }, [user, clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(DEFAULT_TIMEOUT);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (user) {
            logSecurityEvent(user.id, 'sensitive_locked', 'Sensitive vault auto-locked after timeout');
          }
          setIsUnlocked(false);
          clearTimer();
          return DEFAULT_TIMEOUT;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, user]);

  const unlock = useCallback(
    async (pin: string): Promise<{ error: string | null }> => {
      if (!profile?.sensitive_pin_hash || !profile?.enc_salt) {
        return { error: 'Security PIN not set. Please set one in Settings first.' };
      }
      try {
        const valid = await verifyPin(pin, profile.sensitive_pin_hash, profile.enc_salt);
        if (!valid) {
          return { error: 'Incorrect PIN. Please try again.' };
        }
        setIsUnlocked(true);
        startTimer();
        if (user) {
          logSecurityEvent(user.id, 'sensitive_unlocked', 'Sensitive vault unlocked');
        }
        return { error: null };
      } catch {
        return { error: 'Something went wrong while unlocking. Please try again.' };
      }
    },
    [profile, startTimer, user]
  );

  const setupPin = useCallback(
    async (pin: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' };
      if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return { error: 'PIN must be 4-6 digits' };
      }
      try {
        let salt = profile?.enc_salt;
        if (!salt) {
          salt = generateNewSalt();
        }
        const pinHash = await hashPin(pin, salt);
        await updateProfile({
          sensitive_pin_hash: pinHash,
          enc_salt: salt,
        });
        logSecurityEvent(user.id, 'pin_changed', 'Security PIN set');
        return { error: null };
      } catch {
        return { error: 'Failed to set PIN. Please try again.' };
      }
    },
    [user, profile, updateProfile]
  );

  const changePin = useCallback(
    async (oldPin: string, newPin: string): Promise<{ error: string | null }> => {
      if (!profile?.sensitive_pin_hash || !profile?.enc_salt) {
        return { error: 'No PIN is currently set' };
      }
      try {
        const valid = await verifyPin(oldPin, profile.sensitive_pin_hash, profile.enc_salt);
        if (!valid) return { error: 'Incorrect current PIN' };
        if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
          return { error: 'New PIN must be 4-6 digits' };
        }
        const pinHash = await hashPin(newPin, profile.enc_salt);
        await updateProfile({ sensitive_pin_hash: pinHash });
        if (user) logSecurityEvent(user.id, 'pin_changed', 'Security PIN changed');
        return { error: null };
      } catch {
        return { error: 'Failed to change PIN. Please try again.' };
      }
    },
    [profile, updateProfile, user]
  );

  // Lock on visibility change (app going to background)
  useEffect(() => {
    const handler = () => {
      if (document.hidden && isUnlocked) {
        lock();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isUnlocked, lock]);

  // Lock on sign out
  useEffect(() => {
    if (!user) lock();
  }, [user, lock]);

  const hasPin = !!profile?.sensitive_pin_hash;

  return (
    <SensitiveVaultContext.Provider
      value={{ isUnlocked, timeRemaining, unlock, lock, hasPin, setupPin, changePin }}
    >
      {children}
    </SensitiveVaultContext.Provider>
  );
}

export function useSensitiveVault() {
  const ctx = useContext(SensitiveVaultContext);
  if (!ctx) throw new Error('useSensitiveVault must be used within SensitiveVaultProvider');
  return ctx;
}
