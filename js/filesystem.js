/**
 * @typedef {Object} FSNode
 * @property {'directory'|'file'} type - The type of node.
 * @property {string} name - The name of the file or directory.
 * @property {string} [content] - The content (only for files).
 * @property {Object.<string, FSNode>} [children] - The children (only for directories).
 * @property {Object} metadata - System metadata (permissions, dates).
 * @property {number} metadata.createdAt - Creation timestamp (ms since epoch)
 * @property {number} metadata.modifiedAt - Last modification timestamp (ms since epoch)
 * @property {string} metadata.permissions - Unix-style permissions string (e.g., 'drwxr-xr-x', '-rw-r--r--')
 */

export const LOCAL_STORAGE_KEY = 'terminal_portfolio_fs';

export class FileSystem extends EventTarget {
  /**
   * @private
   * The root node of the file system.
   * @type {FSNode}
   */
  #root;

  constructor() {
    super();

    // --- Default Root Structure (Hardcoded fallback) ---
    const defaultRoot = this.#createNode('directory', '/');
    const home = this.#createNode('directory', 'home');
    const userDir = this.#createNode('directory', 'felixzsh');
    const readme = this.#createNode('file', 'loading.md', "# Loading...\n\nFetching latest data from GitHub...");

    defaultRoot.children['home'] = home;
    home.children['felixzsh'] = userDir;
    userDir.children['loading.md'] = readme;

    this.#root = defaultRoot;

    this.load();
  }

  // =========================================================================
  //  PRIVATE CORE METHODS
  // =========================================================================

