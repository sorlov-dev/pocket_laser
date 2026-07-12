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

  return (
    <>
      <header className={`title ${firing ? 'dim' : ''}`}>
        <h1>Laser Pointer, 1998</h1>
        <p>Keychain laser · made in China · sold everywhere</p>
      </header>

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
