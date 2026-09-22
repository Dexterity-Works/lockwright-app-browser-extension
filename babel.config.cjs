const path = require('node:path')
const fs = require('node:fs')

const dev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

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
    // pnpm: <store>/node_modules/@tetherto/<pkg> → sibling deps live in <store>/node_modules
    paths.push(path.resolve(kitReal, '../..'))
  } catch {
    // ui-kit not installed yet
  }

  return paths
}

const rsdBabelPreset = require.resolve('react-strict-dom/babel-preset', {
  paths: getReactStrictDomResolvePaths()
})

module.exports = {
  compact: false,
  plugins: ['@lingui/babel-plugin-lingui-macro'],
  presets: isTest
    ? [
        [
          '@babel/preset-env',
          {
            targets: { node: 'current' },
            modules: 'commonjs'
          }
        ],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    : [
        ['@babel/preset-env', { targets: 'defaults', modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
        [
          rsdBabelPreset,
          {
            debug: dev,
            dev,
            rootDir: __dirname,
            platform: 'web'
          }
        ]
      ]
}
