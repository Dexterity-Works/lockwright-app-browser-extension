import path from 'path'

import { defineConfig } from 'vite'

import { readGitSha6 } from './scripts/gitSha.mjs'
import { profilePlugins, readProfile } from './scripts/profile.mjs'

const webOnlyExtensions = [".web.js", ".web.jsx", ".web.ts", ".web.tsx"];
const profile = readProfile()

export default defineConfig({
  define: {
    'globalThis.__LOCKWRIGHT_GIT_SHA__': JSON.stringify(readGitSha6())
  },
  plugins: profilePlugins(profile),
  resolve: {
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom'],
    extensions: [
      ...webOnlyExtensions,
      ".mjs",
      ".js",
      ".mts",
      ".ts",
      ".jsx",
      ".tsx",
      ".json",
    ]
  },
  optimizeDeps: {
    exclude: ['lockwright-lib-ui-react-native-components', 'react-strict-dom'],
  },
  ssr: {
    noExternal: ['react-strict-dom']
  },
  build: {
    outDir: profile?.outDir ?? 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        inject: path.resolve(__dirname, 'src/inject/index.js')
      },
      output: {
        format: 'iife',
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
