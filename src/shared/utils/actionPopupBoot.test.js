import { readFileSync } from 'node:fs'
import path from 'node:path'

import { PASSKEY_PAGES } from '../constants/passkey'
import {
  mainExtensionWindowSize,
  passkeyWindowSize
} from '../constants/windowSizes'

const root = path.resolve(__dirname, '../../..')
const bootSource = readFileSync(
  path.join(root, 'public/boot-popup-size.js'),
  'utf8'
)
const indexHtml = readFileSync(path.join(root, 'index.html'), 'utf8')

const runBoot = (hash) => {
  document
    .querySelectorAll('style[data-lockwright-popup-size="boot"]')
    .forEach((node) => node.remove())

  const runner = new Function('location', 'document', bootSource)
  runner({ hash }, document)

  return document.head.querySelector('style[data-lockwright-popup-size="boot"]')
    .textContent
}

describe('action popup boot size', () => {
  it('sizes the toolbar popup in pixels before paint', () => {
    for (const hash of ['', '#/vault', '#/welcome']) {
      const css = runBoot(hash)

      expect(css).toContain(`width:${mainExtensionWindowSize.width}px`)
      expect(css).toContain(`height:${mainExtensionWindowSize.height}px`)
      expect(css).toContain(`min-width:${mainExtensionWindowSize.width}px`)
      expect(css).toContain(`min-height:${mainExtensionWindowSize.height}px`)
      expect(css).not.toMatch(/vw|vh/)
    }
  })

  it('sizes a passkey popup to the passkey window', () => {
    for (const page of PASSKEY_PAGES) {
      const css = runBoot(`#/${page}?requestId=1`)

      expect(css).toContain(`width:${passkeyWindowSize.width}px`)
      expect(css).toContain(`height:${passkeyWindowSize.initialHeight}px`)
      expect(css).not.toMatch(/vw|vh/)
    }
  })

  it('loads from the popup head as a classic script', () => {
    const head = indexHtml.slice(
      indexHtml.indexOf('<head>'),
      indexHtml.indexOf('</head>')
    )

    const style = head.match(
      /<style data-lockwright-popup-size="boot">[\s\S]*?<\/style>/
    )?.[0]

    expect(style).toContain(`${mainExtensionWindowSize.width}px`)
    expect(style).toContain(`${mainExtensionWindowSize.height}px`)
    expect(style).not.toMatch(/vw|vh/)
    expect(
      head.indexOf('<style data-lockwright-popup-size="boot">')
    ).toBeLessThan(head.indexOf('<script src="/boot-popup-size.js"></script>'))
    expect(head).toMatch(/<script src="\/boot-popup-size\.js"><\/script>/)
    expect(head).not.toMatch(/type=["']module["']/)
    expect(head).not.toMatch(/\bdefer\b/)
    expect(head).not.toMatch(/\basync\b/)
  })
})
