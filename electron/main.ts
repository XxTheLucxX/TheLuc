import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

type FolderNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderNode[];
};

type FolderMetadata = {
  note?: string;
  tags?: string[];
};

type MetadataStore = Record<string, FolderMetadata>;

let mainWindow: BrowserWindow | null = null;
let selectedRoot: string | null = null;

const getMetadataPath = () => path.join(app.getPath('userData'), 'folder-metadata.json');

const loadStore = async (): Promise<MetadataStore> => {
  try {
    const data = await fs.readFile(getMetadataPath(), 'utf8');
    return JSON.parse(data) as MetadataStore;
  } catch {
    return {};
  }
};

const saveStore = async (store: MetadataStore) => {
  await fs.mkdir(path.dirname(getMetadataPath()), { recursive: true });
  await fs.writeFile(getMetadataPath(), JSON.stringify(store, null, 2), 'utf8');
};

const isInRoot = (targetPath: string, rootPath: string) => {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const assertScopedPath = (targetPath: string) => {
  if (!selectedRoot) {
    throw new Error('Root directory is not selected yet.');
  }
  const normalized = path.resolve(targetPath);
  const rootNormalized = path.resolve(selectedRoot);
  if (!isInRoot(normalized, rootNormalized)) {
    throw new Error('Access denied: path is outside selected root.');
  }
  return normalized;
};

const buildFolderTree = async (folderPath: string, maxDepth = 2, currentDepth = 0): Promise<FolderNode[]> => {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const sorted = entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

  return Promise.all(
    sorted.map(async (entry) => {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory() && currentDepth < maxDepth) {
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children: await buildFolderTree(fullPath, maxDepth, currentDepth + 1)
        };
      }

      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory()
      };
    })
  );
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

ipcMain.handle('app:pick-root', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  selectedRoot = path.resolve(result.filePaths[0]);
  return selectedRoot;
});

ipcMain.handle('app:get-root', async () => selectedRoot);

ipcMain.handle('fs:get-tree', async () => {
  if (!selectedRoot) {
    throw new Error('Choose a root directory first.');
  }

  return {
    rootPath: selectedRoot,
    tree: await buildFolderTree(selectedRoot)
  };
});

ipcMain.handle('fs:get-folder-details', async (_evt, folderPath: string) => {
  const scopedPath = assertScopedPath(folderPath);
  const stats = await fs.stat(scopedPath);
  const children = await fs.readdir(scopedPath, { withFileTypes: true });
  const store = await loadStore();
  const metadata = store[scopedPath] ?? {};

  return {
    path: scopedPath,
    name: path.basename(scopedPath),
    childFolderCount: children.filter((entry) => entry.isDirectory()).length,
    childFileCount: children.filter((entry) => entry.isFile()).length,
    lastModified: stats.mtime.toISOString(),
    note: metadata.note ?? '',
    tags: metadata.tags ?? []
  };
});

ipcMain.handle('fs:save-folder-metadata', async (_evt, folderPath: string, note: string, tags: string[]) => {
  const scopedPath = assertScopedPath(folderPath);
  const store = await loadStore();

  store[scopedPath] = {
    note,
    tags
  };

  await saveStore(store);
  return true;
});
