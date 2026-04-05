export default function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`bg-[#F5F3EE] border border-[rgba(26,25,23,0.3)] text-[#1A1917] font-mono text-[11px] px-3 py-2 outline-none focus:border-[#1A1917] cursor-pointer ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </select>
  )
}