  /**
   * @private
   * Helper to create nodes with standardized metadata.
   * @param {'directory'|'file'} type - Node type.
   * @param {string} name - Node name.
   * @param {string} [content] - File content (optional).
   * @returns {FSNode} The newly created node object.
   */
  #createNode(type, name, content = null) {
    const now = Date.now();
    return {
      type,
      name,
      content: type === 'file' ? (content || '') : undefined,
      children: type === 'directory' ? {} : undefined,
      metadata: {
        createdAt: now,
        modifiedAt: now,
        permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'
      }
    };
  }

  /**
   * @private
   * Saves to LocalStorage and notifies listeners.
   */
  #save() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.#root));
      this.dispatchEvent(new CustomEvent('fs-change', { detail: { root: this.#root } }));
    } catch (e) {
      console.error("FS: Error saving to localStorage:", e);
    }
  }

  // =========================================================================
  //  PUBLIC CORE API
  // =========================================================================

  /**
   * Converts relative or complex paths into a clean, absolute array of segments.
   * Logically handles '.' (current directory) and '..' (parent directory).
   * @param {string} pathStr - The target path (relative or absolute).
   * @param {string} cwd - Current Working Directory (e.g., '/home/user').
   * @returns {string[]} Array of path segments (e.g., ['home', 'felixzsh', 'docs'])
   */
  resolvePath(pathStr, cwd = '/') {
    const isAbsolute = pathStr.startsWith('/');
    const baseParts = isAbsolute ? [] : cwd.split('/').filter(p => p !== '');
    const targetParts = pathStr.split('/').filter(p => p !== '');

    const stack = [...baseParts];

    for (const part of targetParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    return stack;
  }

  /**
   * Traverses the filesystem tree based on path segments and returns the target node.
   * @param {string[]} segments - Array of path parts (from resolvePath).
   * @returns {FSNode|null} The target node, or null if not found.
   */
  getNode(segments) {
    let current = this.#root;
    if (segments.length === 0) {
      return current;
    }
    for (const segment of segments) {
      if (current.type !== 'directory') {
        return null;
      }
      const nextNode = current.children?.[segment];
      if (!nextNode) {
        return null;
      }
      current = nextNode;
    }
    return current;
  }

  // =========================================================================
  //  LOADING AND PERSISTENCE
  // =========================================================================

  /**
   * @public
   * Loads the FS: LocalStorage -> Fetch Default JSON -> Hardcoded Default
   */
  load() {
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (persisted) {
        this.#root = JSON.parse(persisted);
        console.log("FS: Loaded from LocalStorage cache.");
        return;
      }
    } catch (e) {
      console.warn(`FS: Corrupt LocalStorage data detected, falling back. err: ${e}`);
    }

    // If no persistence, try to load the default JSON file
    fetch('/filesystem.json')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        this.#root = data;
        this.#save();
        console.log("FS: Loaded from /filesystem.json.");
      })
      .catch(err => {
        console.error("FS: Failed to load external JSON, using hardcoded default.", err);
        this.#save();
      });
  }

  /**
   * @public
   * Deletes all persisted data and reloads the page.
   */
  reset() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
  }

  // =========================================================================
  //  PUBLIC API (INTERFACE FOR SHELL COMMANDS)
  // =========================================================================

  /**
   * Reads the content of a file.
   * @param {string} path 
   * @param {string} cwd 
   * @returns {string} The file content.
   * @throws {Error} If path is not found or is a directory.
   */
  readFile(path, cwd = '/') {
    const segments = this.resolvePath(path, cwd);
    const node = this.getNode(segments);

    if (!node) throw new Error(`fs: ${path}: No such file or directory`);
    if (node.type === 'directory') throw new Error(`fs: ${path}: Is a directory`);

    return node.content;
  }

  /**
   * Lists the names of entries in a directory.
   * @param {string} path 
   * @param {string} cwd 
   * @returns {string[]} List of entry names.
   * @throws {Error} If path is not found or is a file.
   */
  readDir(path, cwd = '/') {
    const segments = this.resolvePath(path, cwd);
    const node = this.getNode(segments);

    if (!node) throw new Error(`ls: ${path}: No such file or directory`);
    if (node.type !== 'directory') throw new Error(`ls: ${path}: Not a directory`);

    const childrenNames = Object.keys(node.children);
    return ['.', '..', ...childrenNames];
  }

  /**
   * Writes content to a file (creates if not exists, overwrites if exists, appends if option enabled).
   * @param {string} path 
   * @param {string} content 
   * @param {string} cwd 
   * @param {Object} [options] - Write options
   * @param {boolean} [options.append=false] - If true, appends content instead of overwriting
   * @throws {Error} If the parent directory doesn't exist or path points to a directory.
   */
  writeFile(path, content, cwd = '/', options = { append: false }) {
    const segments = this.resolvePath(path, cwd);
    const node = this.getNode(segments);
    const parentSegments = segments.slice(0, -1);
    const parent = this.getNode(parentSegments);
    const name = segments[segments.length - 1];

    if (!parent || parent.type !== 'directory') {
      throw new Error(`fs: ${path}: Parent directory not found or is not a directory`);
    }

    if (node) {
      // File already exists, update content and metadata
      if (node.type === 'directory') throw new Error(`fs: ${path}: Is a directory`);
      if (options.append) {
        node.content += content;
      } else {
        node.content = content;
      }
      node.metadata.modifiedAt = Date.now();
    } else {
      // Create new file node
      parent.children[name] = this.#createNode('file', name, content);
    }

    this.#save();
    return true;
  }

  /**
   * Creates a new directory.
   * @param {string} path 
   * @param {string} cwd 
   * @throws {Error} If the entry already exists or parent directory is missing.
   */
  createDirectory(path, cwd = '/') {
    const segments = this.resolvePath(path, cwd);
    const node = this.getNode(segments);
    const parentSegments = segments.slice(0, -1);
    const parent = this.getNode(parentSegments);
    const name = segments[segments.length - 1];

    if (node) throw new Error(`mkdir: ${path}: File exists`);
    if (!parent || parent.type !== 'directory') throw new Error(`mkdir: ${path}: Parent directory not found`);

    parent.children[name] = this.#createNode('directory', name);
    this.#save();
  }

  /**
   * Deletes a file or directory.
   * @param {string} path 
   * @param {boolean} recursive - Required to delete non-empty directories.
   * @param {string} cwd 
   * @throws {Error} If path not found, or directory is not empty and recursive is false.
   */
  delete(path, recursive = false, cwd = '/') {
    const segments = this.resolvePath(path, cwd);

    // Prevent deleting the root
    if (segments.length === 0) throw new Error(`rm: cannot remove root directory '/'`);

    const node = this.getNode(segments);
    const parentSegments = segments.slice(0, -1);
    const parent = this.getNode(parentSegments);
    const name = segments[segments.length - 1];

    if (!node) throw new Error(`rm: ${path}: No such file or directory`);

    if (node.type === 'directory') {
      const isEmpty = Object.keys(node.children).length === 0;
      if (!isEmpty && !recursive) {
        throw new Error(`rm: ${path}: Directory not empty. Use -r option.`);
      }
    }

    delete parent.children[name];
    this.#save();
  }

  /**
   * Gets metadata (stats) for a node.
   * @param {string} path 
   * @param {string} cwd 
   * @returns {{type: string, size: number, createdAt: number, modifiedAt: number, permissions: string}}
   * @throws {Error} If path is not found.
   */
  stat(path, cwd = '/') {
    const segments = this.resolvePath(path, cwd);
    const node = this.getNode(segments);

    if (!node) throw new Error(`stat: ${path}: No such file or directory`);

    return {
      name: node.name,
      type: node.type,
      size: node.type === 'file' ? node.content.length : 4096,
      createdAt: node.metadata.createdAt,
      modifiedAt: node.metadata.modifiedAt,
      permissions: node.metadata.permissions
    };
  }

  /**
   * Checks if a path exists.
   * @param {string} path 
   * @param {string} cwd 
   * @returns {boolean}
   */
  exists(path, cwd = '/') {
    try {
      this.stat(path, cwd);
      return true;
    } catch {
      return false;
    }
  }
}
