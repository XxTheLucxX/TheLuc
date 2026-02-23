const pickFolderBtn = document.getElementById('pickFolderBtn');
const treeRoot = document.getElementById('treeRoot');
const folderPath = document.getElementById('folderPath');
const tagsInput = document.getElementById('tagsInput');
const notesInput = document.getElementById('notesInput');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const folderContents = document.getElementById('folderContents');

let rootNode = null;
let selectedNode = null;

function keyFor(path) {
  return `folder-metadata:${path}`;
}

function loadMetadata(path) {
  const raw = localStorage.getItem(keyFor(path));
  if (!raw) return { tags: [], note: '' };
  try {
    const parsed = JSON.parse(raw);
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return { tags: [], note: '' };
  }
}

function saveMetadata(path, data) {
  localStorage.setItem(
    keyFor(path),
    JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString(),
    })
  );
}

function normalizeTags(raw) {
  const seen = new Set();
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function buildNode(handle, parentPath = '') {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  const dirs = [];
  const files = [];

  for await (const entry of handle.values()) {
    if (entry.kind === 'directory') dirs.push(entry);
    else files.push(entry.name);
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.localeCompare(b));

  const children = [];
  for (const dir of dirs) {
    children.push(await buildNode(dir, path));
  }

  return {
    id: path,
    name: handle.name,
    handle,
    children,
    files,
    expanded: false,
  };
}

function renderTree() {
  treeRoot.innerHTML = '';
  if (!rootNode) {
    treeRoot.textContent = 'Pick a root folder to begin.';
    return;
  }

  const list = document.createElement('ul');
  list.appendChild(renderNode(rootNode));
  treeRoot.appendChild(list);
}

function renderNode(node) {
  const li = document.createElement('li');
  li.className = 'tree-item';

  const row = document.createElement('div');
  row.className = 'tree-row';

  const toggle = document.createElement('button');
  toggle.textContent = node.children.length ? (node.expanded ? '▾' : '▸') : '·';
  toggle.disabled = !node.children.length;
  toggle.onclick = () => {
    node.expanded = !node.expanded;
    renderTree();
  };

  const label = document.createElement('span');
  label.className = `tree-label ${selectedNode?.id === node.id ? 'selected' : ''}`;
  label.textContent = node.name;
  label.onclick = () => selectNode(node);

  row.append(toggle, label);
  li.appendChild(row);

  if (node.expanded && node.children.length) {
    const childList = document.createElement('ul');
    for (const child of node.children) {
      childList.appendChild(renderNode(child));
    }
    li.appendChild(childList);
  }

  return li;
}

function renderContents(node) {
  folderContents.innerHTML = '';

  const folderItem = document.createElement('li');
  folderItem.textContent = `${node.children.length} subfolder(s)`;
  folderContents.appendChild(folderItem);

  for (const child of node.children) {
    const item = document.createElement('li');
    item.textContent = `📁 ${child.name}`;
    item.style.cursor = 'pointer';
    item.onclick = () => {
      child.expanded = true;
      selectNode(child);
    };
    folderContents.appendChild(item);
  }

  for (const fileName of node.files) {
    const item = document.createElement('li');
    item.textContent = `📄 ${fileName}`;
    folderContents.appendChild(item);
  }
}

function selectNode(node) {
  selectedNode = node;
  folderPath.textContent = node.id;
  const metadata = loadMetadata(node.id);
  tagsInput.value = metadata.tags.join(', ');
  notesInput.value = metadata.note;
  saveBtn.disabled = false;
  saveStatus.textContent = '';
  renderContents(node);
  renderTree();
}

pickFolderBtn.onclick = async () => {
  if (!window.showDirectoryPicker) {
    alert('This browser does not support the File System Access API. Use a recent Chromium-based browser.');
    return;
  }

  try {
    const rootHandle = await window.showDirectoryPicker();
    rootNode = await buildNode(rootHandle);
    rootNode.expanded = true;
    selectedNode = null;
    renderTree();
    folderPath.textContent = 'Select a folder in the tree.';
    tagsInput.value = '';
    notesInput.value = '';
    folderContents.innerHTML = '';
    saveBtn.disabled = true;
    saveStatus.textContent = '';
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error(error);
      alert('Unable to read that folder.');
    }
  }
};

saveBtn.onclick = () => {
  if (!selectedNode) return;
  const tags = normalizeTags(tagsInput.value);
  const note = notesInput.value;

  saveMetadata(selectedNode.id, { tags, note });
  tagsInput.value = tags.join(', ');
  saveStatus.textContent = 'Saved.';
};
