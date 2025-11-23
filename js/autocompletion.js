/**
 * Módulo especializado en la lógica de autocompletado de comandos y rutas.
 */
export class AutocompletionHandler {

  /**
   * @param {FileSystem} fs - Instancia del sistema de archivos.
   * @param {function(): string} getCurrentPath - Función para obtener el directorio de trabajo actual.
   * @param {function(): string} getBinPath - Función para obtener la ruta de binarios (PATH).
   */
  constructor(fs, getCurrentPath, getBinPath) {
    this.fs = fs;
    this.getCurrentPath = getCurrentPath;
    this.getBinPath = getBinPath;
  }

  /**
   * Punto de entrada principal para el TTY.
   * @param {string} currentInput - Cadena de entrada actual.
   * @returns {object|null} Resultado de autocompletado ({ type, value/suggestions }).
   */
  handleCompletion(currentInput) {
    const { isCommand, token, prefix } = this.#parseCompletionContext(currentInput);

    const candidates = isCommand
      ? this.#getCommandCandidates(token)
      : this.#getPathCandidates(token);

    if (candidates.length === 0) return null;

    if (candidates.length === 1) {
      // Autocompletar: Usar el prefijo original + el candidato
      return { type: 'complete', value: prefix + candidates[0] };
    } else {
      // Sugerencias: Mostrar solo el nombre final, eliminando el prefijo de ruta
      const suggestions = candidates.map(c => c.split('/').pop());
      return { type: 'suggestions', suggestions: suggestions };
    }
  }

  // --------------------------------------------------------------------------
  //                              MÉTODOS PRIVADOS (Core Logic)
  // --------------------------------------------------------------------------

  #parseCompletionContext(input) {
    const parts = input.split(/\s+/);
    const isNewArg = input.endsWith(' ');

    const isCommand = parts.length === 1 && !isNewArg;
    const token = isNewArg ? '' : parts[parts.length - 1];
    const prefix = input.substring(0, input.length - token.length);

    return { isCommand, token, prefix };
  }

  #getCommandCandidates(token) {
    const binPath = this.getBinPath();
    if (!this.fs.isDirectory(binPath)) return [];

    const files = this.fs.readDir(binPath) || [];

    return files
      .filter(f => f.endsWith('.js') && f.startsWith(token))
      .map(f => f.replace('.js', ' ')); // Agrega espacio para separar del siguiente argumento
  }

  #getPathCandidates(token) {
    const cwd = this.getCurrentPath();

    // 1. Separar directorio base y término de búsqueda
    const lastSlash = token.lastIndexOf('/');
    const hasSlash = lastSlash !== -1;

    const searchDir = hasSlash ? token.slice(0, lastSlash) : '.';
    const searchTerm = hasSlash ? token.slice(lastSlash + 1) : token;

    // 2. Resolver ruta absoluta del directorio a buscar
    const targetDirPath = searchDir === '.' ? cwd : searchDir;

    // Nota: usamos 'cwd' como contexto si 'searchDir' es relativo
    if (!this.fs.isDirectory(targetDirPath, cwd)) return [];

    let entries;
    try {
      entries = this.fs.readDir(targetDirPath, cwd);
    } catch (e) {
      return []; // Error de lectura
    }

    // 3. Filtrar y formatear
    return entries
      .filter(name => name.startsWith(searchTerm))
      .map(name => {
        // Usamos la primitiva #resolvePath del FS (asumiendo que es privada, 
        // si la hiciste pública úsala, si no, hay que calcular la ruta resuelta)
        const fullPath = `${targetDirPath}/${name}`;
        const isDir = this.fs.isDirectory(fullPath, cwd);

        // Retornamos la parte que completa al token original
        const prefix = hasSlash ? (token.slice(0, lastSlash + 1)) : '';
        return prefix + name + (isDir ? '/' : ' ');
      });
  }
}
