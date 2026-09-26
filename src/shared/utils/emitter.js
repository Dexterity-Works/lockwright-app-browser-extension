/**
 * Small stand-in for Node's EventEmitter. Keeps the semantics
 * lockwright-lib-vault relies on: 'newListener' fires before a handler is
 * added, and emit runs over a snapshot so a handler may unsubscribe mid-emit.
 */
export class Emitter {
  constructor() {
    this.listeners = new Map()
  }

  on(event, listener) {
    if (this.listeners.has('newListener')) {
      this.emit('newListener', event, listener)
    }
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(listener)
    return this
  }

  off(event, listener) {
    const list = this.listeners.get(event)
    const index = list ? list.lastIndexOf(listener) : -1
    if (index !== -1) list.splice(index, 1)
    return this
  }

  emit(event, ...args) {
    const list = this.listeners.get(event)
    if (!list?.length) return false
    for (const listener of [...list]) listener.apply(this, args)
    return true
  }

  listenerCount(event) {
    return this.listeners.get(event)?.length ?? 0
  }

  removeAllListeners(event) {
    if (event === undefined) this.listeners.clear()
    else this.listeners.delete(event)
    return this
  }
}
