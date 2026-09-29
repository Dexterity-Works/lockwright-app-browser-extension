import { getDomain } from 'tldts'

/**
 * eTLD+1 of a hostname, counting the PSL private section, so tenants on
 * shared hosts (alice.github.io, bob.vercel.app) are separate sites.
 */
export const getRegistrableDomain = (hostname: string): string | null =>
  getDomain(hostname, { allowPrivateDomains: true })
