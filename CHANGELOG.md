# Changelog

All notable changes to the Lockwright browser extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Headings are App versions (`package.json` / `public/manifest.json`), not superproject Release tags.

Starts at 0.0.17, after the Lockwright package rename. Earlier history is git.

## [Unreleased]

## [0.0.33] - 2026-10-07

### Fixed

- Chrome no longer logs "cross-world extension resource mismatch" preload warnings on the popup, onboarding and in-page popups, and loads each script once.
- With an item type selected in the sidebar, the type menu closes instead of reopening on All Items.

## [0.0.32] - 2026-10-03

`85e789267cc7e834a2087ee5db56f8cfddc8e975`

### Changed

- Build the UI kit from source; pnpm no longer runs the kit's install script.
- With an item type selected in the sidebar, + opens that type's add form instead of the type menu.

### Fixed

- Generator history shows the vault entries that use each password, even ones never stamped.
- Generator history no longer loses entries when another device writes at the same time or has not synced yet.
- A password generated on a device whose clock is behind another device's stays at the top of generator history instead of dropping out.
- Cleared generator history stays cleared when another device or an older app version has not caught up. Generating and using a password at once no longer adds it twice.

## [0.0.31] - 2026-09-30

`d8eda1014fc4fc9d0c9a39975c9710203b8b69a5`

### Security

- Domain matching, passkey rpId checks and the passkey save list count the private Public Suffix List section, so tenants on shared hosts like vercel.app or github.io are separate sites.

### Changed

- The popup build runs Babel once over src/. The StyleX pass covers only react-strict-dom and the UI kit.

### Removed

- The tether-dev-docs git dependency. The ESLint config it shared now lives in eslint.config.js, with its plugins pinned as devDependencies.

## [0.0.30] - 2026-09-26

`4d21c4e0aa275dc27e65a84179f1de0c604926cd`

### Security

- Only extension pages may relay to the desktop, and relayed commands are checked against the command list.
- Auto-lock settings and the activity heartbeat travel over the secure channel.
- Passkeys are signed from the request the background stored, never from popup parameters.
- The client key is derived with 600,000 PBKDF2 iterations. An existing key is upgraded on its next unlock.
- The autofill frame posts only to the page origin. The popup CSP no longer allows docs.google.com or hooks.slack.com.

### Changed

- Redux, events, autoprefixer, npm-run-all and four utils packages are gone; small local helpers replace them. The content script no longer bundles React (212 KB to 63 KB). Unused fonts and images removed.
- Pin lib-vault `b1a4bb0` and the utils libraries to commits without install hooks.

### Fixed

- The test suite loads every package again and runs green.

## [0.0.29] - 2026-09-26

`c418bd1a1b6be44e548b97a7fceedc88c9a90538`

### Security

- Passkey requests use the requesting frame's origin, never the value the page supplied, and the relying party must match the page host. The result goes only to the frame that asked, and the popup shows the site.
- Popup Autofill fills the top frame only and skips hidden or zero-size fields.
- A captured login is returned only to the frame origin that saved it.
- Content scripts no longer pass as extension pages.
- Pin lib-vault `7b16a0e`: a protected vault's unwrap key stays out of the master catalog, pairing refuses a vault id already on the device, and a leaving device loses its writer key. A protected vault renamed or paired before this build should be moved to a new vault.

### Changed

- The revoke dialog says the device keeps reading until the vault is moved.

## [0.0.28] - 2026-09-24

`228bf1ec4c40c8f9fff9590711da38027b2e4f4d`

### Fixed

- Toolbar popup opens again instead of showing an empty dark panel.

## [0.0.27] - 2026-09-24

`405f162420b37806e6803ab0b6bd6237d4241e4c`

### Fixed

- Save card title uses the page title.
- Locked vault does not reopen the logo iframe.
- Zen toolbar popup keeps its size.
- Clipboard replacement can be turned off.
- Generator history shows each site and entry a generated password was used for.

## [0.0.26] - 2026-09-22

`7f04001dfc7dd387722d761c158224395ecc3316`

### Fixed

- A 2FA field labeled OTP matches when the input name is `_auth_code`.
- Authenticator and Generator sit in one sidebar group.

## [0.0.25] - 2026-09-14

`a6ac296bfb242127aa37ddf37b37b78afc585e32`

### Fixed

- Auto Lock timeout menu shows durations (`30 seconds`, `1 Minute`, `Never`) instead of Lingui message ids.
- Password strength label `Safe` is a compiled Lingui message. It no longer warns as uncompiled.
- Desktop-unavailable `checkAvailability` timeouts and native-host disconnects stay out of the console unless Debug logging is on.
- Inactivity auto-lock does not throw when vault status refetch returns nothing.
- Password generator history no longer passes Tailwind `className` into kit `Text` (Strict DOM `invalid prop "className"`).

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

[unreleased]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/4d21c4e0aa275dc27e65a84179f1de0c604926cd...HEAD
[0.0.30]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/c418bd1a1b6be44e548b97a7fceedc88c9a90538...4d21c4e0aa275dc27e65a84179f1de0c604926cd
[0.0.29]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/228bf1ec4c40c8f9fff9590711da38027b2e4f4d...c418bd1a1b6be44e548b97a7fceedc88c9a90538
[0.0.28]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/405f162420b37806e6803ab0b6bd6237d4241e4c...228bf1ec4c40c8f9fff9590711da38027b2e4f4d
[0.0.27]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/7f04001dfc7dd387722d761c158224395ecc3316...405f162420b37806e6803ab0b6bd6237d4241e4c
[0.0.26]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/a6ac296bfb242127aa37ddf37b37b78afc585e32...7f04001dfc7dd387722d761c158224395ecc3316
[0.0.25]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/f37a781f7fcb08b93f4b1cb28fd4a6ff7c252b96...a6ac296bfb242127aa37ddf37b37b78afc585e32
[0.0.24]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/d2faea1c4ce956b6c66f32ced05250b92cc3f8f8...f37a781f7fcb08b93f4b1cb28fd4a6ff7c252b96
[0.0.23]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/3f86daa75d12a76923b369c13d54fa9c5f0be029...d2faea1c4ce956b6c66f32ced05250b92cc3f8f8
[0.0.22]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/cdabb34b9d54a8220d7f20aa465d0f49016beeb4...3f86daa75d12a76923b369c13d54fa9c5f0be029
[0.0.21]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/caae17d0182e756e65b20674a56b2df17ba98274...cdabb34b9d54a8220d7f20aa465d0f49016beeb4
[0.0.20]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/85ff729a2f1079b7f95a1aa8b9e1c7af477d08a9...caae17d0182e756e65b20674a56b2df17ba98274
[0.0.19]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/644506a6e6ef468f34fb4a859d213ca8d8a5627c...85ff729a2f1079b7f95a1aa8b9e1c7af477d08a9
[0.0.18]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/b1016b80772725d39d624aaad1cc70001d9b97a6...644506a6e6ef468f34fb4a859d213ca8d8a5627c
[0.0.17]: https://github.com/Dexterity-Works/lockwright-app-browser-extension/compare/c9bb84cc16c3d05db86da28f4b76f214533350ba...b1016b80772725d39d624aaad1cc70001d9b97a6
