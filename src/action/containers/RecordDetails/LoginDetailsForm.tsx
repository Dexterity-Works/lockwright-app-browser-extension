import { useEffect, useMemo } from 'react'

import { t } from '@lingui/core/macro'
import { useForm } from 'lockwright-lib-ui-react-hooks'
import { isBefore, subtractDateUnits } from 'lockwright-utils-date'
import {
  AlertMessage,
  Button,
  InputField,
  MultiSlotInput,
  PasswordField,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import {
  ContentCopy,
  OpenInNew
} from 'lockwright-lib-ui-react-native-components/icons'

import {
  URI_MATCH_TYPES,
  type UriMatchType
} from '../../../shared/constants/uriMatch'
import { addHttps } from '../../../shared/utils/addHttps'
import { formatPasskeyDate } from '../../../shared/utils/formatPasskeyDate'
import { isPasswordChangeReminderDisabled } from '../../../shared/utils/isPasswordChangeReminderDisabled'
import { resolveUriMatchType } from '../../../shared/utils/uriMatchSetting'
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { OtpCodeField } from '../../components/OtpCodeField/OtpCodeField'
import { toReadOnlyFieldProps } from './utils'

type CustomField = {
  type: string
  name?: string
  note?: string
}

const URI_MATCH_OPTION_LABELS: Record<UriMatchType, () => string> = {
  [URI_MATCH_TYPES.DOMAIN]: () => t`Domain`,
  [URI_MATCH_TYPES.HOST]: () => t`Host`,
  [URI_MATCH_TYPES.STARTS_WITH]: () => t`Starts with`,
  [URI_MATCH_TYPES.EXACT]: () => t`Exact`
}

type LoginRecord = {
  id?: string
  folder?: string
  otpPublic?: unknown
  data?: {
    title?: string
    username?: string
    password?: string
    note?: string
    websites?: string[]
    uris?: Array<{ uri?: string; match?: string }>
    customFields?: CustomField[]
    credential?: { id: string }
    passkeyCreatedAt?: number | string | Date | null
    passwordUpdatedAt?: number | string | Date
  }
}

interface Props {
  initialRecord?: LoginRecord
  selectedFolder?: string
}

type FormValues = {
  username: string
  password: string
  note: string
  websites: string[]
  customFields: CustomField[]
  folder?: string
  credential: string
  passkeyCreatedAt: number | string | Date | null
}

export const LoginDetailsForm = ({ initialRecord, selectedFolder }: Props) => {
  const { theme } = useTheme()
  const { copyToClipboard } = useCopyToClipboard()

  const initialValues = useMemo<FormValues>(
    () => ({
      username: initialRecord?.data?.username ?? '',
      password: initialRecord?.data?.password ?? '',
      note: initialRecord?.data?.note ?? '',
      websites: initialRecord?.data?.websites ?? [],
      customFields: initialRecord?.data?.customFields ?? [],
      folder: selectedFolder ?? initialRecord?.folder,
      credential: initialRecord?.data?.credential?.id ?? '',
      passkeyCreatedAt: initialRecord?.data?.passkeyCreatedAt ?? null
    }),
    [initialRecord, selectedFolder]
  )

  const { register, setValues, values } = useForm({ initialValues })

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues, setValues])

  const formValues = values as FormValues
  const hasUsername = !!formValues.username?.length
  const hasPassword = !!formValues.password?.length
  const hasPasskey = !!formValues.credential
  const hasWebsites = !!formValues.websites?.length
  const hasNote = !!formValues.note?.length
  const hasCustomFields = !!formValues.customFields?.length

  const isPasswordSixMonthsOld = () => {
    const passwordUpdatedAt = initialRecord?.data?.passwordUpdatedAt
    return (
      !!passwordUpdatedAt &&
      isBefore(passwordUpdatedAt, subtractDateUnits(6, 'month'))
    )
  }

  const shouldShowSecurityWarning =
    !isPasswordChangeReminderDisabled() && isPasswordSixMonthsOld()

  return (
    <div className="flex w-full flex-col gap-[var(--spacing16)]">
      <div className="flex w-full min-w-0 flex-col gap-[var(--spacing8)]">
        {(hasUsername || hasPassword || !!initialRecord?.otpPublic) && (
          <div className="w-full min-w-0">
            <MultiSlotInput testID="credentials-multi-slot-input">
              {hasUsername && (
                <InputField
                  label={t`Email / Username`}
                  placeholder={t`Email / Username`}
                  readOnly
                  isGrouped
                  testID="credentials-multi-slot-input-slot-0"
                  rightSlot={
                    <Button
                      variant="tertiary"
                      size="small"
                      type="button"
                      aria-label={t`Copy`}
                      iconBefore={
                        <ContentCopy
                          width={16}
                          height={16}
                          color={theme.colors.colorTextPrimary}
                        />
                      }
                      onClick={() => copyToClipboard(formValues.username)}
                      data-testid="credentials-username-copy"
                    />
                  }
                  {...toReadOnlyFieldProps(register('username'))}
                />
              )}

              {hasPassword && (
                <PasswordField
                  label={t`Password`}
                  placeholder={t`Password`}
                  readOnly
                  isGrouped
                  testID="credentials-multi-slot-input-slot-1"
                  rightSlot={
                    <Button
                      variant="tertiary"
                      size="small"
                      type="button"
                      aria-label={t`Copy`}
                      iconBefore={
                        <ContentCopy
                          width={16}
                          height={16}
                          color={theme.colors.colorTextPrimary}
                        />
                      }
                      onClick={() => copyToClipboard(formValues.password)}
                      data-testid="credentials-password-copy"
                    />
                  }
                  {...toReadOnlyFieldProps(register('password'))}
                />
              )}

              {!!initialRecord?.otpPublic && !!initialRecord?.id && (
                <OtpCodeField
                  key={initialRecord.id}
                  recordId={initialRecord.id}
                  otpPublic={
                    initialRecord.otpPublic as Parameters<
                      typeof OtpCodeField
                    >[0]['otpPublic']
                  }
                  isGrouped
                />
              )}
            </MultiSlotInput>
          </div>
        )}

        {hasWebsites &&
          formValues.websites.map((website, index) => {
            const matchType = (
              initialRecord
                ? resolveUriMatchType(initialRecord, website)
                : URI_MATCH_TYPES.DOMAIN
            ) as UriMatchType
            const matchLabel =
              URI_MATCH_OPTION_LABELS[matchType]?.() ?? t`Domain`
            return (
              <MultiSlotInput
                key={`${website}-${index}`}
                testID={`website-multi-slot-input-${index}`}
              >
                <div className="relative w-full">
                  <InputField
                    label={t`Website`}
                    value={website}
                    placeholder={t`Enter Website`}
                    readOnly
                    copyable
                    onCopy={copyToClipboard}
                    isGrouped
                    testID={`website-multi-slot-input-slot-${index}`}
                    rightSlot={
                      website?.length ? (
                        <Button
                          variant="tertiary"
                          size="small"
                          type="button"
                          aria-label={t`Open website`}
                          iconBefore={
                            <OpenInNew color={theme.colors.colorTextPrimary} />
                          }
                          onClick={() =>
                            window.open(
                              addHttps(website) as unknown as string,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        />
                      ) : undefined
                    }
                  />
                  <div
                    className="pointer-events-none absolute top-[var(--spacing12)] right-[var(--spacing48)] z-[1] flex items-center"
                    data-testid={`website-uri-match-caption-${index}`}
                  >
                    <Text
                      variant="caption"
                      color={theme.colors.colorTextSecondary}
                    >
                      {`${t`URI match`}: ${matchLabel}`}
                    </Text>
                  </div>
                </div>
              </MultiSlotInput>
            )
          })}

        {hasPasskey && (
          <InputField
            label={t`Passkey`}
            placeholder={t`Passkey`}
            value={
              formatPasskeyDate(formValues.passkeyCreatedAt as number) ||
              t`Passkey Stored`
            }
            readOnly
            testID="passkey-input"
          />
        )}

        {hasNote && (
          <MultiSlotInput testID="comments-multi-slot-input">
            <InputField
              label={t`Comment`}
              placeholder={t`Add comment`}
              readOnly
              copyable
              onCopy={copyToClipboard}
              isGrouped
              testID="comments-multi-slot-input-slot-0"
              {...toReadOnlyFieldProps(register('note'))}
            />
          </MultiSlotInput>
        )}

        {hasCustomFields && (
          <MultiSlotInput testID="hidden-messages-multi-slot-input">
            {formValues.customFields.map((field, index) => (
              <PasswordField
                key={`${field.type}-${index}`}
                label={t`Hidden Message`}
                value={field.note ?? ''}
                placeholder={t`Enter Hidden Message`}
                readOnly
                copyable
                onCopy={copyToClipboard}
                isGrouped
                testID={`hidden-messages-multi-slot-input-slot-${index}`}
              />
            ))}
          </MultiSlotInput>
        )}
      </div>

      {shouldShowSecurityWarning && (
        <AlertMessage
          variant="error"
          size="big"
          title={t`Password Warning`}
          description={t`It's been 6 months since you last updated this password. Consider changing it to keep your account secure.`}
        />
      )}
    </div>
  )
}
