#!/usr/bin/env node
/**
 * Runs Jest, then Firefox package unit tests.
 * Extra CLI args are forwarded to Jest only (so `pnpm test -- path` works).
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const jestArgs = process.argv.slice(2)

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('pnpm', ['exec', 'jest', ...jestArgs])

// Only run package tests when the full suite is requested (no path filter)
if (jestArgs.length === 0) {
  run('node', ['--test', 'scripts/package-firefox.test.mjs'])
  run('node', ['--test', 'scripts/package-chrome.test.mjs'])
  run('node', ['--test', 'scripts/profile.test.mjs'])
}
