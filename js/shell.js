import { Formatter } from './formatter.js';

/**
 * Shell - Command execution engine with environment management
 */
export class Shell {
    constructor(tty, filesystem) {
        this.tty = tty;
        this.fs = filesystem;

        // Environment variables
        this.env = {
            'HOME': '/home/felixzsh',
            'USER': 'felixzsh',
            'SHELL': '/bin/bash',
            'PWD': '/home/felixzsh',
            'PATH': '/home/felixzsh/.local/bin',
            'HOSTNAME': 'portfolio'
        };

        // Aliases
        this.aliases = {
            'aboutme': 'whoami',
            'intro': 'whoami',
            'cls': 'clear'
        };

        // Update prompt with initial path
        this.tty.updatePrompt(this.env.PWD);
    }

    /**
     * Get current working directory
     */
    get currentPath() {
        return this.env.PWD;
    }

    /**
     * Set current working directory
     */
    set currentPath(path) {
        this.env.PWD = path;
        this.tty.updatePrompt(path);
    }

    /**
     * Set environment variable
     * @param {string} key - Variable name
     * @param {string} value - Variable value
     */
    setEnv(key, value) {
        this.env[key] = value;
    }

    /**
     * Get environment variable
     * @param {string} key - Variable name
     * @returns {string|undefined} Variable value
     */
    getEnv(key) {
        return this.env[key];
    }

    /**
     * Set alias
     * @param {string} name - Alias name
     * @param {string} expansion - Command expansion
     */
    setAlias(name, expansion) {
        this.aliases[name] = expansion;
    }

    /**
     * Resolve alias
     * @param {string} name - Alias name
     * @returns {string|null} Expanded command or null
     */
    resolveAlias(name) {
        return this.aliases[name] || null;
    }

    /**
     * Execute a command line
     * @param {string} commandLine - Full command line to execute
     */
    execute(commandLine) {
        this.tty.printPromptLine(commandLine);

        const parts = commandLine.trim().split(/\s+/);
        let cmdName = parts[0];
        const rawArgs = parts.slice(1);

        // Parse arguments and options
        const args = [];
        const options = {};

        rawArgs.forEach(arg => {
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                options[key] = true;
            } else if (arg.startsWith('-')) {
                const chars = arg.slice(1).split('');
                chars.forEach(c => options[c] = true);
            } else {
                args.push(arg);
            }
        });

        // Resolve aliases
        if (this.aliases[cmdName]) {
            const aliasExpansion = this.aliases[cmdName].split(' ');
            cmdName = aliasExpansion[0];
            const aliasArgs = aliasExpansion.slice(1);
            args.unshift(...aliasArgs);
        }

        // Load and execute command
        const cmdDef = this.loadCommand(cmdName);

        if (cmdDef) {
            try {
                // Create context for command
                const context = this.createContext(args, options);

                // Execute command with new context signature
                const result = cmdDef.execute(args, context, options);

                if (result) {
                    this.tty.print(result);
                }
            } catch (err) {
                this.tty.print(Formatter.error(`Error executing command: ${err.message}`));
                console.error('Command execution error:', err);
            }
        } else {
            this.tty.print(Formatter.error(`${cmdName}: command not found`));
        }

        this.tty.scrollToBottom();
    }

    /**
     * Load a command from the filesystem
     * @param {string} name - Command name
     * @returns {object|null} Command definition or null
     */
    loadCommand(name) {
        const binPath = ['home', 'felixzsh', '.local', 'bin'];
        const binNode = this.fs.getNode(binPath);

        if (!binNode || !binNode.children) return null;

        const filename = name + '.js';
        if (binNode.children[filename]) {
            const content = binNode.children[filename].content;
            try {
                // Create command factory function
                // The factory doesn't need context, it just returns the command definition
                const cmdFactory = new Function('context', content);

                // Execute factory to get command definition
                // Pass empty object as context parameter (not used by commands)
                return cmdFactory({});
            } catch (e) {
                console.error(`Error loading command ${name}:`, e);
                return null;
            }
        }

        return null;
    }

    /**
     * Create execution context for commands
     * @param {string[]} args - Parsed arguments
     * @param {object} options - Parsed options
     * @returns {object} Context object
     */
    createContext(args, options) {
        return {
            // Core context properties
            shell: this,
            fs: this.fs,
            env: { ...this.env },
            cwd: this.currentPath,
            args: args,
            options: options,
            rawArgs: [...args],

            // Streams
            stdin: null,
            stdout: (data) => this.tty.print(data),
            stderr: (data) => this.tty.print(Formatter.error(data))
        };
    }

    /**
     * Get available commands from filesystem
     * @returns {string[]} Array of command names
     */
    getAvailableCommands() {
        const binPath = ['home', 'felixzsh', '.local', 'bin'];
        const binNode = this.fs.getNode(binPath);

        if (!binNode || !binNode.children) return [];

        return Object.keys(binNode.children)
            .filter(f => f.endsWith('.js'))
            .map(f => f.replace('.js', ''));
    }

    /**
     * Get tab completion suggestions
     * @param {string} currentInput - Current input string
     * @returns {object|null} Completion result
     */
    getCompletions(currentInput) {
        const parts = currentInput.split(/\s+/);
        const isNewArg = currentInput.endsWith(' ');

        // Case 1: Command Completion (First part)
        if (parts.length === 1 && !isNewArg) {
            const prefix = parts[0];
            const allCommands = this.getAvailableCommands();
            const matches = allCommands.filter(cmd => cmd.startsWith(prefix));

            if (matches.length === 0) return null;

            if (matches.length === 1) {
                return { type: 'complete', value: matches[0] + ' ' };
            } else {
                return { type: 'suggestions', suggestions: matches };
            }
        }

        // Case 2: File/Directory Completion (Arguments)
        let partialPath = isNewArg ? '' : parts[parts.length - 1];

        let dirPath = '.';
        let filePrefix = partialPath;

        if (partialPath.includes('/')) {
            const lastSlashIndex = partialPath.lastIndexOf('/');
            dirPath = partialPath.slice(0, lastSlashIndex) || '/';
            filePrefix = partialPath.slice(lastSlashIndex + 1);
        }

        // Resolve the directory node
        const resolvedParts = this.fs.resolvePath(this.currentPath, dirPath);
        const node = this.fs.getNode(resolvedParts);

        if (!node || !node.children) return null;

        const options = Object.keys(node.children);
        const matches = options.filter(name => name.startsWith(filePrefix));

        if (matches.length === 0) return null;

        if (matches.length === 1) {
            const match = matches[0];
            const isDir = node.children[match].type === 'directory';

            let newPathSegment = match + (isDir ? '/' : '');

            let newValue;
            if (partialPath.includes('/')) {
                const lastSlashIndex = partialPath.lastIndexOf('/');
                const basePath = partialPath.slice(0, lastSlashIndex + 1);
                const newPartial = basePath + newPathSegment;

                // Reconstruct full input
                const inputUpToPartial = currentInput.slice(0, currentInput.lastIndexOf(partialPath));
                newValue = inputUpToPartial + newPartial;
            } else {
                // Replace last part
                parts[parts.length - 1] = newPathSegment;
                newValue = parts.join(' ');
            }

            return { type: 'complete', value: newValue };
        } else {
            const displayMatches = matches.map(name => {
                return node.children[name].type === 'directory' ? name + '/' : name;
            });
            return { type: 'suggestions', suggestions: displayMatches };
        }
    }
}
