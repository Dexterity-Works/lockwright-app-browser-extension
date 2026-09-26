import { logger } from './logger'
import { CHROME_STORAGE_KEYS } from '../constants/storage'

const KEY = CHROME_STORAGE_KEYS.DEBUG_LOGGING

const applyDebugLogging = (enabled) => {
  logger.setDebugMode(!!enabled)
}

export const loadDebugLogging = async () => {
  if (!chrome?.storage?.local?.get) return
  const res = await chrome.storage.local.get(KEY)
  applyDebugLogging(res?.[KEY])
}

export const setDebugLogging = async (enabled) => {
  applyDebugLogging(enabled)
  if (!chrome?.storage?.local?.set) return
  await chrome.storage.local.set({ [KEY]: !!enabled })
}

export const watchDebugLogging = () => {
  chrome.storage?.onChanged?.addListener?.((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return
    applyDebugLogging(changes[KEY].newValue)
  })
}
