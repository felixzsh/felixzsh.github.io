import { Formatter } from './formatter.js';
import { AutocompletionHandler } from './autocompletion.js';
import { SimpleSyncStream } from './stream.js';
import { PipelineParser, RedirectionResolver } from './command-parser.js';

/**
 * Shell class to manage the command execution environment,
 * including environment variables, aliases, TTY interaction, and pipeline orchestration.
 */
export class Shell {
  /**
   * @param {object} tty - The TTY interface object (for I/O and prompt).
   * @param {object} filesystem - The file system interface object.
   */
  constructor(tty, filesystem) {
    this.tty = tty;
    this.fs = filesystem;

    this.env = {
      'HOME': '/home/felixzsh',
      'USER': 'felixzsh',
      'PWD': '/home/felixzsh',
      'PATH': '/home/felixzsh/.local/bin',
      'HOSTNAME': 'portfolio'
    };

    this.aliases = {
      'aboutme': 'whoami',
      'intro': 'whoami',
      'cls': 'clear',
      'll': 'ls -l'
    };

    this.autoCompleter = new AutocompletionHandler(
      this.fs,
      () => this.currentPath,
      () => this.getEnv('PATH')
    );

    this.tty.updatePrompt(this.env.PWD);
    this.tty.onTabComplete(this.getCompletionsCallback);
  }

  // --- Environment Getters/Setters ---
  get currentPath() { return this.env.PWD; }
  set currentPath(path) {
    this.env.PWD = path;
    this.tty.updatePrompt(path);
  }
  setEnv(key, value) { this.env[key] = value; }
  getEnv(key) { return this.env[key]; }
  setAlias(name, expansion) { this.aliases[name] = expansion; }
  resolveAlias(name) { return this.aliases[name] || null; }


  // ==========================================================================
  // PUBLIC EXECUTION API
  // ==========================================================================

