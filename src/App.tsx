import { FormEvent, useEffect, useMemo, useState } from 'react';

type TreeNodeProps = {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
};

function TreeNodeItem({ node, selectedPath, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedPath === node.path;

  return (
    <li>
      <div className={`tree-item ${isSelected ? 'selected' : ''}`}>
        {node.isDirectory && node.children && node.children.length > 0 ? (
          <button className="toggle-btn" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="toggle-spacer" />
        )}
        <button className="node-btn" onClick={() => node.isDirectory && onSelect(node.path)} disabled={!node.isDirectory}>
          {node.name}
        </button>
      </div>
      {expanded && node.children && node.children.length > 0 ? (
        <ul className="tree-list nested">
          {node.children.filter((child) => child.isDirectory).map((child) => (
            <TreeNodeItem key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [details, setDetails] = useState<FolderDetails | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('');

  const tagsDraft = useMemo(
    () => tagInput.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tagInput]
  );

  const refreshTree = async () => {
    const response = await window.desktopApi.getTree();
    setTree(response.tree.filter((node) => node.isDirectory));
    setRootPath(response.rootPath);
    if (!selectedPath) {
      setSelectedPath(response.rootPath);
    }
  };

  const loadDetails = async (folderPath: string) => {
    const nextDetails = await window.desktopApi.getFolderDetails(folderPath);
    setDetails(nextDetails);
    setNoteDraft(nextDetails.note);
    setTagInput(nextDetails.tags.join(', '));
  };

  const handleChooseRoot = async () => {
    const picked = await window.desktopApi.pickRoot();
    if (!picked) {
      setStatus('No folder selected.');
      return;
    }

    setSelectedPath(picked);
    setStatus('Root selected.');
    await refreshTree();
    await loadDetails(picked);
  };

  useEffect(() => {
    void (async () => {
      const existingRoot = await window.desktopApi.getRoot();
      if (existingRoot) {
        await refreshTree();
        setSelectedPath(existingRoot);
        await loadDetails(existingRoot);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedPath) {
      void loadDetails(selectedPath);
    }
  }, [selectedPath]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!details) return;

    await window.desktopApi.saveFolderMetadata(details.path, noteDraft, tagsDraft);
    setStatus('Saved note and tags.');
    await loadDetails(details.path);
  };

  if (!rootPath) {
    return (
      <main className="entry-screen">
        <div className="entry-card">
          <h1>Folder Notes</h1>
          <p>Select a root directory to start. All read/write actions stay scoped to that root.</p>
          <button className="primary-btn" onClick={() => void handleChooseRoot()}>
            Pick Root Directory
          </button>
          {status ? <p className="status">{status}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="panel left-panel">
        <div className="panel-header">
          <h2>Folders</h2>
          <button className="secondary-btn" onClick={() => void handleChooseRoot()}>
            Change Root
          </button>
        </div>
        <p className="root-path">{rootPath}</p>
        <ul className="tree-list">
          <li>
            <button className={`node-btn root ${selectedPath === rootPath ? 'selected' : ''}`} onClick={() => setSelectedPath(rootPath)}>
              {rootPath.split(/[\\/]/).pop() || rootPath}
            </button>
          </li>
          {tree.map((node) => (
            <TreeNodeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={setSelectedPath} />
          ))}
        </ul>
      </aside>

      <section className="panel right-panel">
        <h2>Folder Details</h2>
        {details ? (
          <>
            <dl className="detail-grid">
              <dt>Name</dt>
              <dd>{details.name}</dd>
              <dt>Path</dt>
              <dd>{details.path}</dd>
              <dt>Subfolders</dt>
              <dd>{details.childFolderCount}</dd>
              <dt>Files</dt>
              <dd>{details.childFileCount}</dd>
              <dt>Last Modified</dt>
              <dd>{new Date(details.lastModified).toLocaleString()}</dd>
            </dl>

            <form className="metadata-form" onSubmit={handleSave}>
              <label>
                Note
                <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={6} />
              </label>
              <label>
                Tags (comma-separated)
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="example, docs" />
              </label>
              <button className="primary-btn" type="submit">
                Save
              </button>
            </form>
          </>
        ) : (
          <p>Select a folder from the left panel.</p>
        )}
        {status ? <p className="status">{status}</p> : null}
      </section>
    </main>
  );
}
