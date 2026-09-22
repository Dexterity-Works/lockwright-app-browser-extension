import { useEffect, useMemo } from 'react'

import { t } from '@lingui/core/macro'
import { useForm } from 'lockwright-lib-ui-react-hooks'
import {
  MultiSlotInput,
  PasswordField,
  Text,
  TextArea,
  useTheme
} from 'lockwright-lib-ui-react-native-components'

import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard'
import { toReadOnlyFieldProps } from './utils'

type CustomField = { type: string; name?: string; note?: string }

type NoteRecord = {
  id?: string
  folder?: string
  data?: { title?: string; note?: string; customFields?: CustomField[] }
}

interface Props {
  initialRecord?: NoteRecord
  selectedFolder?: string
}

type FormValues = { note: string; customFields: CustomField[]; folder?: string }

export const NoteDetailsForm = ({ initialRecord, selectedFolder }: Props) => {
  const { theme } = useTheme()
  const { copyToClipboard } = useCopyToClipboard()

  const initialValues = useMemo<FormValues>(
    () => ({
      note: initialRecord?.data?.note ?? '',
      customFields: initialRecord?.data?.customFields ?? [],
      folder: selectedFolder ?? initialRecord?.folder
    }),
    [initialRecord, selectedFolder]
  )

  const { register, setValues, values } = useForm({ initialValues })

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues, setValues])

  const formValues = values as FormValues
  const hasNote = !!formValues.note?.length
  const hasCustomFields = !!formValues.customFields?.length

  return (
    <div className="flex w-full flex-col gap-[var(--spacing8)]">
      {hasNote && (
        <div className="flex flex-col gap-[var(--spacing12)]">
          <Text variant="caption" color={theme.colors.colorTextSecondary}>
            {t`Details`}
          </Text>

          <MultiSlotInput testID="note-multi-slot-input">
            <TextArea
              label={t`Note`}
              placeholder={t`Enter Note`}
              readOnly
              copyable
              onCopy={copyToClipboard}
              testID="note-multi-slot-input-slot-0"
              {...toReadOnlyFieldProps(register('note'))}
            />
          </MultiSlotInput>
        </div>
      )}

      {hasCustomFields && (
        <div className="flex flex-col gap-[var(--spacing12)]">
          <Text variant="caption" color={theme.colors.colorTextSecondary}>
            {t`Additional`}
          </Text>

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
        </div>
      )}
    </div>
  )
}