  /**
   * EXEC: Programmatic "Visual" Execution (For scripts that want to print).
   * Behaves the same as if the user typed it, with visible side effects on the TTY.
   * @param {string} commandLine - The full command string.
   * @returns {{code: number}} The exit code of the last command in the pipeline.
   */
  exec(commandLine) {
    // Uses the TTY's print function for stdout, and formatted error for stderr.
    return this.#executePipeline(commandLine, {
      stdout: (data) => this.tty.print(data),
      stderr: (data) => this.tty.print(Formatter.error(data))
    });
  }

  /**
   * RUN: Programmatic "Silent" Execution (For variables/capture).
   * Equivalent to $(cmd) in Bash. Returns the result string.
   * @param {string} commandLine - The full command string.
   * @returns {{output: string, code: number}} The captured output and the exit code.
   */
  run(commandLine) {
    const captureStream = new SimpleSyncStream();
    const result = this.#executePipeline(commandLine, {
      stdout: captureStream.write.bind(captureStream), // Use the stream's write method
      stderr: (data) => console.error(`[Script Error] ${data}`)
    });

    return {
      output: captureStream.read(),
      code: result.code
    };
  }


  // ==========================================================================
  // PIPELINE ORCHESTRATOR (PRIVATE)
  // ==========================================================================

  /**
   * Orchestrates the execution of a command pipeline (commands separated by '|').
   * It manages command splitting, I/O redirection, and piping data between stages.
   * @param {string} fullCommandLine - The complete line of commands.
   * @param {object} finalDestinations - Functions for the final stdout and stderr.
   * @returns {{code: number}} The exit code of the last command executed.
   */
  #executePipeline(fullCommandLine, finalDestinations) {
    const commandStrings = PipelineParser.parse(fullCommandLine);

    let pipeData = ''; // Data flowing from the previous command's stdout to the next command's stdin
    let lastExitCode = 0;

    for (let i = 0; i < commandStrings.length; i++) {
      const cmdStr = commandStrings[i];
      const isLast = i === commandStrings.length - 1;

      // STDIN defaults to the data piped from the previous command, or an empty string.
      const defaultStdin = pipeData;

      // STDOUT defaults to a pipe stream if it's not the last command,
      // otherwise it defaults to the final destination (TTY or capture stream).
      const defaultStdout = isLast ? finalDestinations.stdout : new SimpleSyncStream();

      // STDERR always defaults to the final destination (TTY or console.error).
      const defaultStderr = finalDestinations.stderr;

      // 1. Resolve redirections for the current command
      const resolved = RedirectionResolver.resolve(
        cmdStr,
        { stdin: defaultStdin, stdout: defaultStdout, stderr: defaultStderr },
        this.fs,
        this.currentPath
      );

      if (resolved.error) {
        return { code: resolved.code };
      }

      const { command, streams } = resolved;

      // Prepare STDIN stream (used by the command implementation)
      const stdinContent = streams.stdin;
      const stdinStream = new SimpleSyncStream();
      if (stdinContent) {
        stdinStream.write(stdinContent);
      } else {
        // No stdin provided - provide informative message about TTY stdin limitations
        stdinStream.write(
          "Interactive TTY stdin is not supported in this browser-based terminal.\n" +
          "I just want to keep all $PATH scripts simple and dont be async. \n"
        );
      }

      // Stream to capture all STDOUT data from the current command
      const captureStream = new SimpleSyncStream();

      // Wrapper function for STDOUT: captures data for piping/final output AND writes to the final resolved stream (file/FD)
      const finalStdoutWriter = (data) => {
        captureStream.write(data); // Capture for pipe/final output
        if (typeof streams.stdout === 'function') {
          streams.stdout(data); // Write to the resolved destination (e.g., file or TTY for the last command)
        }
      };

      // Wrapper function for STDERR: writes to the final resolved stream (file/FD)
      const finalStderrWriter = (data) => {
        if (typeof streams.stderr === 'function') {
          streams.stderr(data);
        } else {
          // If stderr was redirected to a stream object (e.g., SimpleSyncStream for a file)
          streams.stderr.write(data);
        }
      };

      // 2. Execute the single command
      const result = this.#executeSingleCommand(command.name, {
        stdin: stdinStream,
        stdout: { write: finalStdoutWriter },
        stderr: { write: finalStderrWriter }
      }, [command.name, ...command.args]);

      lastExitCode = result.code;
      if (lastExitCode !== 0) break; // Stop pipeline execution on error

      // 3. Prepare data for the next command (piping)
      if (typeof streams.stdout !== 'function') {
        const outputCaptured = captureStream.read();
        if (!isLast) {
          pipeData = outputCaptured;
        } else {
          // If the last command's STDOUT was redirected to an internal stream (e.g., SimpleSyncStream
          // due to a file redirection), we need to manually write its content to the final destination (TTY/capture).
          finalDestinations.stdout(outputCaptured);
        }
      }
    }

    return { code: lastExitCode };
  }

  /**
   * Executes a single command, handling argument parsing, alias resolution,
   * command loading, and execution within the defined context.
   * @param {string} commandStr - The raw command string (used mainly for alias expansion).
   * @param {object} streams - The resolved input/output streams for this command.
   * @param {Array<string>} parsedArgs - The command name and arguments list.
   * @returns {{code: number}} The command's exit code.
   */
  #executeSingleCommand(commandStr, streams, parsedArgs) {
    const cmdName = parsedArgs[0];
    const rawArgs = parsedArgs.slice(1);

    // Basic flag parsing
    const options = {};
    const args = [];

    rawArgs.forEach(arg => {
      if (arg.startsWith('--')) options[arg.slice(2)] = true;
      else if (arg.startsWith('-')) arg.slice(1).split('').forEach(c => options[c] = true);
      else args.push(arg);
    });

    // Alias resolution (Simple recursion)
    if (this.aliases[cmdName]) {
      const aliasParts = this.aliases[cmdName].split(' ');
      // Simple recursion: call again with the expanded string
      return this.#executeSingleCommand(
        this.aliases[cmdName] + ' ' + rawArgs.join(' '),
        streams,
        [...aliasParts, ...rawArgs]
      );
    }

    // Load command definition
    const cmdDef = this.loadCommand(cmdName);
    if (!cmdDef) {
      streams.stderr.write(`${cmdName}: command not found`);
      return { code: 127 };
    }

    // Build the execution context for the command
    const context = {
      shell: this,
      fs: this.fs,
      env: { ...this.env },
      cwd: this.currentPath,
      args: args,
      options: options,
      stdin: streams.stdin,  // Command will read from here using stdin.read()
      stdout: streams.stdout, // Command will write here using stdout.write()
      stderr: streams.stderr
    };

    // Execute command and handle errors
    try {
      const exitCode = cmdDef.execute(context);
      return { code: exitCode === undefined ? 0 : exitCode };
    } catch (err) {
      streams.stderr.write(`Error: ${err.message}`);
      return { code: 1 };
    }
  }

  /**
   * Loads the command definition from the file system by checking the PATH environment variable.
   * It uses `this.fs.stat` to verify the file exists and is a file.
   * @param {string} name - The name of the command to load.
   * @returns {object|null} The command definition object with an `execute` method, or null if not found/loaded.
   */
  loadCommand(name) {
    const binPath = this.getEnv('PATH');
    // Assuming binPath is an absolute path, so the final path is also absolute.
    const commandFilePath = `${binPath}/${name}.js`;


    console.log(`command file path ${commandFilePath}`);

    // 1. Check if the file exists and is a file (using stat)
    try {
      // Use '/' as CWD for absolute paths
      const stats = this.fs.stat(commandFilePath, '/');
      if (stats.type !== 'file') {
        return null;
      }
    } catch (e) {
      console.log(`file doesn't exist: ${e}`);
      // File does not exist or path is invalid
      return null;
    }

    // 2. Read the file content and execute the code
    try {
      // Read content, using '/' as CWD for the absolute path
      const content = this.fs.readFile(commandFilePath, '/');

      // Execute the command code to get the command object
      // The content is expected to be a function that returns the command definition object.
      const cmdFactory = new Function('context', content);
      return cmdFactory({});
    } catch (e) {
      console.error(`Error loading command ${name}:`, e);
      return null;
    }
  }
  // Autocompletion (Callback)
  getCompletionsCallback = (input) => this.autoCompleter.handleCompletion(input);
}
