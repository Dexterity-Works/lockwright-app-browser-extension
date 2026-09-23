import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { t } from '@lingui/core/macro'
import { useForm } from 'lockwright-lib-ui-react-hooks'
import { AlertMessage, Button } from 'lockwright-lib-ui-react-native-components'
import { useCreateRecord, useRecords, useVault } from 'lockwright-lib-vault'
import { Validator } from 'lockwright-utils-validator'

import { buildLoginDetectCreatePayload } from './buildLoginDetectCreatePayload'
import { isLoginDetectReady } from './isLoginDetectReady'
import { resolveLoginDetectTitle } from './resolveLoginDetectTitle'
import { shouldDismissAfterSaveError } from './shouldDismissAfterSaveError'
import { visibleSaveError } from './visibleSaveError'
import { FormGroup } from '../../../shared/components/FormGroup'
import { InputField } from '../../../shared/components/InputField'
import { InputFieldPassword } from '../../../shared/components/InputFieldPassword'
import { PopupCard } from '../../../shared/components/PopupCard'
import { useRouter } from '../../../shared/context/RouterContext'
import { KeyIcon } from '../../../shared/icons/KeyIcon'
import { UserIcon } from '../../../shared/icons/UserIcon'
import { appendWebsiteToLoginRecord } from '../../../shared/utils/appendWebsiteToLoginRecord'
import { classifyLoginDetectAction } from '../../../shared/utils/classifyLoginDetectAction'
import {
  hydrateUriMatchSettings,
  onUriMatchSettingsChanged
} from '../../../shared/utils/uriMatchSetting'
import { closeIframe } from '../../iframeApi/closeIframe'
import { setIframeStyles } from '../../iframeApi/setIframeStyles'

