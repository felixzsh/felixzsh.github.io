// command-parser.js
const DEFAULT_FD_STDERR = 2;
const DEFAULT_FD_STDOUT = 1;
const DEFAULT_FD_STDIN = 0;

/**
 * Class to split a complete command line into individual commands
 * based only on the pipe operator '|'.
 * NOTE: Redirection tokens (>, <, etc.) are left INSIDE
 * each command string for the second parsing phase.
 */
export class PipelineParser {
  /**
   * @param {string} input - The full command line (e.g: "ls -l | grep file > out.txt")
   * @returns {Array<string>} An array of individual command strings.
   */
  static parse(input) {
    // Split by the pipe operator, allowing optional whitespace around it.
    const commands = input.split(/\s*\|\s*/);

    // Trim whitespace and filter out empty strings
    return commands.map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  }
}

/**
 * Resolves the redirections of an individual command, applying logic
 * from left to right and handling explicit FDs and references (&).
 */
export class RedirectionResolver {

  /**
   * Parses the command string to separate the command arguments from its redirections.
   * @param {string} commandStr - Individual command with its redirections.
   * @returns {{name: string, args: string[], redirections: Array}} Object with the command name, clean arguments, and the list of redirections.
   */
  static #extractRedirections(commandStr) {
    // Regex to capture:
    // 1. Optional FD: (\d*)
    // 2. Operator: (>|>>|<|<>)
    // 3. Target (can be &FD or a path): (&?\S+)
    const REDIRECT_REGEX = /(\d*)(<>|>>|>|<)\s*(&?\S+)/g;

    const redirections = [];
    const cleanArgs = [];
    let lastIndex = 0;
    let match;

    // Iterate through the string searching for all redirections
    while ((match = REDIRECT_REGEX.exec(commandStr)) !== null) {



      const preMatchPart = commandStr.substring(lastIndex, match.index).trim();
      if (preMatchPart) {
        // Add arguments found before the redirection
        cleanArgs.push(...preMatchPart.split(/\s+/).filter(a => a.length > 0));
      }

      const fd = match[1] ? parseInt(match[1], 10) : (match[2] === '<' ? DEFAULT_FD_STDIN : DEFAULT_FD_STDOUT);
      const operator = match[2];
      const target = match[3];

      let type, mode = null;
      let targetPath = null;
      let targetFD = null;

      if (target.startsWith('&')) {
        type = 'redirectFD';
        targetFD = parseInt(target.substring(1), 10);
      } else {
        type = 'toFile';
        targetPath = target;
        if (operator === '>') mode = 'overwrite';
        else if (operator === '>>') mode = 'append';
        else if (operator === '<') mode = 'read';
        // else if (operator === '<>') mode = 'rw';
      }

      redirections.push({
        fd: fd,
        type: type,
        operator: operator,
        path: targetPath,
        mode: mode,
        targetFD: targetFD
      });

      lastIndex = match.index + match[0].length;
    }

    const remainingArgs = commandStr.substring(lastIndex).trim();
    if (remainingArgs) {
      cleanArgs.push(...remainingArgs.split(/\s+/).filter(a => a.length > 0));
    }

    const commandName = cleanArgs.shift();

    return {
      name: commandName,
      args: cleanArgs,
      redirections: redirections
    };
  }

  /**
   * Takes the redirections and applies left-to-right logic to determine
   * the final destinations for STDIN, STDOUT, and STDERR.
   * @param {string} commandStr - The command with its redirections.
   * @param {object} defaultStreams - The default streams (PipeIn, TTYOut, TTYError).
   * @param {object} fs - The file system interface.
   * @param {string} currentPath - The current working directory.
   * @returns {object} An object with { error, code, command } or { error, command, streams } updated with final destinations.
   */
  static resolve(commandStr, defaultStreams, fs, currentPath) {
    const { name, args, redirections } = RedirectionResolver.#extractRedirections(commandStr);

    // Initialize the FDs context with the input streams (pipe or TTY)
    const fdContext = {
      [DEFAULT_FD_STDIN]: defaultStreams.stdin,    // 0: Pipe or STDIN TTY
      [DEFAULT_FD_STDOUT]: defaultStreams.stdout,  // 1: Pipe or STDOUT TTY
      [DEFAULT_FD_STDERR]: defaultStreams.stderr   // 2: STDERR TTY
    };

    // 1. Iterate and apply redirections (LEFT TO RIGHT)
    for (const redir of redirections) {
      if (redir.type === 'toFile') {
        // Case > or < or >>: Open the file and ASSIGN that resource to the FD
        try {
          let fileContent = '';
          if (redir.mode === 'append') {
            // For >>, append to the file
            fdContext[redir.fd] = (data) => fs.writeFile(redir.path, data, currentPath, { append: true });
          } else if (redir.mode === 'overwrite') {
            // For >: Overwrite. The stream points to the direct writing function
            fdContext[redir.fd] = (data) => fs.writeFile(redir.path, data, currentPath);
          } else if (redir.mode === 'read') {
            // For <: The FD now points to the file content (Input source)
            fileContent = fs.readFile(redir.path, currentPath);
            fdContext[redir.fd] = fileContent; // STDIN is the file content
          }

        } catch (e) {
          // If the file cannot be opened/created, execution stops.
          defaultStreams.stderr(`bash: ${redir.path}: I/O error or permission denied.`);
          return { error: true, code: 1, command: { name, args } };
        }
      } else if (redir.type === 'redirectFD') {
        // Case 2>&1 or 1>&2: Redirection by reference

        // If the target FD has already been modified (e.g., FD 1 points to a file),
        // the source FD takes that same reference.
        if (fdContext[redir.targetFD]) {
          fdContext[redir.fd] = fdContext[redir.targetFD];
        } else {
          // If the target FD does not exist (e.g. 2>&9), return error.
          defaultStreams.stderr(`bash: ${redir.fd}>&${redir.targetFD}: Bad file descriptor`);
          return { error: true, code: 1, command: { name, args } };
        }
      }
    }

    // 2. Return the final streams and the command
    return {
      error: false,
      command: { name, args },
      streams: {
        // Ensure only the 3 standard streams are returned
        stdin: fdContext[DEFAULT_FD_STDIN],
        stdout: fdContext[DEFAULT_FD_STDOUT],
        stderr: fdContext[DEFAULT_FD_STDERR]
      }
    };
  }
}
