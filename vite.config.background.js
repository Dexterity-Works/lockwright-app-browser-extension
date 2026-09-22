import path from 'path'

import { defineConfig } from 'vite'

import viteBabel from 'vite-plugin-babel'

import { readGitSha6 } from './scripts/gitSha.mjs'

const webOnlyExtensions = [".web.js", ".web.jsx", ".web.ts", ".web.tsx"];

export default defineConfig({
  define: {
    'globalThis.__LOCKWRIGHT_GIT_SHA__': JSON.stringify(readGitSha6())
  },
  plugins: [
    viteBabel({
      filter: /\.[jt]sx?$/,
    }),
  ],
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
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background/index.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
