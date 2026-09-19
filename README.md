<p align="center">
  <img src="docs/logo.svg" alt="Lockwright" width="128"/>
</p>

# Lockwright Browser Extension

> Browser extension for Lockwright. Autofill, passkeys, and a bridge to the desktop vault.

Site: [lockwright.dexterity.works](https://lockwright.dexterity.works)

Community fork of PearPass (Apache 2.0). Not affiliated with or endorsed by Tether Data or the Pears project.

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Changelog](CHANGELOG.md)
- [Source review (AMO)](#source-review-amo)
- [Native messaging (desktop bridge) — Firefox / Zen / Flatpak](#native-messaging-desktop-bridge--firefox--zen--flatpak)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Dependencies](#dependencies)
- [Related Projects](#related-projects)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

Lockwright is an open-source, privacy-first password and identity manager. It encrypts and stores all data locally on your device.

This extension brings Lockwright into the browser: it autofills saved logins and identities, handles passkey creation and authentication, and communicates with the Lockwright desktop app for vault operations.

Lockwright is also available on [desktop](https://github.com/Dexterity-Works/lockwright-app-desktop) and [mobile](https://github.com/Dexterity-Works/lockwright-app-mobile).

---

## Features

- **Autofill.** Detects login and identity fields on any website and fills them from your vault in one click.
- **Passkey support.** Creates and uses passkeys for websites that support WebAuthn, stored securely in your vault.
- **Vault management.** Create, unlock, and switch between multiple encrypted vaults directly from the extension popup.
- **Record management.** Stores logins, identities, credit cards, and secure notes.
- **Password generator.** Generates strong, unique passwords.
- **Native app bridge.** Connects to the Lockwright desktop app for vault operations.
- **Internationalization.** Supports multiple languages using LinguiJS.

---

## Installation

### Build environment

- **OS:** Linux, macOS, or Windows
- **Node.js** 22.12.0 (see `.nvmrc`). [Install Node](https://nodejs.org/) or use nvm / fnm
- **pnpm** 11.10.0 via Corepack (ships with Node). Do not use npm or yarn
- **git** on `PATH` (`pnpm install` fetches git-hosted packages)

This repo is self-contained. Lockwright libs are pinned to GitHub SHAs. You do not need sibling clones.

### Steps

A git clone or a GitHub source zip of this repo is enough.

```bash
# 1. Enter the source tree (clone, or unzip the GitHub archive)
cd lockwright-app-browser-extension

# 2. Enable pnpm (Corepack ships with Node)
corepack enable
corepack prepare pnpm@11.10.0 --activate

# 3. Install dependencies (npm/yarn are blocked; lifecycle scripts are allowlisted)
NPM_CONFIG_LEGACY_PEER_DEPS=true pnpm install

# 4. Build the extension (Chrome: dist/ + dist-chrome.zip)
pnpm run build:chrome

# Or build a Firefox package (dist-firefox/ + dist-firefox.zip)
pnpm run build:firefox
```

### Source review (AMO)

`pnpm run build:firefox` is the build script. It runs Lingui extract/compile, the four Vite builds, then `scripts/package-firefox.mjs`. Compare `dist-firefox.zip` to the uploaded add-on. They should match.

`pnpm run build` creates a `dist/` directory for Chromium browsers. `pnpm run build:chrome` runs that, then writes `dist-chrome.zip` (manifest at the zip root) for Chrome Web Store upload.

`pnpm run build:firefox` runs the Chromium build, then packages a Gecko-ready copy into `dist-firefox/` and `dist-firefox.zip` (Chrome-only manifest fields and `offscreen.*` assets are stripped).

For development with hot-reloading:

```bash
pnpm run build:watch
```

This will watch for file changes and rebuild automatically.

### Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` directory.

### Load the extension in Firefox

1. Run `pnpm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `dist-firefox/manifest.json` (or `dist-firefox.zip`).

### Load the extension in Zen Browser

Zen is a Firefox fork. Use the **Firefox** package (`pnpm run build:firefox`), not the Chromium `dist/`.

**Recommended (permanent unsigned install. Pairing survives restarts):**

1. Run `pnpm run build:firefox` (produces `dist-firefox/` and `dist-firefox.zip`).
2. In Zen, open `about:config` and set `xpinstall.signatures.required` to `false`.
3. Open the Add-ons manager (`about:addons`) → gear menu → **Install Add-on From File…** → select `dist-firefox.zip`.
4. Pair the extension with the Lockwright desktop app once.

Temporary load (`about:debugging` → **Load Temporary Add-on…** → `dist-firefox/manifest.json`) also works for quick checks, but the add-on is removed on browser restart and you must re-pair.

### Native messaging (desktop bridge) — Firefox / Zen / Flatpak

The extension talks to the desktop app through a native messaging host. If the host is missing, the popup shows a connection error with Firefox/Zen guidance.

**Typical host manifest locations (Linux):**

| Browser | Path |
| --- | --- |
| Firefox / Zen (often) | `~/.mozilla/native-messaging-hosts/` |
| Zen-specific (if used) | `~/.zen/native-messaging-hosts/` |
| Flatpak Zen | Host must also be readable inside the sandbox (e.g. `~/.var/app/app.zen_browser.zen/…` or a Flatpak filesystem override) |

**macOS:** `~/Library/Application Support/Mozilla/NativeMessagingHosts/` (Zen may also use a Zen-specific Application Support folder).

**Windows:** Mozilla native messaging registry keys (same family as Firefox).

Always keep the desktop app running with browser integration enabled when using the extension.

---

## Usage Examples

[lockwright.dexterity.works](https://lockwright.dexterity.works) is the Lockwright site.

PearPass docs at [docs.pass.pears.com](https://docs.pass.pears.com) still describe setup, vault management, autofill, passkey usage, and the rest of the product at the fork point. They are not Lockwright docs.

---

## Testing

This project uses Jest for unit and integration testing.

```bash
pnpm test
```

---

## Dependencies

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [LinguiJS](https://lingui.dev/)
- [Redux](https://redux.js.org/)

---

## Related Projects

| Project | Description |
| --- | --- |
| [`lockwright-app-desktop`](https://github.com/Dexterity-Works/lockwright-app-desktop) | Desktop app for Lockwright |
| [`lockwright-app-mobile`](https://github.com/Dexterity-Works/lockwright-app-mobile) | Mobile app for Lockwright |
| [`lockwright-lib-vault`](https://github.com/Dexterity-Works/lockwright-lib-vault) | Vault management library |
| [`lockwright-lib-vault-core`](https://github.com/Dexterity-Works/lockwright-lib-vault-core) | Vault core |
| [`lockwright-lib-constants`](https://github.com/Dexterity-Works/lockwright-lib-constants) | Shared constants |

---

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

Apache License 2.0. See `LICENSE.md` and `NOTICE.md`.
