import { Trans } from '@lingui/react/macro'
import {
  Button,
  Title,
  Text,
  Panel,
  useTheme
} from '@tetherto/pearpass-lib-ui-kit'
import { ONBOARDING_ICON_SIZE } from './constants'
import { Extension, PushPin } from '@tetherto/pearpass-lib-ui-kit/icons'

interface Step1Props {
  onNext: () => void
}

export const Step1Dialog = ({ onNext }: Step1Props) => {
  const { theme } = useTheme()
  const accentColor = theme.colors.colorLinkText

  const footer = (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-[var(--spacing12)]">
      <Button
        variant="secondary"
        size="medium"
        onClick={onNext}
        data-testid="onboarding-step1-skip-button"
      >
        <Trans>I will do it later</Trans>
      </Button>
      <Button
        variant="primary"
        size="medium"
        onClick={onNext}
        data-testid="onboarding-step1-done-button"
      >
        <Trans>Done</Trans>
      </Button>
    </div>
  )

  return (
    <Panel
      title={<Trans>Step 1 of 3</Trans>}
      footer={footer}
      hideCloseButton
      testID="onboarding-step1-dialog"
    >
      <div className="flex min-w-0 flex-col gap-[var(--spacing24)] px-[var(--spacing8)] py-[var(--spacing24)]">
        <div className="bg-surface-hover border-border-primary rounded-lg border p-[var(--spacing16)] sm:p-[var(--spacing24)]">
          <img
            src="/assets/images/step1.svg"
            className="mx-auto block h-auto max-h-20 w-full max-w-full object-contain object-left"
            alt="Step 1"
          />
        </div>
        <div className="flex min-w-0 flex-col items-center gap-[var(--spacing16)] text-center">
          <Title as="h2">
            <Trans>Pin Lockwright for quick access</Trans>
          </Title>
          <div className="flex min-w-0 flex-col gap-[var(--spacing12)]">
            <Text as="p">
              <Trans>
                Pinning Lockwright keeps it one click away whenever you need it.
              </Trans>
              <br />
              <Trans>
                Keep Lockwright accessible in your toolbar for quick access to
                your items
              </Trans>
            </Text>
            <div className="flex flex-col gap-[var(--spacing8)]">
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-[var(--spacing4)]">
                <Text as="span">
                  <Trans>1. Click</Trans>
                </Text>
                <Extension
                  color={accentColor}
                  width={ONBOARDING_ICON_SIZE}
                  height={ONBOARDING_ICON_SIZE}
                />
                <Text as="span">
                  <Trans>in a toolbar</Trans>
                </Text>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-[var(--spacing4)]">
                <Text as="span">
                  <Trans>2. Click</Trans>
                </Text>
                <PushPin
                  color={accentColor}
                  width={ONBOARDING_ICON_SIZE}
                  height={ONBOARDING_ICON_SIZE}
                />
                <Text as="span">
                  <Trans>next to Lockwright</Trans>
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
