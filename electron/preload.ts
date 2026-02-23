import { contextBridge, ipcRenderer } from 'electron';

type FolderTreeResponse = {
  rootPath: string;
  tree: Array<{ name: string; path: string; isDirectory: boolean; children?: FolderTreeResponse['tree'] }>;
};

type FolderDetails = {
  path: string;
  name: string;
  childFolderCount: number;
  childFileCount: number;
  lastModified: string;
  note: string;
  tags: string[];
};

contextBridge.exposeInMainWorld('desktopApi', {
  pickRoot: () => ipcRenderer.invoke('app:pick-root') as Promise<string | null>,
  getRoot: () => ipcRenderer.invoke('app:get-root') as Promise<string | null>,
  getTree: () => ipcRenderer.invoke('fs:get-tree') as Promise<FolderTreeResponse>,
  getFolderDetails: (folderPath: string) => ipcRenderer.invoke('fs:get-folder-details', folderPath) as Promise<FolderDetails>,
  saveFolderMetadata: (folderPath: string, note: string, tags: string[]) =>
    ipcRenderer.invoke('fs:save-folder-metadata', folderPath, note, tags) as Promise<boolean>
});
