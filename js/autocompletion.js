/**
 * Specialized module for command and path autocompletion logic.
 */
export class AutocompletionHandler {

  /**
   * @param {FileSystem} fs - Instance of the file system interface.
   * @param {function(): string} getCurrentPath - Function to get the current working directory.
   * @param {function(): string} getBinPath - Function to get the path where executables (commands) are located (like $PATH).
   */
  constructor(fs, getCurrentPath, getBinPath) {
    this.fs = fs;
    this.getCurrentPath = getCurrentPath;
    this.getBinPath = getBinPath;
  }

  /**
   * Main entry point for TTY autocompletion.
   * @param {string} currentInput - The current input string entered by the user.
   * @returns {object|null} The autocompletion result:
   * - `{ type: 'complete', value: string }` for a direct single match.
   * - `{ type: 'suggestions', suggestions: string[] }` for multiple matches.
   * - `null` if no matches are found.
   */
  handleCompletion(currentInput) {
    const { isCommand, token, prefix } = this.#parseCompletionContext(currentInput);

    // Determine if we're completing a command name or a file/directory path
    const candidates = isCommand
      ? this.#getCommandCandidates(token)
      : this.#getPathCandidates(token);

    if (candidates.length === 0) return null;

    if (candidates.length === 1) {
      // Autocomplete: Use the original prefix + the candidate's completion
      return { type: 'complete', value: prefix + candidates[0] };
    } else {
      // Suggestions: Show only the final name, removing the path prefix for cleaner display
      const suggestions = candidates.map(c => c.split('/').pop());
      return { type: 'suggestions', suggestions: suggestions };
    }
  }

  // --------------------------------------------------------------------------
  //                             PRIVATE METHODS (Core Logic)
  // --------------------------------------------------------------------------

  /**
   * Analyzes the input string to determine the context of autocompletion.
   * @param {string} input - The full current input string.
   * @returns {{isCommand: boolean, token: string, prefix: string}} Completion context.
   */
  #parseCompletionContext(input) {
    const parts = input.split(/\s+/);
    const isNewArg = input.endsWith(' ');

    // Completion context:
    // 1. Is it the very first token AND not followed by a space? -> Command completion
    const isCommand = parts.length === 1 && !isNewArg;
    // 2. The token to be completed (empty string if input ends with a space)
    const token = isNewArg ? '' : parts[parts.length - 1];
    // 3. The input part before the token (used to reconstruct the full completed line)
    const prefix = input.substring(0, input.length - token.length);

    return { isCommand, token, prefix };
  }

  /**
   * Finds matching command candidates based on the token prefix.
   * Commands are files ending in '.js' in the bin directory.
   * @param {string} token - The prefix to match against command names.
   * @returns {string[]} An array of potential command completions.
   */
  #getCommandCandidates(token) {
    const binPath = this.getBinPath();
    try {
      // Ensure the bin path exists and is a directory
      const stats = this.fs.stat(binPath, '/');
      if (stats.type !== 'directory') return [];
    } catch (e) {
      return [];
    }

    const files = this.fs.readDir(binPath) || [];

    return files
      .filter(f => f.endsWith('.js') && f.startsWith(token))
      // Replace '.js' with a space ' ' to separate the command name from the next argument
      .map(f => f.replace('.js', ' '));
  }

  /**
   * Finds matching file/directory path candidates based on the token.
   * Handles relative, absolute, and path segments within the token.
   * @param {string} token - The path segment (or full path) to match.
   * @returns {string[]} An array of potential path completions.
   */
  #getPathCandidates(token) {
    const cwd = this.getCurrentPath();

    // 1. Separate base directory and search term
    const lastSlash = token.lastIndexOf('/');
    const hasSlash = lastSlash !== -1;

    // Determine the directory to search in (if no slash, search in '.')
    const searchDir = hasSlash ? token.slice(0, lastSlash) : '.';
    // Determine the name prefix to match against entries
    const searchTerm = hasSlash ? token.slice(lastSlash + 1) : token;

    // 2. Resolve the absolute path of the directory to search
    // If searchDir is '.', targetDirPath is the current working directory (cwd)
    const targetDirPath = searchDir === '.' ? cwd : searchDir;

    let targetDirStats;
    try {
      // Check if the target path is a valid directory
      targetDirStats = this.fs.stat(targetDirPath, cwd);
      if (targetDirStats.type !== 'directory') return [];
    } catch (e) {
      return []; // Directory does not exist
    }

    let entries;
    try {
      entries = this.fs.readDir(targetDirPath, cwd);
    } catch (e) {
      return []; // Read error
    }

    // 3. Filter and format candidates
    return entries
      .filter(name => name.startsWith(searchTerm))
      .map(name => {
        // Path prefix to prepend to the entry name (e.g., 'path/to/')
        const prefix = hasSlash ? (token.slice(0, lastSlash + 1)) : '';

        // Get the full path for the current entry to check its type
        const fullPath = this.fs.resolvePath(`${targetDirPath}/${name}`, cwd).join('/');

        let isDir = false;
        try {
          // Check if the entry is a directory
          isDir = this.fs.stat(fullPath, '/').type === 'directory';
        } catch (e) {
          // If stat fails, assume it's not a directory
        }

        // Return the completion string: prefix + name + suffix ('/' for dir, ' ' for file)
        return prefix + name + (isDir ? '/' : ' ');
      });
  }
}
