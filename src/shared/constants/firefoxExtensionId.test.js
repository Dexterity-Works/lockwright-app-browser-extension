import { existsSync, readFileSync } from 'fs'
import path from 'path'

import {
  FIREFOX_EXTENSION_ID,
  FIREFOX_NIGHTLY_EXTENSION_ID,
  MANIFEST_NAME
} from '@tetherto/pearpass-lib-constants'

// Firefox requires the extension ID in browser_specific_settings.gecko.id to
// match allowed_extensions in the native messaging host manifest (written by
// the desktop app using FIREFOX_EXTENSION_ID). manifest.json is static JSON
// and cannot import the constant, so this test guards against drift.
describe('Firefox extension ID', () => {
  it('matches browser_specific_settings.gecko.id in public/manifest.json', () => {
    const manifestPath = path.resolve(
      __dirname,
      '../../../public/manifest.json'
    )
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

    expect(manifest.browser_specific_settings?.gecko?.id).toBe(
      'lockwright@dexterity.works'
    )
    expect(FIREFOX_EXTENSION_ID).toBe('lockwright@dexterity.works')
  })

  it('uses package name lockwright-app-browser-extension, not pearpass-app-browser-extension', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8')
    )
    expect(pkg.name).toBe('lockwright-app-browser-extension')
  })

  it('ships Lockwright name and description, not PearPass', () => {
    const manifestPath = path.resolve(
      __dirname,
      '../../../public/manifest.json'
    )
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

    expect(manifest.name).toBe('Lockwright')
    expect(manifest.description).toMatch(/Lockwright/)
    expect(manifest.name).not.toMatch(/PearPass/)
    expect(manifest.description).not.toMatch(/PearPass/)
  })

  it('uses Lockwright native host and nightly gecko ids', () => {
    expect(MANIFEST_NAME).toBe('works.dexterity.lockwright')
    expect(FIREFOX_NIGHTLY_EXTENSION_ID).toBe(
      'lockwright-nightly@dexterity.works'
    )
  })

  it('onboarding header logo is capped so the pair-code step stays on screen', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../onboarding/index.tsx'),
      'utf8'
    )
    expect(src).toContain('logo.svg')
    expect(src).toMatch(/h-\[50px\]/)
    expect(src).toMatch(/w-\[172px\]/)
    expect(src).not.toMatch(/gap-18/)
  })

  it('onboarding column shrinks below 600px so a phone tab is not clipped', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../onboarding/index.tsx'),
      'utf8'
    )
    expect(src).toMatch(/maxWidth:\s*ONBOARDING_DIALOG_WIDTH/)
    expect(src).not.toMatch(
      /style=\{\{\s*width:\s*ONBOARDING_DIALOG_WIDTH\s*\}\}/
    )
    expect(src).toMatch(/className="[^"]*w-full[^"]*min-w-0/)
  })

  it('onboarding wordmark is the hatch plate, not PearPass lime', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../../../public/assets/images/logo.svg'),
      'utf8'
    )
    expect(src).toContain('#b08d57')
    expect(src).toContain('Lockwright')
    expect(src).not.toMatch(/#B0D944|#BADE5B|PearPass/i)
  })

  it('onboarding copy says Lockwright, not Pearpass', () => {
    const dir = path.resolve(__dirname, '../../onboarding')
    const leftover = []
    for (const name of ['index.tsx', 'Step1Dialog.tsx']) {
      const src = readFileSync(path.join(dir, name), 'utf8')
      if (/Pearpass|PearPass/.test(src.replace(/PearpassLogo/g, ''))) {
        leftover.push(name)
      }
    }
    expect(leftover).toEqual([])
  })

  it('pins Lockwright libs to Thaoh git SHAs so a source zip installs without siblings', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8')
    )
    const pins = {
      '@tetherto/pearpass-lib-constants': 'lockwright-lib-constants',
      '@tetherto/pearpass-lib-ui-kit':
        'lockwright-lib-ui-react-native-components',
      '@tetherto/pearpass-lib-vault': 'lockwright-lib-vault'
    }

    for (const [name, repo] of Object.entries(pins)) {
      const spec = pkg.dependencies[name]
      expect(spec).toMatch(
        new RegExp(
          `^git\\+https://github\\.com/Thaoh/${repo}\\.git#[0-9a-f]{40}$`
        )
      )
      expect(spec).not.toMatch(/file:/)
      expect(spec).not.toMatch(/tetherto\//)
    }
  })

  it('declares gecko min 140 and matching icon pixel sizes', () => {
    const manifestPath = path.resolve(
      __dirname,
      '../../../public/manifest.json'
    )
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const publicDir = path.dirname(manifestPath)

    expect(manifest.browser_specific_settings.gecko.strict_min_version).toBe(
      '140.0'
    )
    expect(
      manifest.browser_specific_settings.gecko_android.strict_min_version
    ).toBe('142.0')
    expect(manifest.icons).toEqual({
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png'
    })
    for (const [size, file] of Object.entries(manifest.icons)) {
      const png = readFileSync(path.join(publicDir, file))
      expect(existsSync(path.join(publicDir, file))).toBe(true)
      expect(png.readUInt32BE(16)).toBe(Number(size))
      expect(png.readUInt32BE(20)).toBe(Number(size))
    }
    expect(manifest.action.default_icon).toEqual(manifest.icons)
  })
})
