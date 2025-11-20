const LOCAL_STORAGE_KEY = 'terminal_portfolio_fs';

let fileSystem = {
  "home": {
    "type": "directory",
    "children": {
      "felixzsh": {
        "type": "directory",
        "children": {
          "loading.md": {
            "type": "file",
            "content": "# Loading...\n\nFetching latest data from GitHub..."
          }
        }
      }
    }
  }
};

function loadPersistedFS() {
  try {
    const persistedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (persistedData) {
      return JSON.parse(persistedData);
    }
  } catch (e) {
    console.error("Error loading filesystem from localStorage:", e);
  }
  return null;
}

function saveFS() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fileSystem));
  } catch (e) {
    console.error("Error saving filesystem to localStorage:", e);
  }
}

const persistedFS = loadPersistedFS();
if (persistedFS) {
  fileSystem = persistedFS;
  console.log("Filesystem loaded from local cache.");
} else {
  fetch('/filesystem.json')
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load filesystem: ${response.status} `);
      return response.json();
    })
    .then(data => {
      fileSystem = data;
      saveFS();
      console.log("Filesystem loaded from default file.");
    })
    .catch(error => {
      console.error("Error loading filesystem from default file:", error);
    });
}


function resolvePath(currentPath, targetPath) {
  if (targetPath.startsWith('/')) {
    return targetPath.split('/').filter(p => p !== '');
  }

  const parts = currentPath.split('/').filter(p => p !== '');
  const targetParts = targetPath.split('/').filter(p => p !== '');

  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  return parts;
}

function getNode(pathParts) {
  let current = fileSystem;
  for (const part of pathParts) {
    if (current.children && current.children[part]) {
      current = current.children[part];
    } else if (current[part] && (current[part].type === 'directory' || current[part].type === 'file')) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'R' && (e.ctrlKey || e.metaKey)) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.location.reload();
  }
});
