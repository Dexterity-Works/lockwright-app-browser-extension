export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
    // ESM catalog from `lingui compile` (content script i18n); Jest needs transpilation
    '^.+[/\\\\]src[/\\\\]locales[/\\\\].+\\.mjs$': 'babel-jest'
  },
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/node_modules/react-dom/client'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.yalc/', '/packages/'],
  // pnpm stores packages under node_modules/.pnpm/<id>/node_modules/<pkg>.
  // Allowlist must also match that nested layout or ESM deps won't be transformed.
  // The lockwright-* git packages ship untranspiled ESM.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:htm|react-strict-dom|lockwright-[a-z-]+)/)'
  ]
}
