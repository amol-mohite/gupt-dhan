import { useEffect, useState } from 'react';

interface VaultOpenAnimationProps {
  onComplete: () => void;
}

export function VaultOpenAnimation({ onComplete }: VaultOpenAnimationProps) {
  const [phase, setPhase] = useState<'lock' | 'opening' | 'reveal'>('lock');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('opening'), 200);
    const t2 = setTimeout(() => setPhase('reveal'), 1000);
    const t3 = setTimeout(() => onComplete(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1c1008 0%, #2d1a0a 40%, #0d0804 100%)' }}
    >
      {/* Sparkles */}
      {phase === 'reveal' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-400 animate-sparkle"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                fontSize: `${8 + Math.random() * 10}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              ✦
            </div>
          ))}
        </div>
      )}

      {/* Vault door */}
      <div className="vault-perspective relative" style={{ width: 200, height: 200 }}>
        {/* Left door */}
        <div
          className={`absolute inset-0 rounded-2xl border-4 flex items-center justify-end pr-2 ${phase !== 'lock' ? 'vault-door-left opening' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #374151, #1f2937)',
            borderColor: '#d97706',
            width: '50%',
            transformOrigin: 'left center',
          }}
        >
          <div className="w-2 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, #f59e0b, #b45309)' }} />
        </div>
        {/* Right door */}
        <div
          className={`absolute inset-0 rounded-2xl border-4 flex items-center justify-start pl-2 ${phase !== 'lock' ? 'vault-door-right opening' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            borderColor: '#d97706',
            left: '50%',
            width: '50%',
            transformOrigin: 'right center',
          }}
        >
          <div className="w-2 h-16 rounded-full" style={{ background: 'linear-gradient(180deg, #b45309, #f59e0b)' }} />
        </div>

        {/* Center glow when opening */}
        {phase !== 'lock' && (
          <div
            className="absolute inset-0 rounded-2xl animate-vault-glow"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.6) 0%, transparent 70%)',
              zIndex: 10,
            }}
          />
        )}

        {/* Lock icon */}
        {phase === 'lock' && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-5xl animate-float">🔐</div>
          </div>
        )}
      </div>

      {/* Text */}
      <div
        className="mt-8 text-center transition-all duration-500"
        style={{ opacity: phase === 'reveal' ? 1 : 0.6, transform: phase === 'reveal' ? 'translateY(0)' : 'translateY(4px)' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#f59e0b' }}>GuptDhan</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(251,191,36,0.6)' }}>
          {phase === 'lock' ? 'Unlocking...' : phase === 'opening' ? 'Opening vault...' : 'Aapka digital khazana ✨'}
        </p>
      </div>
    </div>
  );
}

interface SensitiveVaultAnimationProps {
  onComplete: () => void;
}

export function SensitiveVaultAnimation({ onComplete }: SensitiveVaultAnimationProps) {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 700);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="text-4xl animate-lock-unlock mb-3">🔐</div>
      <p className="text-sm font-medium" style={{ color: 'rgba(245,158,11,0.8)' }}>Unlocking sensitive vault...</p>
    </div>
  );
}
