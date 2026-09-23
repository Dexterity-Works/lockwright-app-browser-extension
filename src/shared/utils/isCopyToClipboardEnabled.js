import { LOCAL_STORAGE_KEYS } from '../constants/storage'

export const isCopyToClipboardEnabled = () =>
  localStorage.getItem(LOCAL_STORAGE_KEYS.COPY_TO_CLIPBOARD_ENABLED) !== 'false'

export const isClipboardClearEnabled = () =>
  localStorage.getItem(LOCAL_STORAGE_KEYS.CLIPBOARD_CLEAR_ENABLED) !== 'false'
