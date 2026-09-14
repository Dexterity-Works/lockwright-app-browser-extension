# Changelog

All notable changes to the Lockwright browser extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Headings are App versions (`package.json` / `public/manifest.json`), not superproject Release tags.

Starts at 0.0.17, after the Lockwright package rename. Earlier history is git.

## [Unreleased]

### Fixed

- Auto Lock timeout menu shows durations (`30 seconds`, `1 Minute`, `Never`) instead of Lingui message ids.

## [0.0.24] - 2026-09-14

`f37a781f7fcb08b93f4b1cb28fd4a6ff7c252b96`

### Fixed

- Password recommendation box has an X. Paste and confirm-password no longer trap it.
- Android browsers skip the desktop native host. Onboarding no longer asks for a pair code or clip at 600px.

## [0.0.23] - 2026-09-10

`d2faea1c4ce956b6c66f32ced05250b92cc3f8f8`

### Fixed

- First pair pins the desktop identity before vault login so a correct master password is not shown as wrong. Confirm still waits until the vault accepts it.

## [0.0.22] - 2026-09-06

`3f86daa75d12a76923b369c13d54fa9c5f0be029`

### Fixed

- Popup leaves "Just a moment" when the desktop vault check fails or Firefox never answers. Native messages time out after 10s.

## [0.0.21] - 2026-09-05

`cdabb34b9d54a8220d7f20aa465d0f49016beeb4`

### Fixed

- Login URIs store as typed. Edit unwraps glued `https://androidapp://` so Save writes the app URI.

## [0.0.20] - 2026-09-05

`caae17d0182e756e65b20674a56b2df17ba98274`

### Fixed

- Authenticator asks for OTP codes so digits and the 1s timer show after Home skipped them.

## [0.0.19] - 2026-09-04

`85ff729a2f1079b7f95a1aa8b9e1c7af477d08a9`

### Added

- Settings toggle **Debug logging**. Off by default. When on, expected events print in the extension console.

### Fixed

- Wrong password, lockout `getMasterPasswordStatus` probes, and favicon misses no longer `console.error`.
- Auto-lock timeout labels compile as Lingui messages (`30 seconds`, `1 Minute`, and the rest).

## [0.0.18] - 2026-09-04

`644506a6e6ef468f34fb4a859d213ca8d8a5627c`

### Added

- Pairing handshake sends the browser name so desktop can list which client is which.

### Fixed

- Wrong pairing password stays retryable. Token is kept. Prompt stays up.

## [0.0.17] - 2026-09-02

`b1016b80772725d39d624aaad1cc70001d9b97a6`

### Added

- Autofill items on the login-detect right-click menu.

### Fixed

- Login-detect popup closes after a successful save.
- Onboarding wordmark capped so the pair step still fits.

[unreleased]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/f37a781f7fcb08b93f4b1cb28fd4a6ff7c252b96...HEAD
[0.0.24]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/d2faea1c4ce956b6c66f32ced05250b92cc3f8f8...f37a781f7fcb08b93f4b1cb28fd4a6ff7c252b96
[0.0.23]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/3f86daa75d12a76923b369c13d54fa9c5f0be029...d2faea1c4ce956b6c66f32ced05250b92cc3f8f8
[0.0.22]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/cdabb34b9d54a8220d7f20aa465d0f49016beeb4...3f86daa75d12a76923b369c13d54fa9c5f0be029
[0.0.21]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/caae17d0182e756e65b20674a56b2df17ba98274...cdabb34b9d54a8220d7f20aa465d0f49016beeb4
[0.0.20]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/85ff729a2f1079b7f95a1aa8b9e1c7af477d08a9...caae17d0182e756e65b20674a56b2df17ba98274
[0.0.19]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/644506a6e6ef468f34fb4a859d213ca8d8a5627c...85ff729a2f1079b7f95a1aa8b9e1c7af477d08a9
[0.0.18]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/b1016b80772725d39d624aaad1cc70001d9b97a6...644506a6e6ef468f34fb4a859d213ca8d8a5627c
[0.0.17]: https://github.com/Thaoh/lockwright-app-browser-extension/compare/c9bb84cc16c3d05db86da28f4b76f214533350ba...b1016b80772725d39d624aaad1cc70001d9b97a6
