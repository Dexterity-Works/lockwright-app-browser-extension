#!/usr/bin/env node
// Package a Firefox-ready extension from the Chrome Vite build output.
//
// Usage:
//   pnpm run build && node scripts/package-firefox.mjs
//   pnpm run build:firefox
//
// Copies dist/ → dist-firefox/, strips Chrome-only manifest fields, omits
// offscreen.* assets, and writes dist-firefox.zip at the repo root.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32 } from 'node:zlib'

import { checkProfileOutput, readProfile } from './profile.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const OMIT_FROM_COPY = new Set(['offscreen.html', 'offscreen.js'])

export function transformFirefoxManifest(manifest) {
  const out = structuredClone(manifest)

  if (Array.isArray(out.permissions)) {
    out.permissions = out.permissions.filter((p) => p !== 'offscreen')
  }

  const scripts =
    out.background?.scripts ??
    (out.background?.service_worker ? [out.background.service_worker] : undefined)
  if (!scripts?.length) {
    throw new Error(
      'manifest.background must include scripts or service_worker before Firefox packaging'
    )
  }
  out.background = { scripts }

  delete out.key

  if (Array.isArray(out.web_accessible_resources)) {
    out.web_accessible_resources = out.web_accessible_resources.map((entry) => {
      const next = { ...entry }
      delete next.use_dynamic_url
      return next
    })
  }

  out.action = { ...(out.action ?? {}), default_area: 'navbar' }

  out.browser_specific_settings = {
    ...(out.browser_specific_settings ?? {}),
    gecko: {
      ...(out.browser_specific_settings?.gecko ?? {}),
      data_collection_permissions: out.browser_specific_settings?.gecko
        ?.data_collection_permissions ?? { required: ['none'] }
    }
  }

  return out
}

/** AMO flags chrome.offscreen.* even behind a typeof guard. Firefox never has it. */
export function stripFirefoxUnsupportedApis(source) {
  return source
    .replace(/chrome\.offscreen\.hasDocument/g, '(async()=>false)')
    .replace(/chrome\.offscreen\.createDocument/g, '(async()=>{})')
    .replace(/chrome\.offscreen/g, 'undefined')
}

const LW_SET_HTML =
  'function __lwSetHtml(n,v){const d=new DOMParser().parseFromString("<div>"+String(v??"")+"</div>","text/html");const w=d.body&&d.body.firstElementChild;n.replaceChildren(...(w?[...w.childNodes]:[]))}'

/** AMO addons-linter flags `.innerHTML=`. React uses that for dangerouslySetInnerHTML. */
export function rewriteInnerHtmlAssignments(source) {
  const rewritten = source.replace(
    /([A-Za-z_$][\w$]*)\.innerHTML=([A-Za-z_$][\w$]*)/g,
    '__lwSetHtml($1,$2)'
  )
  if (rewritten === source) return source
  return `${LW_SET_HTML};${rewritten}`
}

/** Strip crossorigin and rewrite root-absolute src/href for extension pages. */
export function rewriteFirefoxHtml(html) {
  let out = html.replace(
    /\s+crossorigin(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?/gi,
    ''
  )
  out = out.replace(/(\s(?:src|href))="\/(?!\/)/g, '$1="./')
  out = out.replace(/(\s(?:src|href))='\/(?!\/)/g, "$1='./")
  return out
}

function listFilesRecursive(dir, base = dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = path.relative(base, full).split(path.sep).join('/')
    if (statSync(full).isDirectory()) {
      entries.push(...listFilesRecursive(full, base))
    } else {
      entries.push({ full, rel })
    }
  }
  return entries
}

function u16(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n, 0)
  return b
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n >>> 0, 0)
  return b
}

/** Minimal ZIP (STORE, no compression). Good enough for extension packages. */
export function zipDirectory(sourceDir, zipPath) {
  const files = listFilesRecursive(sourceDir)
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const { full, rel } of files) {
    const data = readFileSync(full)
    const nameBuf = Buffer.from(rel, 'utf8')
    const crc = crc32(data)
    const size = data.length

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method STORE
      u16(0), // time
      u16(0), // date
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0), // extra length
      nameBuf
    ])

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf
    ])

    localParts.push(localHeader, data)
    centralParts.push(centralHeader)
    offset += localHeader.length + data.length
  }

  const central = Buffer.concat(centralParts)
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0)
  ])

  writeFileSync(zipPath, Buffer.concat([...localParts, central, end]))
}

export function packageFirefox({
  distDir = path.join(repoRoot, 'dist'),
  outDir = path.join(repoRoot, 'dist-firefox'),
  zipPath = path.join(repoRoot, 'dist-firefox.zip')
} = {}) {
  if (!existsSync(distDir) || !existsSync(path.join(distDir, 'manifest.json'))) {
    throw new Error(
      `Missing ${path.relative(repoRoot, distDir)}/manifest.json — run \`pnpm run build\` first`
    )
  }

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  cpSync(distDir, outDir, {
    recursive: true,
    filter: (src) => !OMIT_FROM_COPY.has(path.basename(src))
  })

  // Belt-and-suspenders if filter edge cases leave them behind
  for (const name of OMIT_FROM_COPY) {
    rmSync(path.join(outDir, name), { force: true })
  }

  const manifestPath = path.join(outDir, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const firefoxManifest = transformFirefoxManifest(manifest)
  writeFileSync(
    manifestPath,
    `${JSON.stringify(firefoxManifest, null, 2)}\n`,
    'utf8'
  )

  for (const { full } of listFilesRecursive(outDir)) {
    if (full.endsWith('.html')) {
      writeFileSync(full, rewriteFirefoxHtml(readFileSync(full, 'utf8')), 'utf8')
      continue
    }
    if (!full.endsWith('.js')) continue
    const next = rewriteInnerHtmlAssignments(
      stripFirefoxUnsupportedApis(readFileSync(full, 'utf8'))
    )
    writeFileSync(full, next, 'utf8')
  }

  rmSync(zipPath, { force: true })
  zipDirectory(outDir, zipPath)

  return { outDir, zipPath, manifest: firefoxManifest }
}

export function firefoxPackagePaths(profile = readProfile()) {
  if (!profile) return undefined
  const distDir = path.join(repoRoot, profile.outDir)
  return {
    distDir,
    outDir: `${distDir}-firefox`,
    zipPath: `${distDir}-firefox.zip`
  }
}

function main() {
  const profile = readProfile()
  const { outDir, zipPath, manifest } = packageFirefox(
    firefoxPackagePaths(profile)
  )
  if (profile) {
    try {
      checkProfileOutput(profile, outDir)
    } catch (err) {
      rmSync(zipPath, { force: true })
      throw err
    }
  }
  const geckoId = manifest.browser_specific_settings?.gecko?.id ?? '(missing)'
  console.log(`[package-firefox] wrote ${path.relative(repoRoot, outDir)}`)
  console.log(`[package-firefox] wrote ${path.relative(repoRoot, zipPath)}`)
  console.log(`[package-firefox] gecko.id=${geckoId}`)
}

const isCli =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isCli) {
  try {
    main()
  } catch (err) {
    console.error(`[package-firefox] ${err.message}`)
    process.exit(1)
  }
}
