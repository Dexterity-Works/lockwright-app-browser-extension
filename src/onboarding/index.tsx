import { t } from '@lingui/core/macro'
import React, { useState } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import {
  ThemeProvider as UIKitProvider,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { StepIndicatorBar } from './StepIndicatorBar'
import { Step1Dialog } from './Step1Dialog'
import { Step2Dialog } from './Step2Dialog'
import { Step3Dialog } from './Step3Dialog'
import { ONBOARDING_DIALOG_WIDTH } from './constants'
import { messages } from '../locales/en/messages.mjs'
import { useOnboardingInitialStep } from './useOnboardingInitialStep'
import '../index.css'
import '../strict.css'

i18n.load('en', messages)
i18n.activate('en')

const TOTAL_STEPS = 3

const OnboardingSteps = ({ initialStep }: { initialStep: number }) => {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-[var(--spacing24)]"
      style={{ maxWidth: ONBOARDING_DIALOG_WIDTH }}
    >
      <StepIndicatorBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <div className="flex flex-col">
        {currentStep === 1 && <Step1Dialog onNext={goNext} />}
        {currentStep === 2 && <Step2Dialog onNext={goNext} />}
        {currentStep === 3 && <Step3Dialog />}
      </div>
    </div>
  )
}

const OnboardingPage = () => {
  const { theme } = useTheme()
  const initialStep = useOnboardingInitialStep()

  const glowColor = theme.colors.colorPrimary

  return (
    <div className="bg-background relative h-screen w-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: '536px',
          height: '520px',
          left: 'calc(50% - 868px)',
          top: '35%',
          borderRadius: '50%',
          background: glowColor,
          opacity: 0.2,
          filter: 'blur(200px)'
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: '534px',
          height: '500px',
          left: 'calc(50% + 333px)',
          top: '50%',
          borderRadius: '50%',
          background: glowColor,
          opacity: 0.2,
          filter: 'blur(200px)'
        }}
      />
      <div
        className="relative flex h-full w-full min-w-0 flex-col items-center gap-[var(--spacing24)] overflow-y-auto px-[var(--spacing16)] py-[var(--spacing24)] sm:p-[var(--spacing40)]"
        style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
      >
        <img
          src="/assets/images/logo.svg"
          className="h-[50px] w-[172px] shrink-0"
          alt={t`Lockwright`}
        />

        {initialStep !== null && <OnboardingSteps initialStep={initialStep} />}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIKitProvider>
      <I18nProvider i18n={i18n}>
        <OnboardingPage />
      </I18nProvider>
    </UIKitProvider>
  </StrictMode>
)
