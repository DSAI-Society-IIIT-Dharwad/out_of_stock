export default function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-[#EDEAE2] border border-[rgba(26,25,23,0.12)] p-4 ${className}`}
      style={{ borderRadius: 0 }}
    >
      {children}
    </div>
  )
}
