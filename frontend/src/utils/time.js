/**
 * Format a UTC ISO string to IST display per design doc:
 * "HH:MM IST · Mon DD"
 */
export function toIST(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  const hh = String(ist.getUTCHours()).padStart(2, '0')
  const mm = String(ist.getUTCMinutes()).padStart(2, '0')
  const mon = ist.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })
  const dd = String(ist.getUTCDate()).padStart(2, '0')
  return `${hh}:${mm} IST · ${mon} ${dd}`
}

export function toISTFull(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
}
