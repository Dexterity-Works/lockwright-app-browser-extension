import type { ThemeColors } from 'lockwright-lib-ui-react-native-components'
import { rawTokens } from 'lockwright-lib-ui-react-native-components'

export const createStyles = (colors: ThemeColors) => ({
  wrapper: {
    display: 'flex' as const,
    flexDirection: 'row' as const,
    width: '100%',
    height: '100%',
    minHeight: 0,
    backgroundColor: colors.colorSurfacePrimary,
    border: `1px solid ${colors.colorBorderPrimary}`,
    borderRadius: rawTokens.radius6,
    overflow: 'hidden' as const
  },

  content: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: colors.colorSurfacePrimary
  }
})
