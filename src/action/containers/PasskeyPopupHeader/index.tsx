import {
  Button,
  Text,
  useTheme
} from 'lockwright-lib-ui-react-native-components'
import { Close } from 'lockwright-lib-ui-react-native-components/icons'
import { LockwrightMark } from '../../../shared/components/LockwrightMark'

type PasskeyPopupHeaderProps = {
  title: string
  /** Host of the frame that asked, as the background saw it. */
  hostname?: string | null
  onClose: () => void
}

export const PasskeyPopupHeader = ({
  title,
  hostname,
  onClose
}: PasskeyPopupHeaderProps) => {
  const { theme } = useTheme()
  return (
    <div className="flex items-center justify-between px-[var(--spacing12)] py-[var(--spacing10)]">
      <LockwrightMark
        width={20}
        height={20}
        color={theme.colors.colorAccentActive}
      />

      <div className="flex flex-col items-center">
        <Text variant="labelEmphasized" as="span">
          {title}
        </Text>
        {hostname ? (
          <Text
            variant="caption"
            as="span"
            color={theme.colors.colorTextSecondary}
            data-testid="passkey-popup-header-hostname"
          >
            {hostname}
          </Text>
        ) : null}
      </div>

      <Button
        variant="tertiary"
        size="small"
        aria-label="Close"
        data-testid="passkey-popup-header-close"
        onClick={onClose}
        iconBefore={<Close />}
      />
    </div>
  )
}
