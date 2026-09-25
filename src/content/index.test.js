jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: { LOGIN: 'login' }
}))

jest.mock('lockwright-lib-constants', () => ({
  MANIFEST_NAME: 'com.lockwright.test',
  MS_PER_SECOND: 1000
}))

jest.mock('./utils/showPasswordStrengthNearField', () => ({
  showPasswordStrengthNearField: jest.fn()
}))

jest.mock('./utils/isContentScriptEnabled', () => ({
  isContentScriptEnabled: async () => true,
  isExtensionContextValid: () => true
}))

const autofillLogin = async () => {
  const [listener] = chrome.runtime.onMessage.addListener.mock.calls.at(-1)
  await listener({
    type: 'autofillFromAction',
    recordType: 'login',
    data: { username: 'alice', password: 's3cret' }
  })
}

const layOut = (element, width, height) => {
  element.getBoundingClientRect = () => ({ width, height })
}

beforeAll(async () => {
  chrome.runtime.sendMessage.mockResolvedValue({})
  chrome.runtime.getURL = jest.fn(() => '')
  await import('./index')
})

afterEach(() => {
  jest.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('content script autofill from action', () => {
  it('fills only visible login fields in the top frame', async () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" id="user" />
        <input type="password" name="trap" id="trap" style="visibility: hidden" />
        <input type="password" name="collapsed" id="collapsed" />
        <input type="password" name="password" id="pwd" />
      </form>
    `
    for (const id of ['user', 'trap', 'pwd']) {
      layOut(document.getElementById(id), 200, 30)
    }
    layOut(document.getElementById('collapsed'), 0, 0)

    await autofillLogin()

    expect(document.getElementById('user').value).toBe('alice')
    expect(document.getElementById('pwd').value).toBe('s3cret')
    expect(document.getElementById('trap').value).toBe('')
    expect(document.getElementById('collapsed').value).toBe('')
  })

  it('ignores autofill in a child frame', async () => {
    jest.spyOn(window, 'top', 'get').mockReturnValue({})
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" id="user" />
        <input type="password" name="password" id="pwd" />
      </form>
    `
    layOut(document.getElementById('user'), 200, 30)
    layOut(document.getElementById('pwd'), 200, 30)

    await autofillLogin()

    expect(document.getElementById('user').value).toBe('')
    expect(document.getElementById('pwd').value).toBe('')
  })
})

describe('content script passkey results', () => {
  const fromBackground = async (msg) => {
    const [listener] = chrome.runtime.onMessage.addListener.mock.calls.at(-1)
    await listener(msg)
  }

  const fromPage = async (data) => {
    window.dispatchEvent(new MessageEvent('message', { data, source: window }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  it('ignores a result for a request it never forwarded', async () => {
    const postMessage = jest.spyOn(window, 'postMessage')

    await fromBackground({
      type: 'gotPasskey',
      requestId: 'never-seen',
      credential: { id: 'x' }
    })

    expect(postMessage).not.toHaveBeenCalled()
  })

  it('posts a forwarded result to the page origin only', async () => {
    const postMessage = jest.spyOn(window, 'postMessage')
    chrome.runtime.sendMessage.mockResolvedValue({ success: true })

    await fromPage({
      source: 'pearpass',
      type: 'getPasskey',
      requestId: 'r-1',
      publicKey: { challenge: 'c' }
    })
    await fromBackground({
      type: 'gotPasskey',
      requestId: 'r-1',
      credential: { id: 'x' }
    })

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'gotPasskey', requestId: 'r-1', credential: { id: 'x' } },
      window.location.origin
    )
  })
})
