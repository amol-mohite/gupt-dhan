import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';
import {
  initEncryptionKey,
  clearEncryptionKey,
  generateNewSalt,
} from './crypto';
import { seedDemoData } from './seed-data';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  encKeyReady: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [encKeyReady, setEncKeyReady] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
    setProfile(data as Profile | null);
    return data as Profile | null;
  }, []);

  const initEncryption = useCallback(
    async (pwd: string, salt: string) => {
      try {
        await initEncryptionKey(pwd, salt);
        setEncKeyReady(true);
      } catch (err) {
        console.error('Encryption init failed:', err);
        setEncKeyReady(false);
      }
    },
    []
  );

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          const prof = await loadProfile(sess.user.id);
          if (prof && pendingPassword && prof.enc_salt) {
            await initEncryption(pendingPassword, prof.enc_salt);
            setPendingPassword(null);
          }
        } else {
          setProfile(null);
          setEncKeyReady(false);
          clearEncryptionKey();
        }
        setLoading(false);
      })();
    });
  }, [loadProfile, initEncryption, pendingPassword]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setPendingPassword(password);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPendingPassword(null);
        return { error: error.message };
      }
      return { error: null };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const salt = generateNewSalt();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          enc_salt: salt,
          display_name: email.split('@')[0],
        });
        if (profileError) {
          console.error('Profile creation failed:', profileError);
        }
        setPendingPassword(password);
        await seedDemoData(data.user.id);
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    clearEncryptionKey();
    setEncKeyReady(false);
    setProfile(null);
    setPendingPassword(null);
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      await loadProfile(user.id);
    },
    [user, loadProfile]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        encKeyReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
