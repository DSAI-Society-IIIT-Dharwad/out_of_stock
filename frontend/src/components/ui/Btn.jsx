export function BtnPrimary({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-[#1A1917] text-[#F5F3EE] border-0 px-4 py-2 font-mono text-[11px] tracking-[0.06em] uppercase cursor-pointer hover:bg-[#2d2c2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </button>
  )
}

export function BtnSecondary({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-transparent text-[#1A1917] border border-[rgba(26,25,23,0.3)] px-4 py-2 font-mono text-[11px] tracking-[0.06em] uppercase cursor-pointer hover:border-[#1A1917] disabled:opacity-40 transition-colors ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </button>
  )
}

export function BtnDanger({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-[#D84A1B] text-white border-0 px-4 py-2 font-mono text-[11px] tracking-[0.06em] uppercase cursor-pointer hover:bg-[#c04218] disabled:opacity-40 transition-colors ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </button>
  )
}
