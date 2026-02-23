# TheLuc Folder Notes

A lightweight desktop project built with **Electron + React + TypeScript** for browsing a user-selected root directory and storing quick notes/tags per folder.

## Run locally

```bash
npm install
npm run dev
```

This starts Vite for the UI and then launches Electron once the dev server is ready.

## Package builds

```bash
npm run package
```

This creates distributables via `electron-builder` for the current host OS target.

## OS assumptions

- Designed for local desktop usage on **macOS, Windows, and Linux**.
- Folder picking uses native Electron dialogs.
- Packaging targets in this config: DMG (macOS), NSIS (Windows), AppImage (Linux).

## Data persistence (notes/tags)

Folder notes/tags are stored in Electron's `userData` location as:

- `folder-metadata.json`

Typical locations:

- macOS: `~/Library/Application Support/<app-name>/folder-metadata.json`
- Windows: `%APPDATA%/<app-name>/folder-metadata.json`
- Linux: `~/.config/<app-name>/folder-metadata.json`

All metadata is keyed by absolute folder path and only saved through paths validated under the selected root.
