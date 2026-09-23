import { useCallback, useEffect, useMemo, useState } from 'react'

import { t } from '@lingui/core/macro'
import {
  AUTO_LOCK_TIMEOUT_OPTIONS,
  BE_AUTO_LOCK_ENABLED
} from 'lockwright-lib-constants'
import {
  Button,
  Dropdown,
  NavbarListItem,
  PageHeader,
  Radio,
  Text,
  ToggleSwitch,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { KeyboardArrowBottom } from 'lockwright-lib-ui-react-native-components/icons'

import { useAutoLockPreferences } from '../../../../../hooks/useAutoLockPreferences'
import {
  LOCAL_STORAGE_KEYS,
  PASSKEY_VERIFICATION_OPTIONS
} from '../../../../../shared/constants/storage'
import { useAllowHttpEnabled } from '../../../../../shared/hooks/useAllowHttpEnabled'
import { useCopyToClipboard } from '../../../../../shared/hooks/useCopyToClipboard'
import {
  URI_MATCH_TYPES,
  type UriMatchType
} from '../../../../../shared/constants/uriMatch'
import {
  getAutofillEnabled,
  setAutofillEnabled
} from '../../../../../shared/utils/autofillSetting'
import {
  loadDebugLogging,
  setDebugLogging
} from '../../../../../shared/utils/debugLogging'
import { isPasswordChangeReminderDisabled } from '../../../../../shared/utils/isPasswordChangeReminderDisabled'
import { logger } from '../../../../../shared/utils/logger'
import { getPasskeyVerificationPreference } from '../../../../../shared/utils/passkeyVerificationPreference'
import {
  getDefaultUriMatchType,
  setDefaultUriMatchType
} from '../../../../../shared/utils/uriMatchSetting'

const TEST_IDS = {
  root: 'settings-app-preferences',
  autofillToggle: 'settings-autofill-toggle',
  allowHttpToggle: 'settings-allow-http-toggle',
  defaultUriMatchSelect: 'settings-default-uri-match-select',
  defaultUriMatchOption: 'settings-default-uri-match-option',
  autoLockSelect: 'settings-auto-lock-select',
  autoLockOption: 'settings-auto-lock-option',
  copyToClipboardToggle: 'settings-copy-to-clipboard-toggle',
  clipboardClearToggle: 'settings-clipboard-clear-toggle',
  remindersToggle: 'settings-reminders-toggle',
  passkeyValidation: 'settings-passkey-validation',
  debugLoggingToggle: 'settings-debug-logging-toggle'
} as const

type UriMatchOption = {
  value: UriMatchType
  label: string
}

type TimeoutOption = {
  key: string
  label: string
  value: number | null
}

const TIMEOUT_OPTIONS: TimeoutOption[] = Object.entries(
  AUTO_LOCK_TIMEOUT_OPTIONS as Record<
    string,
    { label: string; value: number | null }
  >
).map(([key, option]) => ({ key, label: option.label, value: option.value }))

export const AppPreferencesContent = () => {
  const { theme } = useTheme()
  const { colors } = theme

  const { timeoutMs, setTimeoutMs } = useAutoLockPreferences() as {
    timeoutMs: number | null
    setTimeoutMs: (ms: number | null) => void
  }
  const {
    isCopyToClipboardEnabled,
    handleCopyToClipboardSettingChange,
    isClipboardClearEnabled,
    handleClipboardClearSettingChange
  } = useCopyToClipboard()
  const [isAllowHttpEnabled, setIsAllowHttpEnabled] = useAllowHttpEnabled() as [
    boolean,
    (value: boolean) => void
  ]

  const [isAutoLockDropdownOpen, setIsAutoLockDropdownOpen] = useState(false)
  const [isUriMatchDropdownOpen, setIsUriMatchDropdownOpen] = useState(false)
  const [isReminderDisabled, setIsReminderDisabled] = useState(() =>
    isPasswordChangeReminderDisabled()
  )
  const [isAutofillEnabled, setIsAutofillEnabledState] = useState(true)
  const [defaultUriMatchType, setDefaultUriMatchTypeState] =
    useState<UriMatchType>(URI_MATCH_TYPES.DOMAIN)
  const [passkeyVerification, setPasskeyVerification] = useState(() =>
    getPasskeyVerificationPreference()
  )
  const [isDebugLoggingEnabled, setIsDebugLoggingEnabled] = useState(false)

  useEffect(() => {
    let alive = true
    getAutofillEnabled().then((enabled) => {
      if (alive) setIsAutofillEnabledState(enabled)
    })
    getDefaultUriMatchType().then((matchType) => {
      if (alive) setDefaultUriMatchTypeState(matchType as UriMatchType)
    })
    loadDebugLogging().then(() => {
      if (alive) setIsDebugLoggingEnabled(logger.debugMode)
    })
    return () => {
      alive = false
    }
  }, [])

  const uriMatchOptions = useMemo<UriMatchOption[]>(
    () => [
      { value: URI_MATCH_TYPES.DOMAIN, label: t`Domain` },
      { value: URI_MATCH_TYPES.HOST, label: t`Host` },
      { value: URI_MATCH_TYPES.STARTS_WITH, label: t`Starts with` },
      { value: URI_MATCH_TYPES.EXACT, label: t`Exact` }
    ],
    []
  )

  const selectedUriMatchOption = useMemo(
    () =>
      uriMatchOptions.find((option) => option.value === defaultUriMatchType) ??
      uriMatchOptions[0],
    [uriMatchOptions, defaultUriMatchType]
  )

  const handleUriMatchSelect = useCallback(
    async (option: UriMatchOption) => {
      const prev = defaultUriMatchType
      setDefaultUriMatchTypeState(option.value)
      setIsUriMatchDropdownOpen(false)
      try {
        await setDefaultUriMatchType(option.value)
      } catch {
        setDefaultUriMatchTypeState(prev)
      }
    },
    [defaultUriMatchType]
  )

  const translatedTimeoutOptions = useMemo(() => {
    const labels: Record<string, string> = {
      SECONDS_30: t`30 seconds`,
      MINUTES_1: t`1 Minute`,
      MINUTES_3: t`3 Minutes`,
      MINUTES_5: t`5 Minutes`,
      MINUTES_10: t`10 Minutes`,
      MINUTES_15: t`15 minutes`,
      MINUTES_30: t`30 Minutes`,
      HOURS_1: t`1 Hour`,
      HOURS_3: t`3 Hours`,
      HOURS_4: t`4 hours`,
      NEVER: t`Never`
    }
    return TIMEOUT_OPTIONS.map((option) => ({
      ...option,
      label: labels[option.key] ?? option.label
    }))
  }, [])

  const selectedTimeoutOption = useMemo(
    () =>
      translatedTimeoutOptions.find((option) => option.value === timeoutMs) ??
      translatedTimeoutOptions[0],
    [translatedTimeoutOptions, timeoutMs]
  )

  const handleTimeoutSelect = useCallback(
    (option: TimeoutOption) => {
      setTimeoutMs(option.value)
      setIsAutoLockDropdownOpen(false)
    },
    [setTimeoutMs]
  )

  const handleAutofillToggle = useCallback(
    async (isOn: boolean) => {
      const prev = isAutofillEnabled
      setIsAutofillEnabledState(isOn)
      try {
        await setAutofillEnabled(isOn)
      } catch {
        setIsAutofillEnabledState(prev)
      }
    },
    [isAutofillEnabled]
  )

  const handlePasskeyVerificationChange = useCallback((value: string) => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.PASSKEY_VERIFICATION_PREFERENCE,
        value
      )
      setPasskeyVerification(value)
    } catch {
      // storage write failed — leave state as-is
    }
  }, [])

  const handleDebugLoggingToggle = useCallback((isOn: boolean) => {
    setIsDebugLoggingEnabled(isOn)
    void setDebugLogging(isOn)
  }, [])

  const passkeyOptions = useMemo(
    () => [
      {
        value: PASSKEY_VERIFICATION_OPTIONS.REQUESTED,
        label: t`Requested by website (default)`,
        description: t`Only ask for verification when the website requires it.`
      },
      {
        value: PASSKEY_VERIFICATION_OPTIONS.ALWAYS,
        label: t`Always`,
        description: t`Always require identity verification when using passkeys.`
      },
      {
        value: PASSKEY_VERIFICATION_OPTIONS.NEVER,
        label: t`Never`,
        description: t`Skip identity verification, even if the website requests it.`
      }
    ],
    []
  )

  const handleReminderToggle = useCallback((isOn: boolean) => {
    try {
      if (!isOn) {
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.PASSWORD_CHANGE_REMINDER_ENABLED,
          'false'
        )
      } else {
        localStorage.removeItem(
          LOCAL_STORAGE_KEYS.PASSWORD_CHANGE_REMINDER_ENABLED
        )
      }
      setIsReminderDisabled(!isOn)
    } catch {
      // storage write failed — leave state as-is
    }
  }, [])

  return (
    <div
      data-testid={TEST_IDS.root}
      className="flex w-full flex-col gap-[24px]"
    >
      <PageHeader
        as="h1"
        title={t`App Preferences`}
        subtitle={t`Control how Lockwright works and keep your vault secure.`}
      />

      <section className="flex flex-col gap-[12px]">
        <Text variant="caption" color={colors.colorTextSecondary}>
          {t`Autofill & Browsing`}
        </Text>
        <div className="bg-surface-primary border-border-primary flex flex-col rounded-[8px] border">
          <div className="p-[12px]">
            <ToggleSwitch
              data-testid={TEST_IDS.autofillToggle}
              checked={isAutofillEnabled}
              onChange={handleAutofillToggle}
              label={t`Autofill`}
              description={t`Automatically fill usernames, passwords, and codes when you sign in`}
            />
          </div>
          <div className="border-border-primary border-t p-[12px]">
            <ToggleSwitch
              data-testid={TEST_IDS.allowHttpToggle}
              checked={isAllowHttpEnabled}
              onChange={setIsAllowHttpEnabled}
              label={t`Allow non-secure websites`}
              description={t`Allow autofill and access on HTTP websites. When disabled, only secure HTTPS sites are supported`}
            />
          </div>
          <div className="border-border-primary flex items-center justify-between gap-[12px] border-t p-[12px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
              <Text variant="labelEmphasized">{t`Default URI match`}</Text>
              <Text variant="caption" color={colors.colorTextSecondary}>
                {t`Choose how Lockwright decides when to offer autofill for a site.`}
              </Text>
            </div>
            <Dropdown
              open={isUriMatchDropdownOpen}
              onOpenChange={setIsUriMatchDropdownOpen}
              trigger={
                <Button
                  variant="secondary"
                  size="small"
                  iconAfter={<KeyboardArrowBottom />}
                  data-testid={TEST_IDS.defaultUriMatchSelect}
                >
                  {selectedUriMatchOption?.label ?? t`Domain`}
                </Button>
              }
            >
              {uriMatchOptions.map((option) => (
                <NavbarListItem
                  key={option.value}
                  testID={`${TEST_IDS.defaultUriMatchOption}-${option.value}`}
                  label={option.label}
                  selected={option.value === defaultUriMatchType}
                  onClick={() => {
                    void handleUriMatchSelect(option)
                  }}
                />
              ))}
            </Dropdown>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-[12px]">
        <Text variant="caption" color={colors.colorTextSecondary}>
          {t`Passkey Preferences`}
        </Text>
        <div className="bg-surface-primary border-border-primary flex flex-col gap-[10px] rounded-[8px] border p-[12px]">
          <div className="flex flex-col gap-[4px]">
            <Text>{t`Passkey Validation`}</Text>
            <Text variant="caption" color={colors.colorTextSecondary}>
              {t`Choose when to verify your identity when using passkeys.`}
            </Text>
          </div>
          <Radio
            testID={TEST_IDS.passkeyValidation}
            value={passkeyVerification}
            onChange={handlePasskeyVerificationChange}
            options={passkeyOptions}
          />
        </div>
      </section>

      <section className="flex flex-col gap-[12px]">
        <Text variant="caption" color={colors.colorTextSecondary}>
          {t`Security Awareness`}
        </Text>
        <div className="bg-surface-primary border-border-primary flex flex-col rounded-[8px] border">
          {BE_AUTO_LOCK_ENABLED && (
            <div className="flex items-center justify-between gap-[12px] p-[12px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <Text variant="labelEmphasized">{t`Auto Lock`}</Text>
                <Text variant="caption" color={colors.colorTextSecondary}>
                  {t`Automatically lock the app after selected period of inactivity`}
                </Text>
              </div>
              <Dropdown
                open={isAutoLockDropdownOpen}
                onOpenChange={setIsAutoLockDropdownOpen}
                trigger={
                  <Button
                    variant="secondary"
                    size="small"
                    iconAfter={<KeyboardArrowBottom />}
                    data-testid={TEST_IDS.autoLockSelect}
                  >
                    {selectedTimeoutOption?.label ?? t`Select a timeout`}
                  </Button>
                }
              >
                {translatedTimeoutOptions.map((option) => (
                  <NavbarListItem
                    key={option.key}
                    testID={`${TEST_IDS.autoLockOption}-${option.key.toLowerCase()}`}
                    label={option.label}
                    selected={option.value === timeoutMs}
                    onClick={() => handleTimeoutSelect(option)}
                  />
                ))}
              </Dropdown>
            </div>
          )}

          <div
            className={
              BE_AUTO_LOCK_ENABLED
                ? 'border-border-primary border-t p-[12px]'
                : 'p-[12px]'
            }
          >
            <ToggleSwitch
              data-testid={TEST_IDS.copyToClipboardToggle}
              checked={isCopyToClipboardEnabled}
              onChange={handleCopyToClipboardSettingChange}
              label={t`Copy to Clipboard`}
              description={t`Enable one-tap copying to move your credentials between apps effortlessly.`}
            />
          </div>

          <div className="border-border-primary border-t p-[12px]">
            <ToggleSwitch
              data-testid={TEST_IDS.clipboardClearToggle}
              checked={isClipboardClearEnabled}
              onChange={handleClipboardClearSettingChange}
              label={t`Replace clipboard`}
              description={t`Overwrite a copied password after a short time. Turn this off if you need the password to stay put.`}
            />
          </div>

          <div className="border-border-primary border-t p-[12px]">
            <ToggleSwitch
              data-testid={TEST_IDS.remindersToggle}
              checked={!isReminderDisabled}
              onChange={handleReminderToggle}
              label={t`Reminders`}
              description={t`Get alerts when it's time to update your passwords`}
            />
          </div>

          <div className="border-border-primary border-t p-[12px]">
            <ToggleSwitch
              data-testid={TEST_IDS.debugLoggingToggle}
              checked={isDebugLoggingEnabled}
              onChange={handleDebugLoggingToggle}
              label={t`Debug logging`}
              description={t`Show expected errors in the browser console`}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
