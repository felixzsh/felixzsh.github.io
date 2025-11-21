/**
 * FileSystem - Virtual filesystem with localStorage persistence
 */

const LOCAL_STORAGE_KEY = 'terminal_portfolio_fs';

export class FileSystem {
  constructor() {
    this.root = {
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

    this.load();
  }

  /**
   * Loads filesystem from localStorage or fetches from filesystem.json
   */
  load() {
    try {
      const persistedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (persistedData) {
        this.root = JSON.parse(persistedData);
        console.log("Filesystem loaded from local cache.");
        return;
      }
    } catch (e) {
      console.error("Error loading filesystem from localStorage:", e);
    }

    // Load from filesystem.json if no persisted data
    fetch('/filesystem.json')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load filesystem: ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.root = data;
        this.save();
        console.log("Filesystem loaded from default file.");
      })
      .catch(error => {
        console.error("Error loading filesystem from default file:", error);
      });
  }

  /**
   * Saves filesystem to localStorage
   */
  save() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.root));
    } catch (e) {
      console.error("Error saving filesystem to localStorage:", e);
    }
  }

  /**
   * Resets filesystem to default from filesystem.json
   */
  reset() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
  }

  /**
   * Resolves a path relative to current path
   * @param {string} currentPath - Current working directory
   * @param {string} targetPath - Target path (relative or absolute)
   * @returns {string[]} Array of path parts
   */
  resolvePath(currentPath, targetPath) {
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

  /**
   * Gets a node from the filesystem
   * @param {string[]|string} pathParts - Array of path parts or string path
   * @returns {object|null} Node object or null if not found
   */
  getNode(pathParts) {
    // Convert string path to array if needed
    if (typeof pathParts === 'string') {
      pathParts = pathParts.split('/').filter(p => p !== '');
    }

    let current = this.root;
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

  /**
   * Checks if a path exists
   * @param {string} path - Path to check
   * @returns {boolean} True if path exists
   */
  exists(path) {
    const parts = this.resolvePath('/', path);
    return this.getNode(parts) !== null;
  }

  /**
   * Checks if a path is a directory
   * @param {string} path - Path to check
   * @returns {boolean} True if path is a directory
   */
  isDirectory(path) {
    const parts = this.resolvePath('/', path);
    const node = this.getNode(parts);
    return node !== null && node.type === 'directory';
  }

  /**
   * Checks if a path is a file
   * @param {string} path - Path to check
   * @returns {boolean} True if path is a file
   */
  isFile(path) {
    const parts = this.resolvePath('/', path);
    const node = this.getNode(parts);
    return node !== null && node.type === 'file';
  }

  /**
   * Reads file content
   * @param {string} path - Path to file
   * @returns {string|null} File content or null if not found/not a file
   */
  readFile(path) {
    const parts = this.resolvePath('/', path);
    const node = this.getNode(parts);
    if (node && node.type === 'file') {
      return node.content || '';
    }
    return null;
  }

  /**
   * Lists directory contents
   * @param {string} path - Path to directory
   * @returns {string[]|null} Array of entry names or null if not found/not a directory
   */
  readDir(path) {
    const parts = this.resolvePath('/', path);
    const node = this.getNode(parts);
    if (node && node.type === 'directory' && node.children) {
      return Object.keys(node.children);
    }
    return null;
  }

  /**
   * Writes content to a file (creates if doesn't exist)
   * @param {string} path - Path to file
   * @param {string} content - Content to write
   * @returns {boolean} True if successful
   */
  writeFile(path, content) {
    const parts = this.resolvePath('/', path);
    const fileName = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);
    const parentNode = this.getNode(parentParts);

    if (!parentNode || parentNode.type !== 'directory') {
      return false;
    }

    if (!parentNode.children) {
      parentNode.children = {};
    }

    // Create or update file
    if (!parentNode.children[fileName]) {
      parentNode.children[fileName] = { type: 'file', content: '' };
    }

    if (parentNode.children[fileName].type !== 'file') {
      return false; // Can't write to a directory
    }

    parentNode.children[fileName].content = content;
    this.save();
    return true;
  }

  /**
   * Creates a directory
   * @param {string} path - Path to directory
   * @returns {boolean} True if successful
   */
  createDirectory(path) {
    const parts = this.resolvePath('/', path);
    const dirName = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);
    const parentNode = this.getNode(parentParts);

    if (!parentNode || parentNode.type !== 'directory') {
      return false;
    }

    if (!parentNode.children) {
      parentNode.children = {};
    }

    if (parentNode.children[dirName]) {
      return false; // Already exists
    }

    parentNode.children[dirName] = { type: 'directory', children: {} };
    this.save();
    return true;
  }

  /**
   * Deletes a file
   * @param {string} path - Path to file
   * @returns {boolean} True if successful
   */
  deleteFile(path) {
    const parts = this.resolvePath('/', path);
    const fileName = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);
    const parentNode = this.getNode(parentParts);

    if (!parentNode || !parentNode.children || !parentNode.children[fileName]) {
      return false;
    }

    if (parentNode.children[fileName].type !== 'file') {
      return false; // Not a file
    }

    delete parentNode.children[fileName];
    this.save();
    return true;
  }

  /**
   * Deletes a directory
   * @param {string} path - Path to directory
   * @param {boolean} recursive - If true, delete non-empty directories
   * @returns {boolean} True if successful
   */
  deleteDirectory(path, recursive = false) {
    const parts = this.resolvePath('/', path);
    const dirName = parts[parts.length - 1];
    const parentParts = parts.slice(0, -1);
    const parentNode = this.getNode(parentParts);

    if (!parentNode || !parentNode.children || !parentNode.children[dirName]) {
      return false;
    }

    const dirNode = parentNode.children[dirName];

    if (dirNode.type !== 'directory') {
      return false; // Not a directory
    }

    // Check if directory is empty
    if (!recursive && dirNode.children && Object.keys(dirNode.children).length > 0) {
      return false; // Directory not empty
    }

    delete parentNode.children[dirName];
    this.save();
    return true;
  }
}


document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'R' && (e.ctrlKey || e.metaKey)) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
  }
});
