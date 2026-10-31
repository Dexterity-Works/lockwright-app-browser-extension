#!/usr/bin/env node
// Zip the Chromium Vite build for Chrome Web Store upload.
//
// Usage:
//   pnpm run build && node scripts/package-chrome.mjs
//   pnpm run build:chrome
//
// Writes dist-chrome.zip at the repo root. manifest.json is at the zip root.
// Leaves dist/ untouched (Load unpacked still uses that directory).
// With LOCKWRIGHT_PROFILE=<name> it zips dist-profile-<name>/ to
// dist-profile-<name>-chrome.zip instead.

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { zipDirectory } from './package-firefox.mjs'
import { readProfile } from './profile.mjs'

const __filename = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(__filename), '..')

export function packageChrome({
  distDir = path.join(repoRoot, 'dist'),
  zipPath = path.join(repoRoot, 'dist-chrome.zip')
} = {}) {
  if (!existsSync(distDir) || !existsSync(path.join(distDir, 'manifest.json'))) {
    throw new Error(
      `Missing ${path.relative(repoRoot, distDir)}/manifest.json — run \`pnpm run build\` first`
    )
  }

  zipDirectory(distDir, zipPath)
  return { distDir, zipPath }
}

export function chromePackagePaths(profile = readProfile()) {
  if (!profile) return undefined
  const distDir = path.join(repoRoot, profile.outDir)
  return { distDir, zipPath: `${distDir}-chrome.zip` }
}

function main() {
  const { zipPath } = packageChrome(chromePackagePaths())
  console.log(`[package-chrome] wrote ${path.relative(repoRoot, zipPath)}`)
}

const isCli =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isCli) {
  try {
    main()
  } catch (err) {
    console.error(`[package-chrome] ${err.message}`)
    process.exit(1)
  }
}
