import path from 'path'

import { lingui } from '@lingui/vite-plugin'
import { defineConfig } from 'vite'
import viteBabel from 'vite-plugin-babel'

import { readGitSha6 } from './scripts/gitSha.mjs'
import { profilePlugins, readProfile } from './scripts/profile.mjs'

const webOnlyExtensions = ['.web.js', '.web.jsx', '.web.ts', '.web.tsx']
const profile = readProfile()

export default defineConfig({
  define: {
    'globalThis.__LOCKWRIGHT_GIT_SHA__': JSON.stringify(readGitSha6())
  },
  plugins: [
    viteBabel({
      babelConfig: {
        configFile: path.resolve(__dirname, 'babel.config.cjs')
      },
      filter: /\.[jt]sx?$/
    }),
    lingui(),
    ...profilePlugins(profile)
  ],
  resolve: {
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom'],
    extensions: [
      ...webOnlyExtensions,
      '.mjs',
      '.js',
      '.mts',
      '.ts',
      '.jsx',
      '.tsx',
      '.json'
    ]
  },
  optimizeDeps: {
    exclude: ['lockwright-lib-ui-react-native-components', 'react-strict-dom']
  },
  ssr: {
    noExternal: ['react-strict-dom']
  },
  build: {
    outDir: profile?.outDir ?? 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content/index.js'),
        'inject-shim': path.resolve(__dirname, 'src/content/inject-shim.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
