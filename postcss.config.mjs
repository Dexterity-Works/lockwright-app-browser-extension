import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import autoprefixer from 'autoprefixer'
import babelLoader from './babel.config.cjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

function getReactStrictDomResolvePaths() {
  const paths = [
    __dirname,
    path.resolve(__dirname, 'node_modules/lockwright-lib-ui-react-native-components/node_modules'),
    path.resolve(__dirname, 'node_modules/.pnpm/node_modules')
  ]

  try {
    const kitReal = fs.realpathSync(
      path.resolve(__dirname, 'node_modules/lockwright-lib-ui-react-native-components')
    )
    paths.push(path.resolve(kitReal, '../..'))
  } catch {
    // ui-kit not installed yet
  }

  return paths
}

const rsdPostcssPlugin = require(
  require.resolve('react-strict-dom/postcss-plugin', {
    paths: getReactStrictDomResolvePaths()
  })
)

// IMPORTANT: use relative / posix globs. path.resolve() on Windows produces
// backslash paths that fast-glob (used by postcss-react-strict-dom) matches as 0 files,
// which drops all StyleX rules from the bundle (dark-on-dark / unstyled kit UI).
const styleSources = [
  'src/**/*.{js,jsx,mjs,ts,tsx}',
  'node_modules/lockwright-lib-ui-react-native-components/**/*.{js,jsx,mjs,ts,tsx}'
]

export default {
  plugins: [
    rsdPostcssPlugin({
      include: styleSources,
      babelConfig: babelLoader,
      useCSSLayers: true
    }),
    autoprefixer()
  ]
}
