const LOCAL_STORAGE_KEY = 'terminal_portfolio_fs';

/**
 * Clase que gestiona un sistema de archivos virtual persistente en localStorage.
 */
export class FileSystem {
  /**
   * @private
   * El objeto raíz del sistema de archivos.
   * Estructura: { name: { type: 'directory'|'file', children: {...} | content: '...' } }
   */
  #root = {};

  constructor() {
    // Inicialización de la estructura predeterminada si no se carga nada
    this.#root = {
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

  // --- Métodos Privados (Bajo Nivel) ---

  /**
   * @private
   * Resuelve una ruta relativa a una ruta absoluta, manejando '.' y '..'.
   * @param {string} currentPath - Directorio de trabajo actual (e.g., '/home/user').
   * @param {string} targetPath - Ruta objetivo (relativa o absoluta).
   * @returns {string[]} Array de partes de la ruta resuelta.
   */
  #resolvePath(currentPath, targetPath) {
    let parts = [];

    if (targetPath.startsWith('/')) {
      // Ruta absoluta
      parts = targetPath.split('/').filter(p => p !== '');
    } else {
      // Ruta relativa
      parts = currentPath.split('/').filter(p => p !== '');
      const targetParts = targetPath.split('/').filter(p => p !== '');

      for (const part of targetParts) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }
    }
    return parts;
  }

  /**
   * @private
   * Obtiene el nodo (el objeto JS) en una ruta específica.
   * @param {string[]} pathParts - Array de partes de la ruta resuelta.
   * @returns {object|null} El nodo encontrado o null.
   */
  #getNode(pathParts) {
    if (pathParts.length === 0) {
      // La ruta raíz '/' se representa por el objeto this.#root
      return this.#root;
    }

    let current = this.#root;
    for (const part of pathParts) {
      // Los nodos en la raíz se guardan directamente, los demás en 'children'
      const container = current.children || current;

      if (container[part] && (container[part].type === 'directory' || container[part].type === 'file')) {
        current = container[part];
      } else {
        return null;
      }
    }
    return current;
  }

  /**
   * @private
   * Obtiene el nodo padre y el nombre de la entrada en una ruta.
   * @param {string[]} pathParts - Array de partes de la ruta resuelta.
   * @returns {{parentNode: object|null, name: string}} Objeto con el nodo padre y el nombre del nodo objetivo.
   * @throws {Error} Si la ruta es la raíz.
   */
  #getParentNodeAndName(pathParts) {
    if (pathParts.length === 0) {
      throw new Error("Cannot get parent of root directory '/'");
    }

    const name = pathParts[pathParts.length - 1];
    const parentParts = pathParts.slice(0, -1);
    const parentNode = this.#getNode(parentParts);

    return { parentNode, name };
  }

  // --- Métodos de Persistencia (Privados) ---

  /**
   * @private
   * Guarda el estado actual del sistema de archivos en localStorage.
   */
  save() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.#root));
    } catch (e) {
      console.error("Error saving filesystem to localStorage:", e);
    }
  }

  /**
   * @public
   * Carga el sistema de archivos desde localStorage o el archivo predeterminado.
   */
  load() {
    try {
      const persistedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (persistedData) {
        this.#root = JSON.parse(persistedData);
        console.log("Filesystem loaded from local cache.");
        return;
      }
    } catch (e) {
      console.error("Error loading filesystem from localStorage:", e);
    }

    // Carga del archivo por defecto si no hay datos persistentes
    fetch('/filesystem.json')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load filesystem: ${response.status}`);
        return response.json();
      })
      .then(data => {
        // La raíz del FS debe ser un directorio virtual, pero el JSON puede ser el contenido.
        // Aseguramos que la estructura cargada sea la raíz.
        this.#root = data;
        this.save();
        console.log("Filesystem loaded from default file.");
      })
      .catch(error => {
        console.error("Error loading filesystem from default file:", error);
      });
  }

  /**
   * @public
   * Restablece el sistema de archivos a su estado inicial.
   */
  reset() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    // Opcional: recargar la página para una recarga limpia
    window.location.reload();
  }

  // --- Métodos Públicos (API) ---

  // ** 1. Consultas (Consultar) **

  /**
   * Obtiene el tipo de entrada en la ruta.
   * @param {string} path - Ruta (relativa o absoluta).
   * @param {string} currentPath - Ruta de trabajo actual (solo para rutas relativas).
   * @returns {'file'|'directory'|null} Tipo de nodo o null si no existe.
   */
  getType(path, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);
    const node = this.#getNode(parts);
    return node ? node.type : null;
  }

  /**
   * Verifica si una ruta existe.
   * @param {string} path - Ruta.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @returns {boolean}
   */
  exists(path, currentPath = '/') {
    return this.getType(path, currentPath) !== null;
  }

  /**
   * Verifica si una ruta es un directorio.
   * @param {string} path - Ruta.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @returns {boolean}
   */
  isDirectory(path, currentPath = '/') {
    return this.getType(path, currentPath) === 'directory';
  }

  /**
   * Verifica si una ruta es un archivo.
   * @param {string} path - Ruta.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @returns {boolean}
   */
  isFile(path, currentPath = '/') {
    return this.getType(path, currentPath) === 'file';
  }

  /**
   * Lee el contenido de un archivo.
   * @param {string} path - Ruta al archivo.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @returns {string} Contenido del archivo.
   * @throws {Error} Si la ruta no existe o no es un archivo.
   */
  readFile(path, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);
    const node = this.#getNode(parts);

    if (!node) {
      throw new Error(`Path not found: ${path}`);
    }
    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }

    return node.content || '';
  }

  /**
   * Lista el contenido de un directorio.
   * @param {string} path - Ruta al directorio.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @returns {string[]} Array de nombres de entradas (archivos y directorios).
   * @throws {Error} Si la ruta no existe o no es un directorio.
   */
  readDir(path, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);
    const node = this.#getNode(parts);

    if (!node) {
      throw new Error(`Path not found: ${path}`);
    }
    if (node.type !== 'directory') {
      throw new Error(`Not a directory: ${path}`);
    }

    // Se usa `node.children` para directorios que no son la raíz
    const container = node.children || node;

    return Object.keys(container).filter(key =>
      container[key] && (container[key].type === 'file' || container[key].type === 'directory')
    );
  }

  // ** 2. Mutaciones (Crear/Actualizar/Eliminar) **

  /**
   * Escribe contenido en un archivo (crea si no existe).
   * @param {string} path - Ruta al archivo.
   * @param {string} content - Contenido a escribir.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @throws {Error} Si el padre no existe o la ruta es un directorio.
   */
  writeFile(path, content, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);
    const { parentNode, name } = this.#getParentNodeAndName(parts);

    if (!parentNode || parentNode.type !== 'directory') {
      throw new Error(`Parent directory not found or is not a directory for: ${path}`);
    }

    // Contenedor de children, asegurando que existe para directorios no raíz
    parentNode.children = parentNode.children || {};

    // Si ya existe, validar que sea un archivo
    if (parentNode.children[name] && parentNode.children[name].type !== 'file') {
      throw new Error(`Cannot write to a directory: ${path}`);
    }

    // Crear o actualizar
    parentNode.children[name] = { type: 'file', content };
    this.save();
  }

  /**
   * Crea un nuevo directorio.
   * @param {string} path - Ruta al nuevo directorio.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @throws {Error} Si el padre no existe o la entrada ya existe.
   */
  createDirectory(path, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);
    const existingNode = this.#getNode(parts);

    if (existingNode) {
      throw new Error(`Entry already exists: ${path}`);
    }

    const { parentNode, name } = this.#getParentNodeAndName(parts);

    if (!parentNode || parentNode.type !== 'directory') {
      throw new Error(`Parent directory not found or is not a directory for: ${path}`);
    }

    // Contenedor de children
    parentNode.children = parentNode.children || {};

    // Crear directorio
    parentNode.children[name] = { type: 'directory', children: {} };
    this.save();
  }

  /**
   * Elimina un archivo.
   * @param {string} path - Ruta al archivo.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @throws {Error} Si no existe, no es un archivo o es la raíz.
   */
  deleteFile(path, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);

    if (parts.length === 0) {
      throw new Error(`Cannot delete root directory '/'`);
    }

    const { parentNode, name } = this.#getParentNodeAndName(parts);

    if (!parentNode || !parentNode.children || !parentNode.children[name]) {
      throw new Error(`Path not found: ${path}`);
    }
    if (parentNode.children[name].type !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }

    delete parentNode.children[name];
    this.save();
  }

  /**
   * Elimina un directorio.
   * @param {string} path - Ruta al directorio.
   * @param {boolean} recursive - Si es true, elimina directorios no vacíos.
   * @param {string} currentPath - Ruta de trabajo actual.
   * @throws {Error} Si no existe, no es un directorio, es la raíz o no está vacío y no es recursivo.
   */
  deleteDirectory(path, recursive = false, currentPath = '/') {
    const parts = this.#resolvePath(currentPath, path);

    if (parts.length === 0) {
      throw new Error(`Cannot delete root directory '/'`);
    }

    const { parentNode, name } = this.#getParentNodeAndName(parts);
    const container = parentNode.children;

    if (!parentNode || !container || !container[name]) {
      throw new Error(`Path not found: ${path}`);
    }

    const dirNode = container[name];

    if (dirNode.type !== 'directory') {
      throw new Error(`Not a directory: ${path}`);
    }

    // Verificar si el directorio está vacío (solo si no es recursivo)
    const isNotEmpty = dirNode.children && Object.keys(dirNode.children).length > 0;
    if (!recursive && isNotEmpty) {
      throw new Error(`Directory not empty: ${path}. Use recursive flag.`);
    }

    delete container[name];
    this.save();
  }

  /**
       * Resuelve y devuelve la ruta absoluta del directorio padre.
       * Mantiene la lógica de resolución de '..' y '.' privada.
       * @param {string} targetPath - La ruta al archivo o directorio.
       * @param {string} currentPath - La ruta de trabajo actual.
       * @returns {string} La ruta absoluta del directorio padre.
       */
  getParentDirPath(targetPath, currentPath = '/') {
    // Usa el método core privado para resolver la ruta limpia
    const parts = this.#resolvePath(currentPath, targetPath);

    // Si es la raíz o equivalente, esto fallará
    if (parts.length === 0) {
      return '/'; // Manejar la raíz como su propio padre conceptualmente (o lanzar error)
    }

    // Elimina el último componente (el nombre del archivo)
    const parentParts = parts.slice(0, -1);

    // Convierte las partes del padre a una cadena absoluta.
    return '/' + parentParts.join('/');
  }
}


document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'R' && (e.ctrlKey || e.metaKey)) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
  }
});
