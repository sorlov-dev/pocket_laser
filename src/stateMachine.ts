import { useSyncExternalStore } from 'react'

// Interaction modes. Object configuration (what's attached, how many batteries)
// lives in separate fields; `machineState()` derives the coarse state the UI
// talks about: idle | aiming | nozzle-unscrewing | nozzle-off | battery-cap-off | batteries-out.
export type Mode =
  | 'idle'
  | 'aiming'
  | 'nozzle-unscrewing'
  | 'nozzle-screwing'
  | 'cap-unscrewing'

export type NozzleId = 'hearts' | 'stars' | 'grid' | 'spiral'
export const NOZZLES: { id: NozzleId; label: string }[] = [
  { id: 'hearts', label: 'Hearts' },
  { id: 'stars', label: 'Stars' },
  { id: 'grid', label: 'Grid' },
  { id: 'spiral', label: 'Spiral' },
]

export interface State {
  mode: Mode
  tipNozzle: number | null // nozzle index at the tip (maybe mid-thread)
  tipTravel: number // 0 = screwed tight, 1 = threads free
  autoNozzle: boolean // auto screw-in animation running
  ejecting: number | null // nozzle index spinning off after an unscrew
  capLoc: 'tip' | 'parked' | 'fly-off' | 'fly-on'
  capTravel: number
  autoCap: boolean
  batteriesIn: number // 0..3
  buttonDown: boolean
  fired: boolean // laser has fired at least once (HELLO signature)
  rotatedOnce: boolean
  nozzleCycled: boolean // user has swapped a nozzle at least once
  everEjected: boolean // at least one battery has been tilted out
  touched: boolean // user has interacted with the object at all (hides callouts)
  flash: string | null // transient hint override
}

const initial: State = {
  mode: 'idle',
  tipNozzle: 0,
  tipTravel: 0,
  autoNozzle: false,
  ejecting: null,
  capLoc: 'tip',
  capTravel: 0,
  autoCap: false,
  batteriesIn: 3,
  buttonDown: false,
  fired: false,
  rotatedOnce: false,
  nozzleCycled: false,
  everEjected: false,
  touched: false,
  flash: null,
}

let state: State = initial
const listeners = new Set<() => void>()

// Dev-only escape hatch for driving the machine from the console.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('./refs').then(({ R }) => {
    ;(window as unknown as Record<string, unknown>).__laser = {
      getState: () => state,
      setState: (p: Partial<State>) => setState(p),
      R,
    }
  })
}

export function getState(): State {
  return state
}

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state))
}

export function laserReady(s: State = state): boolean {
  return s.batteriesIn === 3 && s.capLoc === 'tip' && s.capTravel <= 0.001
}

let flashTimer = 0
export function setFlash(text: string) {
  setState({ flash: text })
  window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => setState({ flash: null }), 2400)
}

// ---- transitions -----------------------------------------------------------

export function pressButton() {
  const s = state
  if (s.buttonDown) return
  if (laserReady(s)) {
    setState({ buttonDown: true, mode: 'aiming', touched: true })
  } else {
    setState({ buttonDown: true, mode: 'idle', touched: true })
    setFlash(s.batteriesIn < 3 ? 'Click. No cells, no laser.' : 'Click. Screw the cap all the way in.')
  }
}

export function releaseButton() {
  if (!state.buttonDown) return
  setState({ buttonDown: false, mode: state.mode === 'aiming' ? 'idle' : state.mode })
}

export function clickTipNozzle() {
  const s = state
  if (s.mode === 'idle' && s.tipNozzle !== null && !s.autoNozzle) {
    setState({ mode: 'nozzle-unscrewing', touched: true })
  }
}

// Quick swap from the side list — the new cap screws itself on.
export function selectNozzle(idx: number) {
  const s = state
  if (s.tipNozzle === idx && s.tipTravel <= 0.001 && !s.autoNozzle) return
  setState({
    tipNozzle: idx,
    tipTravel: 0.7,
    mode: 'idle',
    ejecting: null,
    autoNozzle: true,
    nozzleCycled: true,
    touched: true,
  })
}

export function clickCap() {
  const s = state
  if (s.capLoc === 'tip' && s.mode === 'idle' && !s.autoCap) {
    setState({ mode: 'cap-unscrewing', touched: true })
  } else if (s.capLoc === 'parked') {
    if (s.batteriesIn === 3) {
      setState({ capLoc: 'fly-on', touched: true })
    } else {
      setFlash('Put the cells back first')
    }
  }
}

export function capArrived() {
  const s = state
  if (s.capLoc === 'fly-off') setState({ capLoc: 'parked' })
  else if (s.capLoc === 'fly-on') setState({ capLoc: 'tip', capTravel: 1, autoCap: true })
}

export function cancelModes() {
  const m = state.mode
  if (m === 'nozzle-unscrewing' || m === 'nozzle-screwing' || m === 'cap-unscrewing') {
    setState({ mode: 'idle' })
  }
}

// Coarse machine state, per the project spec taxonomy.
export function machineState(s: State = state): string {
  if (s.mode === 'aiming') return 'aiming'
  if (s.mode === 'nozzle-unscrewing' || s.mode === 'nozzle-screwing') return 'nozzle-unscrewing'
  if (s.mode === 'cap-unscrewing') return 'cap-unscrewing'
  if (s.batteriesIn < 3) return 'batteries-out'
  if (s.capLoc !== 'tip') return 'battery-cap-off'
  if (s.tipNozzle === null) return 'nozzle-off'
  return 'idle'
}

export function deriveHint(s: State): string {
  if (s.flash) return s.flash
  switch (s.mode) {
    case 'aiming':
      return s.tipNozzle !== null
        ? 'Hold it — drift the mouse to look around'
        : 'No cap on — just a dot. Add a pattern cap'
    case 'nozzle-unscrewing':
      return 'Circle counter-clockwise to unscrew'
    case 'nozzle-screwing':
      return 'Circle clockwise to tighten — or click again'
    case 'cap-unscrewing':
      return 'Circle counter-clockwise, like a real thread'
  }
  if (s.batteriesIn < 3) {
    if (s.capLoc === 'tip') return 'Click the cap at the back'
    return s.batteriesIn > 0
      ? 'Tip it further — there are still cells inside'
      : 'Click a cell to slide it back in'
  }
  if (s.capLoc === 'parked') {
    return s.everEjected
      ? 'Click the cap — it screws itself back on'
      : 'Tip the pointer rear-end down to drop the cells'
  }
  if (s.capLoc !== 'tip') return ''
  if (s.tipNozzle === null && s.ejecting === null) return 'Pick a pattern cap to fit'
  if (!s.rotatedOnce) return 'Drag the pointer to turn it over'
  if (!s.fired) return 'Press and hold the brass button'
  if (!s.nozzleCycled) return 'Click the gold cap — it sits on a thread'
  return ''
}
