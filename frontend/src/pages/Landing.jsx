import { Link } from 'react-router-dom'

// ── Shared tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#F5F3EE',
  surface: '#EDEAE2',
  dark:    '#1A1917',
  red:     '#D84A1B',
  blue:    '#1B6BD8',
  green:   '#1A7A4A',
  amber:   '#C47A10',
  muted:   '#8A8780',
  border:  'rgba(26,25,23,0.12)',
}

const mono = "'IBM Plex Mono', monospace"
const syne = "'Syne', sans-serif"

// ── Reusable pieces ───────────────────────────────────────────────────────────
function Tag({ children, color = C.red }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
      fontFamily: mono, color,
      border: `1px solid ${color}`,
      padding: '3px 8px',
    }}>
      {children}
    </span>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '0' }} />
}

function CtaBtn({ to, children, primary = true }) {
  return (
    <Link to={to} style={{
      display: 'inline-block',
      padding: '14px 32px',
      fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
      background: primary ? C.dark : 'transparent',
      color: primary ? '#F5F3EE' : C.dark,
      border: `1px solid ${primary ? C.dark : C.border}`,
      textDecoration: 'none',
      transition: 'opacity 0.15s',
    }}>
      {children}
    </Link>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function LandingNav() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: C.dark,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: 56,
      borderBottom: '1px solid rgba(245,243,238,0.08)',
    }}>
      <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 20, color: '#F5F3EE', letterSpacing: '-0.02em' }}>
        Price<span style={{ color: C.red }}>Sentinel</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/login" style={{
          fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'rgba(245,243,238,0.5)', textDecoration: 'none', padding: '8px 16px',
        }}>
          Sign In
        </Link>
        <Link to="/register" style={{
          fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: C.red, color: '#fff', textDecoration: 'none', padding: '8px 20px',
        }}>
          Get Started →
        </Link>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: C.dark, padding: '80px 48px 72px', position: 'relative', overflow: 'hidden' }}>
      {/* Grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(245,243,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,243,238,1) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        <div style={{ marginBottom: 24 }}>
          <Tag color={C.red}>Live · Amazon India · Industrial Bearings</Tag>
        </div>

        <h1 style={{
          fontFamily: syne, fontWeight: 800, fontSize: 'clamp(40px, 6vw, 76px)',
          letterSpacing: '-0.04em', lineHeight: 0.95,
          color: '#F5F3EE', margin: '0 0 28px',
        }}>
          KNOW EVERY<br />
          PRICE MOVE<br />
          <span style={{ color: C.red }}>BEFORE IT HURTS.</span>
        </h1>

        <p style={{
          fontFamily: mono, fontSize: 14, color: 'rgba(245,243,238,0.55)',
          lineHeight: 1.7, maxWidth: 520, margin: '0 0 40px',
        }}>
          PriceSentinel watches Amazon bearing prices across every Indian city, 24/7.
          The moment a competitor drops their price or steals your Buy Box,
          you get a WhatsApp alert — with context and a clear action to take.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <CtaBtn to="/register" primary>Start Free →</CtaBtn>
          <CtaBtn to="/login" primary={false}>Sign In</CtaBtn>
        </div>

        {/* Live ticker */}
        <div style={{
          marginTop: 56, display: 'flex', gap: 0,
          border: '1px solid rgba(245,243,238,0.1)',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Cities Monitored', value: '12+' },
            { label: 'Bearing Models', value: '6205–6210' },
            { label: 'Alert Latency', value: '< 60s' },
            { label: 'Languages', value: '8' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              flex: '1 1 140px', padding: '20px 24px',
              borderRight: i < arr.length - 1 ? '1px solid rgba(245,243,238,0.1)' : 'none',
            }}>
              <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 28, color: '#F5F3EE', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(245,243,238,0.4)', marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Problem strip ─────────────────────────────────────────────────────────────
function ProblemStrip() {
  const items = [
    { icon: '?', text: 'You find out a competitor dropped their price — after you already lost sales.' },
    { icon: '?', text: 'You check Amazon manually, city by city, model by model. Every day.' },
    { icon: '?', text: 'You have no idea who owns the Buy Box in Chennai vs Mumbai right now.' },
    { icon: '?', text: 'By the time you react to a price war, margins are already gone.' },
  ]
  return (
    <section style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 48px' }}>
        <div style={{ marginBottom: 40 }}>
          <Tag color={C.muted}>The Problem</Tag>
          <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em', color: C.dark, margin: '16px 0 0' }}>
            Selling bearings on Amazon India<br />is a reaction game. You're always late.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {items.map((item, i) => (
            <div key={i} style={{
              padding: '24px 20px',
              borderRight: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
              background: C.bg,
            }}>
              <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 28, color: C.red, marginBottom: 12 }}>
                {item.icon}
              </div>
              <div style={{ fontFamily: mono, fontSize: 12, color: '#4A4845', lineHeight: 1.7 }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Scraper runs every hour',
      body: 'Our spider hits Amazon with real Indian PIN codes — Chennai, Mumbai, Delhi, Bangalore and 8 more cities — and records the Buy Box price, seller, and FBA status for every bearing model.',
    },
    {
      n: '02',
      title: 'Intelligence engine fires',
      body: 'Every new price record is compared against the last. Price drop > 5%? Buy Box changed hands? Three drops in six hours? Each condition triggers a specific, named alert.',
    },
    {
      n: '03',
      title: 'You get a WhatsApp message',
      body: 'Not just "price changed." A full message: what happened, what it means for your position, and a concrete action — hold, drop by ₹2, or push inventory now.',
    },
    {
      n: '04',
      title: 'You decide in seconds',
      body: 'Open the dashboard to see the full picture — geo price map, seller leaderboard, trend charts, ML price predictor. Everything you need to act fast and protect margin.',
    },
  ]
  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <div style={{ marginBottom: 48 }}>
          <Tag color={C.blue}>How It Works</Tag>
          <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em', color: C.dark, margin: '16px 0 0' }}>
            From price change to WhatsApp alert<br />in under 60 seconds.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: '28px 24px',
              borderRight: i < steps.length - 1 ? `1px solid ${C.border}` : 'none',
              background: i % 2 === 0 ? C.surface : C.bg,
              position: 'relative',
            }}>
              <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 40, color: C.border, lineHeight: 1, marginBottom: 16 }}>
                {s.n}
              </div>
              <div style={{ fontFamily: syne, fontWeight: 700, fontSize: 15, color: C.dark, marginBottom: 10 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#4A4845', lineHeight: 1.8 }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features grid ─────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: '◈',
      color: C.blue,
      title: 'Geo Price Intelligence',
      body: 'See the exact Buy Box price Amazon shows in Chennai, Mumbai, Delhi, Bangalore and 8 more cities — simultaneously. Prices vary by PIN code. We track all of them.',
    },
    {
      icon: '⚑',
      color: C.red,
      title: 'Price War Detection',
      body: 'When three or more price drops hit the same ASIN in six hours, we flag it as a price war. You get a warning before you react and destroy your own margin.',
    },
    {
      icon: '▣',
      color: C.amber,
      title: 'Buy Box Timeline',
      body: 'See exactly who held the Buy Box, for how long, and at what price — across every city. Know which sellers are your real competition and which are noise.',
    },
    {
      icon: '📦',
      color: C.green,
      title: 'Stockout Signals',
      body: 'A sudden price spike usually means a competitor ran out of stock. We detect it and alert you immediately — so you can push your inventory while demand is high.',
    },
    {
      icon: '🎯',
      color: C.blue,
      title: 'ML Price Predictor',
      body: 'Enter your cost price and ASIN. Our model sweeps 20 price points and tells you the exact price that maximises your Buy Box win probability and expected profit.',
    },
    {
      icon: '📱',
      color: C.green,
      title: 'WhatsApp Alerts in Your Language',
      body: 'Alerts arrive on WhatsApp in Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, or English — with a voice note. Set your language once, change anytime.',
    },
  ]
  return (
    <section style={{ background: C.dark, borderBottom: `1px solid rgba(245,243,238,0.08)` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <div style={{ marginBottom: 48 }}>
          <Tag color={C.red}>Features</Tag>
          <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em', color: '#F5F3EE', margin: '16px 0 0' }}>
            Everything a bearing distributor<br />needs to stay ahead on Amazon.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 1, background: 'rgba(245,243,238,0.08)' }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: C.dark, padding: '28px 28px' }}>
              <div style={{ fontSize: 22, marginBottom: 14, color: f.color }}>{f.icon}</div>
              <div style={{ fontFamily: syne, fontWeight: 700, fontSize: 15, color: '#F5F3EE', marginBottom: 10 }}>
                {f.title}
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(245,243,238,0.5)', lineHeight: 1.8 }}>
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Alert preview ─────────────────────────────────────────────────────────────
function AlertPreview() {
  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>

          {/* Left — copy */}
          <div>
            <Tag color={C.green}>WhatsApp Alerts</Tag>
            <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(22px, 2.5vw, 32px)', letterSpacing: '-0.03em', color: C.dark, margin: '16px 0 16px' }}>
              Not just a number.<br />A full briefing.
            </h2>
            <p style={{ fontFamily: mono, fontSize: 12, color: '#4A4845', lineHeight: 1.8, margin: '0 0 24px' }}>
              Most price trackers send "price changed to ₹650." That's useless.
              PriceSentinel tells you <em>who</em> changed it, <em>why it matters</em>,
              and <em>exactly what to do</em> — in your language, with a voice note.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '🔴', label: 'Price Drop', desc: 'Competitor dropped ₹180. Here\'s whether to match them.' },
                { icon: '🟠', label: 'Buy Box Lost', desc: 'Who took it, at what price, and how to get it back.' },
                { icon: '📦', label: 'Stockout Signal', desc: 'Their price spiked 30%. Push your stock now.' },
                { icon: '⚑',  label: 'Price War', desc: '4 drops in 6 hours. Wait — don\'t react yet.' },
              ].map(a => (
                <div key={a.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.dark }}>{a.label}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 2 }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock WhatsApp message */}
          <div>
            <div style={{
              background: '#ECE5DD',
              border: `1px solid ${C.border}`,
              padding: '0',
              fontFamily: mono,
              overflow: 'hidden',
            }}>
              {/* WA header */}
              <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>PriceSentinel</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>online</div>
                </div>
              </div>
              {/* Message bubble */}
              <div style={{ padding: '16px 12px' }}>
                <div style={{
                  background: '#fff', padding: '12px 14px', maxWidth: '85%',
                  borderRadius: '0 8px 8px 8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: 12, lineHeight: 1.7, color: '#1A1917',
                }}>
                  <div style={{ marginBottom: 6 }}>🔴 <strong>PriceSentinel Alert</strong></div>
                  <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
                  <div style={{ marginBottom: 6 }}>Hi Rajesh,</div>
                  <div style={{ marginBottom: 8 }}>
                    A competitor just dropped their price in <strong>CHENNAI</strong>.
                  </div>
                  <div style={{ marginBottom: 4 }}>Previous price: <strong>₹1,240</strong></div>
                  <div style={{ marginBottom: 4 }}>New price: <strong style={{ color: '#D84A1B' }}>₹1,060</strong></div>
                  <div style={{ marginBottom: 10 }}>Drop: <strong>14.5% lower</strong></div>
                  <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
                  <div style={{ marginBottom: 6, fontSize: 11, color: '#4A4845' }}>
                    <strong>What this means:</strong> Their listing is now cheaper. If they hold the Buy Box, your sales may slow down.
                  </div>
                  <div style={{ fontSize: 11, color: '#1A7A4A' }}>
                    <strong>Suggested action:</strong> Lower to ₹1,058 to recapture the Buy Box. Check your floor price first.
                  </div>
                  <div style={{ borderTop: '1px solid #eee', margin: '8px 0' }} />
                  <div style={{ fontSize: 10, color: '#8A8780' }}>ASIN: B07XYZ1234 · CHENNAI</div>
                  <div style={{ fontSize: 10, color: '#8A8780' }}>Reply LANG to change language</div>
                  <div style={{ textAlign: 'right', fontSize: 10, color: '#8A8780', marginTop: 6 }}>10:42 AM ✓✓</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Analytics preview ─────────────────────────────────────────────────────────
