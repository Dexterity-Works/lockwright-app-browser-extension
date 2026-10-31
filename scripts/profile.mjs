// Test-profile build. The extension it makes talks only to a desktop started
// with the same LOCKWRIGHT_PROFILE, never to the installed desktop.
//
// Usage:
//   LOCKWRIGHT_PROFILE=<name> pnpm run build
//
// Writes dist-profile-<name>/. Each vite config calls readProfile(); without
// LOCKWRIGHT_PROFILE it returns null, the configs add no plugin and keep
// outDir 'dist', so the normal build is unchanged.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

const PROFILE_NAME = /^[a-z0-9_]{1,24}$/
const PROFILE_GECKO_ID = 'lockwright-profile@dexterity.works'
const HOST_CONSTANTS_FILE = path.join(
  repoRoot,
  'src/shared/constants/nativeMessaging.js'
)
const HOST_NAME_SOURCE = 'HOST_NAME: MANIFEST_NAME'

// Public key only. Pins the Chrome extension ID of every profile build to
// degfjkbgcfkbfhhhecbdllgcokjgcdfb, which the desktop lists in the profile
// host manifest's allowed_origins.
const PROFILE_CHROME_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3d3pwajbHNeRQAnjewQzgjvzDP0JqmUvV7qcSdv2OHLCMNNDwsiRhbu9zuVIvP/i2EbKyJvVLSaSpGv76CRy+wMpGFPVpaqYYRB2jWhLp+rXG6WjIlY7a8uTJWjzTAezFrK4ePCbXJ8cPXa/6Gbcgxvn6mRyRO5DC0g5A7sjOcE8gzSmsxu6tq1r7s93Is9hGkr50hG/DryiW+vCJWVziinq/ur0lgMyap/a++4ynwXwqCcMOw4++ipCcdkkPEP/Gdjaw0Uup4SGUrjZ5nM0tzmzIAYdbH45t9dI0njCtr569rl0ocZ1/ST+994mXGNvznbKaD0IA0iM4CtZVcqZVQIDAQAB'

export function readProfile(env = process.env) {
  const name = env.LOCKWRIGHT_PROFILE
  if (name === undefined) return null
  if (!PROFILE_NAME.test(name)) {
    throw new Error(
      `LOCKWRIGHT_PROFILE='${name}' does not match ${PROFILE_NAME}`
    )
  }
  return {
    name,
    hostName: `works.dexterity.lockwright.profile_${name}`,
    outDir: `dist-profile-${name}`
  }
}

export function profileManifest(manifest, name) {
  return {
    ...manifest,
    name: `Lockwright (profile ${name})`,
    key: PROFILE_CHROME_KEY,
    browser_specific_settings: {
      ...manifest.browser_specific_settings,
      gecko: {
        ...manifest.browser_specific_settings.gecko,
        id: PROFILE_GECKO_ID
      }
    }
  }
}

// Spread into a vite config's plugins: [] for the normal build.
export function profilePlugins(profile) {
  if (!profile) return []
  const hostLiteral = JSON.stringify(profile.hostName)
  return [
    {
      name: 'lockwright-profile',
      enforce: 'pre',
      transform(code, id) {
        if (id.split('?')[0] !== HOST_CONSTANTS_FILE) return null
        if (!code.includes(HOST_NAME_SOURCE)) {
          this.error(
            `${HOST_NAME_SOURCE} not found in ${path.relative(repoRoot, id)}; the profile build cannot point the native host at ${profile.hostName}`
          )
        }
        return code.replace(HOST_NAME_SOURCE, `HOST_NAME: ${hostLiteral}`)
      },
      // Fails the build rather than ship a profile extension that could
      // reach the installed desktop's native host.
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (
            chunk.type === 'chunk' &&
            chunk.code.includes('connectNative(') &&
            !chunk.code.includes(hostLiteral)
          ) {
            this.error(
              `${chunk.fileName} calls connectNative without ${profile.hostName}`
            )
          }
        }
      },
      transformIndexHtml(_html, ctx) {
        if (path.basename(ctx.filename) !== 'index.html') return
        return [
          {
            tag: 'div',
            attrs: {
              'data-testid': 'profile-badge',
              style:
                'position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;padding:2px 6px;border-radius:4px;font:12px sans-serif;background:var(--color-primary);color:var(--color-on-primary)'
            },
            children: `profile ${profile.name}`,
            injectTo: 'body'
          }
        ]
      },
      // Vite copies public/ before writing, so this replaces that copy.
      writeBundle(options) {
        const manifest = JSON.parse(
          readFileSync(path.join(repoRoot, 'public/manifest.json'), 'utf8')
        )
        writeFileSync(
          path.join(options.dir, 'manifest.json'),
          JSON.stringify(profileManifest(manifest, profile.name), null, 2) +
            '\n'
        )
      }
    }
  ]
}
