import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/Logo';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1c1008 0%, #2d1a0a 40%, #0d0804 100%)' }}>

      {/* Subtle background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${60 + i * 40}px`,
              height: `${60 + i * 40}px`,
              background: 'radial-gradient(circle, #f59e0b, transparent)',
              left: `${10 + i * 15}%`,
              top: `${5 + i * 12}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="animate-float mb-5">
            <Logo size={72} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#f59e0b' }}>
            GuptDhan
          </h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(251,191,36,0.7)' }}>
            Aapka digital khazana.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 border"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(245,158,11,0.2)', backdropFilter: 'blur(20px)' }}>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 text-sm text-red-400 animate-fade-in border border-red-500/20">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'rgba(251,191,36,0.8)' }}>Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(245,158,11,0.5)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm border"
                  style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(245,158,11,0.2)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'rgba(251,191,36,0.8)' }}>Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(245,158,11,0.5)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm border"
                  style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(245,158,11,0.2)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(245,158,11,0.5)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', color: 'white' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? '🔐 Unlock Vault' : '✨ Create Vault'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="text-sm hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(245,158,11,0.6)' }}
            >
              {mode === 'signin' ? "Don't have a vault? Create one" : 'Already have a vault? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: 'rgba(245,158,11,0.3)' }}>
          Your data is encrypted and only accessible with your password.
        </p>
      </div>
    </div>
  );
}
