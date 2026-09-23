import { createLogoAttachGuard } from './logoAttachGuard'

const field = (id) => ({
  id,
  isSameNode(other) {
    return other?.id === id
  }
})

describe('createLogoAttachGuard', () => {
  it('does not open another logo for the field that just closed one', () => {
    const guard = createLogoAttachGuard()
    const password = field('password')

    expect(guard.canAttach(password)).toBe(true)

    guard.onLogoClosed(password)

    expect(guard.canAttach(password)).toBe(false)
    expect(guard.onFocus(password)).toBe(false)
  })

  it('allows a logo again after focus moves to another field', () => {
    const guard = createLogoAttachGuard()
    const password = field('password')
    const username = field('username')

    guard.onLogoClosed(password)

    expect(guard.onFocus(username)).toBe(true)
    expect(guard.canAttach(password)).toBe(true)
    expect(guard.canAttach(username)).toBe(true)
  })
})
