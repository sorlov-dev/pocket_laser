import { useState } from 'react'
import { useStore, deriveHint, selectNozzle, NOZZLES, type NozzleId } from '../stateMachine'

// Tiny inline previews of each cap's pattern for the side list.
function PatternIcon({ id }: { id: NozzleId }) {
  switch (id) {
    case 'hearts':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20z"
            fill="currentColor"
          />
        </svg>
      )
    case 'stars':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2l2.6 6.3L21 9l-5 4.3L17.5 20 12 16.4 6.5 20 8 13.3 3 9l6.4-.7z"
            fill="currentColor"
          />
        </svg>
      )
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          {[6, 12, 18].map((y) =>
            [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />)
          )}
        </svg>
      )
    case 'spiral':
      return (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 12m0 0a1 1 0 1 1 1 1 3 3 0 0 1-3-3 5 5 0 0 1 5-5 7 7 0 0 1 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}

export function UI() {
  const hint = useStore((s) => deriveHint(s))
  const tip = useStore((s) => s.tipNozzle)
  const rotatedOnce = useStore((s) => s.rotatedOnce)
  const firing = useStore((s) => s.mode === 'aiming')
  const [copied, setCopied] = useState(false)

  function flashCopied() {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  function share() {
    const url = window.location.href
    // Mobile: hand off to the native share sheet.
    if (navigator.share) {
      navigator
        .share({
          title: 'Laser Pointer',
          text: 'A retro keychain laser you can twist, fire, and play with.',
          url,
        })
        .catch(() => {})
      return
    }
    // Desktop: copy the link. The async Clipboard API needs a secure context;
    // fall back to the legacy execCommand path for older / non-secure browsers.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(flashCopied).catch(() => {})
      return
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      if (document.execCommand('copy')) flashCopied()
      ta.remove()
    } catch {
      /* no clipboard available — nothing more we can do */
    }
  }

  return (
    <>
      <header className={`title ${firing ? 'dim' : ''}`}>
        <h1>Laser Pointer</h1>
        <p>Keychain laser · made in China · sold everywhere</p>
      </header>

      <nav className={`links ${firing ? 'dim' : ''}`} aria-label="Links">
        <a
          className="tg"
          href="https://t.me/orlovsdev"
          target="_blank"
          rel="noopener noreferrer"
          title="Telegram"
          aria-label="Telegram channel"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
              fill="currentColor"
            />
          </svg>
          <span className="tg-label">Telegram channel</span>
        </a>
        <button className="share" onClick={share} title="Share" aria-label="Share this toy">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
        </button>
        <span className={`copied ${copied ? 'show' : ''}`} role="status" aria-live="polite">
          Link copied
        </span>
      </nav>

      <p className={`lore ${rotatedOnce || firing ? 'gone' : ''}`}>
        The pocket laser every desk drawer once held.
        <br />
        Pick it up — it comes apart.
      </p>

      <nav className={`caps ${firing ? 'dim' : ''}`} aria-label="Pattern caps">
        {NOZZLES.map((n, i) => (
          <button
            key={n.id}
            className={i === tip ? 'cap on' : 'cap'}
            onClick={() => selectNozzle(i)}
            title={`${n.label} pattern`}
          >
            <span className="cap-ico">
              <PatternIcon id={n.id} />
            </span>
            <span className="cap-label">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className={hint ? 'hint show' : 'hint'} key={hint || 'x'}>
        {hint}
      </div>
    </>
  )
}
