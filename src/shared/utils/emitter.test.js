import { Emitter } from './emitter'

describe('Emitter', () => {
  it('delivers events to listeners and stops after off', () => {
    const emitter = new Emitter()
    const seen = []
    const listener = (payload) => seen.push(payload)

    emitter.on('update', listener)
    expect(emitter.emit('update', 1)).toBe(true)
    emitter.off('update', listener)
    expect(emitter.emit('update', 2)).toBe(false)

    expect(seen).toEqual([1])
    expect(emitter.listenerCount('update')).toBe(0)
  })

  it('emits newListener with the event name before adding the handler', () => {
    const emitter = new Emitter()
    const added = []
    emitter.on('newListener', (event) =>
      added.push([event, emitter.listenerCount(event)])
    )

    emitter.on('vault-access-revoked', () => {})

    expect(added).toEqual([['vault-access-revoked', 0]])
    expect(emitter.listenerCount('vault-access-revoked')).toBe(1)
  })

  it('lets a handler unsubscribe itself during emit', () => {
    const emitter = new Emitter()
    const calls = []
    const once = () => {
      calls.push('once')
      emitter.off('tick', once)
    }
    emitter.on('tick', once)
    emitter.on('tick', () => calls.push('other'))

    emitter.emit('tick')
    emitter.emit('tick')

    expect(calls).toEqual(['once', 'other', 'other'])
  })

  it('removeAllListeners clears one event or every event', () => {
    const emitter = new Emitter()
    emitter.on('a', () => {})
    emitter.on('b', () => {})

    emitter.removeAllListeners('a')
    expect(emitter.listenerCount('a')).toBe(0)
    expect(emitter.listenerCount('b')).toBe(1)

    emitter.removeAllListeners()
    expect(emitter.listenerCount('b')).toBe(0)
  })
})
