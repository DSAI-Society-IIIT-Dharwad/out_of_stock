const styles = {
  PRICE_DROP:      { border: '#D84A1B', color: '#D84A1B', bg: 'rgba(216,74,27,0.08)' },
  BUYBOX_CHANGE:   { border: '#C47A10', color: '#C47A10', bg: 'rgba(196,122,16,0.08)' },
  PRICE_WAR:       { border: '#D84A1B', color: '#D84A1B', bg: 'rgba(216,74,27,0.12)' },
  STOCKOUT_SIGNAL: { border: '#1B6BD8', color: '#1B6BD8', bg: 'rgba(27,107,216,0.08)' },
  PRICE_RECOVERY:  { border: '#1A7A4A', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  default:         { border: 'rgba(26,25,23,0.3)', color: '#4A4845', bg: 'transparent' },
}

export default function Badge({ type, label }) {
  const s = styles[type] || styles.default
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        border: `1px solid ${s.border}`,
        color: s.color,
        background: s.bg,
        borderRadius: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {label || type?.replace('_', ' ')}
    </span>
  )
}