function DashboardPreview() {
  const modules = [
    { label: 'Overview', icon: '◈', desc: 'KPIs, price trend, FBA split, region bar chart — all in one view.' },
    { label: 'Geo Prices', icon: '⊕', desc: 'Cheapest city, price spread by region, full location table.' },
    { label: 'Sellers', icon: '▣', desc: 'Leaderboard, win counts, FBA vs non-FBA, price range per seller.' },
    { label: 'Trend', icon: '↗', desc: 'Multi-city price lines, scrape volume, model distribution.' },
    { label: 'Buy Box', icon: '⬡', desc: 'Who held it, for how long, at what price — full timeline.' },
    { label: 'ML Predict', icon: '🎯', desc: 'Win probability curve across 20 price points. Best price highlighted.' },
  ]
  return (
    <section style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 48px' }}>
        <div style={{ marginBottom: 48 }}>
          <Tag color={C.amber}>Dashboard</Tag>
          <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em', color: C.dark, margin: '16px 0 0' }}>
            Six views. Every angle covered.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
          {modules.map((m, i) => (
            <div key={i} style={{
              padding: '24px 20px', background: C.bg,
              borderRight: (i + 1) % 3 !== 0 ? `1px solid ${C.border}` : 'none',
              borderBottom: i < modules.length - 3 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 16, color: C.red }}>{m.icon}</span>
                <span style={{ fontFamily: syne, fontWeight: 700, fontSize: 13, color: C.dark }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#4A4845', lineHeight: 1.7 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section style={{ background: C.dark }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px', textAlign: 'center' }}>
        <Tag color={C.red}>Free to Start</Tag>
        <h2 style={{ fontFamily: syne, fontWeight: 800, fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.04em', color: '#F5F3EE', margin: '20px 0 16px', lineHeight: 1 }}>
          Stop reacting.<br />Start anticipating.
        </h2>
        <p style={{ fontFamily: mono, fontSize: 13, color: 'rgba(245,243,238,0.5)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 40px' }}>
          Register with your WhatsApp number. Set your first alert rule in under two minutes.
          The next price move won't catch you off guard.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <CtaBtn to="/register" primary>Create Free Account →</CtaBtn>
          <CtaBtn to="/login" primary={false}>Sign In</CtaBtn>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.dark, borderTop: '1px solid rgba(245,243,238,0.08)', padding: '24px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: syne, fontWeight: 800, fontSize: 15, color: '#F5F3EE', letterSpacing: '-0.02em' }}>
          Price<span style={{ color: C.red }}>Sentinel</span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(245,243,238,0.3)', letterSpacing: '0.06em' }}>
          AMAZON BEARING PRICE INTELLIGENCE · INDIA
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <LandingNav />
      <Hero />
      <ProblemStrip />
      <HowItWorks />
      <Features />
      <AlertPreview />
      <DashboardPreview />
      <CtaSection />
      <Footer />
    </div>
  )
}
