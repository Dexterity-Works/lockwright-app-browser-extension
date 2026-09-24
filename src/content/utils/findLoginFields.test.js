import { findLoginFields } from './findLoginFields'

describe('findLoginFields', () => {
  beforeEach(() => {
    // jsdom lays everything out at 0x0; give fields a visible size.
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 200, height: 30 })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('finds type=password with unrelated name as passwordField', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="q" id="pwd" />
      </form>
    `

    const { passwordField, usernameField } = findLoginFields()

    expect(passwordField).toBe(document.getElementById('pwd'))
    expect(usernameField).toBeTruthy()
    expect(usernameField.name).toBe('username')
  })

  it('finds type=email with no email keyword as usernameField', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="e" id="email" />
        <input type="password" name="q" id="pwd" />
      </form>
    `

    const { usernameField, passwordField } = findLoginFields()

    expect(usernameField).toBe(document.getElementById('email'))
    expect(passwordField).toBe(document.getElementById('pwd'))
  })

  it('scopes to preferredElement form when multiple forms exist', () => {
    document.body.innerHTML = `
      <form id="form1">
        <input type="email" name="e1" id="email1" />
        <input type="password" name="q1" id="pwd1" />
      </form>
      <form id="form2">
        <input type="email" name="e2" id="email2" />
        <input type="password" name="q2" id="pwd2" />
      </form>
    `

    const preferred = document.getElementById('pwd2')
    const { usernameField, passwordField } = findLoginFields(preferred)

    expect(passwordField).toBe(document.getElementById('pwd2'))
    expect(usernameField).toBe(document.getElementById('email2'))
  })

  it('picks a preceding text input in the form when username heuristics miss', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="acct" id="acct" />
        <input type="password" name="q" id="pwd" />
      </form>
    `

    const { usernameField, passwordField } = findLoginFields()

    expect(passwordField).toBe(document.getElementById('pwd'))
    expect(usernameField).toBe(document.getElementById('acct'))
  })

  it('does not use a search field as the preceding username', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="search" id="search" placeholder="Search" />
        <input type="password" name="q" id="pwd" />
      </form>
    `

    const { usernameField, passwordField } = findLoginFields()

    expect(passwordField).toBe(document.getElementById('pwd'))
    expect(usernameField).not.toBe(document.getElementById('search'))
  })

  it('does not treat a passport field as a password', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="passport" id="passport" />
      </form>
    `

    const { passwordField } = findLoginFields()

    expect(passwordField).toBeNull()
  })
})
