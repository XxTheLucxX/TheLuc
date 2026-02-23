# TheLuc Folder Notes

Minimal folder explorer focused on **folder trees**, with per-folder notes and tags.

## Why `npm run dev` now works
This app intentionally has **no external npm dependencies**, so you will not hit the Windows error:
`'concurrently' is not recognized`.

## Run

```bash
npm run dev
```

Then open: <http://localhost:5173>

## Features
- Pick a root folder with the browser File System Access API.
- Render a recursive folder tree (directories only).
- View selected folder contents (subfolders + files list).
- Add tags and notes per folder.
- Persist metadata in browser `localStorage`.

## Notes
- Best experience in Chromium-based browsers (Edge/Chrome).
- Metadata key is based on displayed folder path within the selected root.
