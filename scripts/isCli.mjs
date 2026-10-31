import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// True when the module at metaUrl is the script node was started with.
// Compares real paths: node runs a symlinked script from its real path, so
// /home/... and /var/home/... must count as the same file.
export function isCli(metaUrl) {
  if (!process.argv[1]) return false
  try {
    return (
      realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1])
    )
  } catch {
    return false
  }
}
