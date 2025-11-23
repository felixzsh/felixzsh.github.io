import { Formatter } from './formatter.js';
import { AutocompletionHandler } from './autocompletion.js';
import { SimpleSyncStream } from './stream.js'; // Assuming you saved your class here
import { CommandParser } from './command-parser.js';

export class Shell {
  constructor(tty, filesystem) {
    this.tty = tty;
    this.fs = filesystem;

    this.env = {
      'HOME': '/home/felixzsh',
      'USER': 'felixzsh',
      'SHELL': '/bin/bash',
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

  // --- Environment Getters/Setters (Same) ---
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
  //                        PUBLIC EXECUTION API
  // ==========================================================================

  /**
   * 1. HANDLE USER INPUT: Entry point from TTY (Visual).
   * Prints what happens on screen.
   */
  handleUserInput(commandLine) {
    this.tty.printPromptLine(commandLine);
    if (!commandLine.trim()) return;

    // Execute the pipeline connecting the final output to the TTY print function
    this.#executePipeline(commandLine, {
      stdout: (data) => this.tty.print(data),
      stderr: (data) => this.tty.print(Formatter.error(data))
    });

    this.tty.scrollToBottom();
  }

  /**
   * 2. EXEC: Programmatic "Visual" Execution (For scripts that want to print).
   * Behaves the same as if the user typed it, but from code.
   */
  exec(commandLine) {
    // By default prints to TTY, unless otherwise specified in arguments
    // but here we assume the standard "exec" behavior = visible side effects.
    return this.#executePipeline(commandLine, {
      stdout: (data) => this.tty.print(data),
      stderr: (data) => this.tty.print(Formatter.error(data))
    });
  }

  /**
   * 3. RUN: Programmatic "Silent" Execution (For variables/capture).
   * Equivalent to $(cmd) in Bash. Returns the result string.
   */
  run(commandLine) {
    // Create a stream that accumulates in memory (without destination function)
    const captureStream = new SimpleSyncStream();

    const result = this.#executePipeline(commandLine, {
      stdout: captureStream,
      // stderr generally we want to see it if it fails, or you could capture it too
      stderr: (data) => console.error(`[Script Error] ${data}`)
    });

    // Return the object with the output read from the buffer
    return {
      output: captureStream.read(), // Read the accumulated data
      code: result.code
    };
  }


  // ==========================================================================
  //                        PIPELINE ORCHESTRATOR (PRIVATE)
  // ==========================================================================

  /**
   * The heart of the system. Parses '|', '>', '>>' and connects the streams.
   * @param {string} fullCommandLine - Complete line (e.g.: "ls | grep js > file.txt")
   * @param {object} finalDestinations - { stdout, stderr } Final destinations of the last command
   */
  #executePipeline(fullCommandLine, finalDestinations) {
    const commands = CommandParser.parse(fullCommandLine);

    // pipeData: Es la "pelota" que se pasan los comandos.
    // Al principio está vacía. Si hay un pipe, se llena con el resultado.
    let pipeData = '';
    let lastExitCode = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const isLast = i === commands.length - 1;

      // 1. PREPARAR ENTRADA (STDIN)
      // ---------------------------
      const stdinStream = new SimpleSyncStream();

      if (cmd.input) {
        // Caso: Redirección explícita "< archivo.txt" (Gana sobre el pipe)
        try {
          const fileContent = this.fs.readFile(cmd.input, this.currentPath);
          stdinStream.write(fileContent); // Llenamos el stream
        } catch (e) {
          finalDestinations.stderr(`bash: ${cmd.input}: No such file or directory`);
          return { code: 1 };
        }
      } else if (pipeData) {
        // Caso: Viene info del comando anterior (Pipe)
        stdinStream.write(pipeData);
      }

      // 2. PREPARAR SALIDA (STDOUT)
      // ---------------------------
      // Por defecto, escribimos a un buffer temporal para capturar la salida
      // y decidir luego si se la pasamos al siguiente comando o la imprimimos.
      const stdoutStream = new SimpleSyncStream();

      // El stderr va directo a pantalla siempre en esta versión simple
      const stderrStream = new SimpleSyncStream(finalDestinations.stderr);

      // 3. EJECUTAR COMANDO
      // -------------------
      // Reconstruimos "cmd args" para tu método executeSingleCommand
      const cmdStr = [cmd.args[0], ...cmd.args.slice(1)].join(' ');

      // Ejecutamos (pasándole nuestros streams preparados)
      const result = this.#executeSingleCommand(cmdStr, {
        stdin: stdinStream,
        stdout: stdoutStream,
        stderr: stderrStream
      }, cmd.args); // Pasamos args ya parseados para optimizar

      lastExitCode = result.code;

      // Si el comando falló, detenemos la cadena (comportamiento habitual &&, 
      // aunque en pipes bash suele seguir, para demo web mejor parar si hay error)
      if (lastExitCode !== 0) break;

      // 4. GESTIONAR RESULTADO (¿A dónde va lo que salió?)
      // --------------------------------------------------
      const outputCaptured = stdoutStream.read(); // Leemos lo que el comando escupió

      if (cmd.output) {
        // Caso A: Redirección a archivo (> ó >>)
        try {
          if (cmd.mode === 'append') {
            this.fs.appendFile(cmd.output, outputCaptured, this.currentPath);
          } else {
            this.fs.writeFile(cmd.output, outputCaptured, this.currentPath);
          }
          pipeData = ''; // Si va a archivo, no sigue por el pipe
        } catch (e) {
          finalDestinations.stderr(`Error writing to ${cmd.output}`);
        }
      }
      else if (!isLast) {
        // Caso B: Hay un pipe después (|)
        // Guardamos la salida para que sea la entrada del siguiente loop
        pipeData = outputCaptured;
      }
      else {
        // Caso C: Es el último comando y no hay archivo
        // Imprimimos en la pantalla real
        finalDestinations.stdout(outputCaptured);
      }
    }

    return { code: lastExitCode };
  }

  /**
   * Ejecuta un comando individual.
   * Modificado ligeramente para aceptar args pre-procesados.
   */
  #executeSingleCommand(commandStr, streams, parsedArgs) {
    const cmdName = parsedArgs[0];
    const rawArgs = parsedArgs.slice(1);

    // Parseo básico de banderas (flags)
    const options = {};
    const args = [];

    rawArgs.forEach(arg => {
      if (arg.startsWith('--')) options[arg.slice(2)] = true;
      else if (arg.startsWith('-')) arg.slice(1).split('').forEach(c => options[c] = true);
      else args.push(arg);
    });

    // Alias (Simplificado)
    if (this.aliases[cmdName]) {
      // Nota: Para una demo simple, a veces es mejor resolver el alias 
      // antes de entrar a esta función, pero esto funciona para alias simples.
      const aliasParts = this.aliases[cmdName].split(' ');
      // Recursividad simple: llamamos de nuevo con el string expandido
      // Cuidado con bucles infinitos en alias
      return this.#executeSingleCommand(
        this.aliases[cmdName] + ' ' + rawArgs.join(' '),
        streams,
        [...aliasParts, ...rawArgs]
      );
    }

    const cmdDef = this.loadCommand(cmdName);
    if (!cmdDef) {
      streams.stderr.write(`${cmdName}: command not found`);
      return { code: 127 };
    }

    const context = {
      shell: this,
      fs: this.fs,
      env: { ...this.env },
      cwd: this.currentPath,
      args: args,
      options: options,
      stdin: streams.stdin,   // El comando leerá de aquí con stdin.read()
      stdout: streams.stdout, // El comando escribirá aquí con stdout.write()
      stderr: streams.stderr
    };

    try {
      const exitCode = cmdDef.execute(args, context, options);
      return { code: exitCode === undefined ? 0 : exitCode };
    } catch (err) {
      streams.stderr.write(`Error: ${err.message}`);
      return { code: 1 };
    }
  }
  // --- Command Loading (Same) ---
  loadCommand(name) {
    const binPath = this.getEnv('PATH');
    const commandFilePath = `${binPath}/${name}.js`;

    if (!this.fs.isFile(commandFilePath)) return null;

    try {
      const content = this.fs.readFile(commandFilePath);
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







