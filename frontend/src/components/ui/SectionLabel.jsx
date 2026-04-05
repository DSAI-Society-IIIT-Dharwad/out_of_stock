export default function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#8A8780',
        fontFamily: "'IBM Plex Mono', monospace",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}
