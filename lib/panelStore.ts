// Module-level panel open/close state — shared between TopBar toggle and layout
let _open = false
const listeners = new Set<() => void>()

export function getPanelOpen() { return _open }
export function setPanelOpen(v: boolean) {
  _open = v
  listeners.forEach(l => l())
}
export function subscribePanelOpen(l: () => void): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
