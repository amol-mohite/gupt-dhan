export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl shadow-lg shadow-primary-500/30 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        {/* Treasure chest / vault icon */}
        <rect x="3" y="10" width="18" height="11" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="3" y="10" width="18" height="4" rx="1" fill="white" fillOpacity="0.5" />
        <path d="M3 12h18" stroke="rgba(180,83,9,0.4)" strokeWidth="1" />
        <rect x="10" y="13.5" width="4" height="3" rx="1" fill="rgba(180,83,9,0.7)" />
        <circle cx="12" cy="15" r="0.8" fill="rgba(180,83,9,0.9)" />
        {/* Lock shackle */}
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <rect x="3" y="10" width="18" height="11" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="3" y="10" width="18" height="4" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="10" y="13.5" width="4" height="3" rx="1" fill="rgba(180,83,9,0.7)" />
        <circle cx="12" cy="15" r="0.8" fill="rgba(180,83,9,0.9)" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
