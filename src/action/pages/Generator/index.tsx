import { t } from '@lingui/core/macro'
import { PageHeader } from 'lockwright-lib-ui-react-native-components'

import { PasswordGenerator } from '../../../shared/containers/PasswordGenerator'

export const Generator = () => {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-[var(--spacing24)] overflow-y-auto p-[var(--spacing24)]"
      data-testid="generator-page"
    >
      <PageHeader as="h1" title={t`Generator`} />

      <PasswordGenerator />
    </div>
  )
}