export const LoginDetect = () => {
  const { state: routerState } = useRouter()

  const popupRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uriMatchEpoch, setUriMatchEpoch] = useState(0)

  useEffect(() => {
    let alive = true
    void hydrateUriMatchSettings().then(() => {
      if (alive) setUriMatchEpoch((n) => n + 1)
    })
    const unsubscribe = onUriMatchSettingsChanged(() => {
      setUriMatchEpoch((n) => n + 1)
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const pageUrl = routerState?.url ?? ''
  const username = routerState?.username ?? ''
  const password = routerState?.password ?? ''

  const schema = Validator.object({
    title: Validator.string().required(t`Title is required`),
    username: Validator.string(),
    password: Validator.string(),
    websites: Validator.array().items(
      Validator.object({
        website: Validator.string()
      })
    )
  })

  const { createRecord } = useCreateRecord()

  const { refetch: refetchVault, data: vaultData } = useVault()

  const {
    updateRecords,
    data: recordsData,
    isInitialized,
    isLoading
  } = useRecords()

  // Wait out loading-empty snapshots so classify does not false-save; keep
  // ready for non-empty data during refetch so buttons do not flicker.
  const isReady = isLoginDetectReady({
    isInitialized,
    isLoading,
    recordsData
  })

  const { action, existingRecord } = useMemo(
    () =>
      classifyLoginDetectAction({
        records: recordsData,
        pageUrl,
        username,
        password
      }),
    [recordsData, pageUrl, username, password, uriMatchEpoch]
  )

  const resolvedTitle = resolveLoginDetectTitle({
    pageTitle: routerState?.pageTitle,
    pageUrl,
    existingTitle: existingRecord?.data?.title
  })

  const { register, handleSubmit, setValue } = useForm({
    initialValues: {
      title: resolvedTitle,
      username,
      password
    },
    validate: (values) => schema.validate(values)
  })

  const setValueRef = useRef(setValue)
  setValueRef.current = setValue

  useEffect(() => {
    if (!resolvedTitle || typeof setValueRef.current !== 'function') return
    setValueRef.current('title', resolvedTitle)
  }, [resolvedTitle])

  const dismiss = () =>
    closeIframe({
      iframeId: routerState?.iframeId,
      iframeType: routerState?.iframeType
    })

  const onSubmit = async (values) => {
    setSubmitError('')
    setIsSubmitting(true)

    try {
      if (action === 'update' && existingRecord) {
        let updated = {
          ...existingRecord,
          data: {
            ...existingRecord.data,
            title: values.title || existingRecord.data?.title,
            username: values.username,
            password: values.password
          }
        }

        const withWebsite = appendWebsiteToLoginRecord(updated, pageUrl)
        if (withWebsite) {
          updated = withWebsite
        }

        await updateRecords([updated])
      } else {
        if (!vaultData?.id) {
          throw new Error('Vault ID is required')
        }

        await createRecord(
          buildLoginDetectCreatePayload({
            title: values.title,
            username: values.username,
            password: values.password,
            pageUrl
          })
        )
      }

      dismiss()
    } catch (error) {
      // Dual-write can succeed, then vaultSlice throws on records.push.
      // That looks like a hang: spinner never clears, card never closes.
      if (shouldDismissAfterSaveError(error)) {
        dismiss()
        return
      }
      setSubmitError(
        visibleSaveError(t`Something went wrong, please try again`)
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mount-once vault refresh; empty deps intentional (avoid refetch loop).
  useEffect(() => {
    void refetchVault()
  }, [])

  // Unchanged password: close immediately — no UI.
  useEffect(() => {
    if (!isReady || action !== 'noop') return
    dismiss()
  }, [isReady, action])

  useLayoutEffect(() => {
    const shouldShow = isReady && (action === 'save' || action === 'update')
    setIframeStyles({
      iframeId: routerState?.iframeId,
      iframeType: routerState?.iframeType,
      style: shouldShow
        ? {
            width: `${popupRef.current?.offsetWidth || 460}px`,
            height: `${popupRef.current?.offsetHeight || 280}px`,
            borderRadius: '12px'
          }
        : {
            width: '0px',
            height: '0px',
            borderRadius: '12px'
          }
    })
  }, [isReady, action, routerState?.iframeId, routerState?.iframeType])

  // Local submit flag only. Vault isRecordLoading can stick true if the
  // create reducer throws after pending (Immer rolls back the fulfilled reset).
  const isBusy = isSubmitting

  if (!isReady || action === 'noop') {
    return null
  }

  return (
    <PopupCard
      className="flex w-[460px] flex-col gap-4 overflow-auto"
      ref={popupRef}
    >
      <form
        autoComplete="off"
        className="contents"
        onSubmit={(event) => event.preventDefault()}
      >
        <FormGroup>
          <InputField
            {...register('title')}
            label={t`Title`}
            placeholder={t`Insert title`}
            variant="outline"
            name="lockwright-site-title"
            autoComplete="off"
            blockAutofill
          />
        </FormGroup>

        <FormGroup>
          {action === 'save' && (
            <InputField
              {...register('username')}
              label={t`Email or username`}
              placeholder={t`Email or username`}
              variant="outline"
              icon={UserIcon}
              name="lockwright-account"
              autoComplete="off"
              blockAutofill
            />
          )}

          <InputFieldPassword
            {...register('password')}
            label={t`Password`}
            placeholder={t`Password`}
            variant="outline"
            icon={KeyIcon}
            hasStrongness
            name="lockwright-secret"
            autoComplete="new-password"
            blockAutofill
          />
        </FormGroup>
      </form>

      {submitError ? (
        <AlertMessage
          variant="error"
          size="small"
          title={submitError}
          description=""
          testID="login-detect-save-error"
        />
      ) : null}

      <div className="flex justify-between">
        <Button
          variant="secondary"
          size="small"
          type="button"
          onClick={dismiss}
          data-testid="login-detect-not-now"
        >
          {t`Not now`}
        </Button>
        <Button
          variant="primary"
          size="small"
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isBusy}
          isLoading={isBusy}
          data-testid="login-detect-confirm"
        >
          {action === 'update' ? t`Update` : t`Save`}
        </Button>
      </div>
    </PopupCard>
  )
}
