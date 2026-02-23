/// <reference types="vite/client" />

type TreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
};

type FolderTreeResponse = {
  rootPath: string;
  tree: TreeNode[];
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

declare global {
  interface Window {
    desktopApi: {
      pickRoot: () => Promise<string | null>;
      getRoot: () => Promise<string | null>;
      getTree: () => Promise<FolderTreeResponse>;
      getFolderDetails: (folderPath: string) => Promise<FolderDetails>;
      saveFolderMetadata: (folderPath: string, note: string, tags: string[]) => Promise<boolean>;
    };
  }
}

export {};
