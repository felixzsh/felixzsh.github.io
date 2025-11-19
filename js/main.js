class Terminal {
    constructor() {
        this.output = document.getElementById('output');
        this.input = document.getElementById('command-input');
        this.promptPath = document.querySelector('.path');
        this.editorContainer = document.getElementById('editor-container');
        this.currentPath = '/home/felixzsh';
        this.history = [];
        this.isEditorActive = false;
        this.currentFileNode = null;
        this.editorInstance = null;

        this.aliases = {
            'aboutme': 'whoami',
            'intro': 'whoami',
            'cls': 'clear'
        };

        this.init();
    }

    init() {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));
        document.addEventListener('click', () => {
            if (this.isVimActive) {
                this.input.focus();
            }
        });
        this.updatePrompt();
        this.printWelcome();
    }


    toggleEditor(activate, fileNode = null, absolutePath = null) {
        this.isEditorActive = activate;
        this.currentFileNode = fileNode;
        this.currentFilePath = absolutePath;

        if (activate) {
            this.editorContainer.style.display = 'block';
            document.getElementById('terminal').style.opacity = '0';
            this.input.blur();
        } else {

            if (this.editorInstance) {
                //TODO: check if codemirror has destruction methods
            }
            this.editorContainer.innerHTML = '';
            this.editorInstance = null;

            document.getElementById('terminal').style.opacity = '1';
            this.editorContainer.style.display = 'none';
            this.input.focus();
            this.scrollToBottom();
        }
    }

    updatePrompt() {
        // Display path relative to home if possible
        let displayPath = this.currentPath;
        if (displayPath.startsWith('/home/felixzsh')) {
            displayPath = displayPath.replace('/home/felixzsh', '~');
        }
        if (displayPath === '') displayPath = '~'; // Root of user home
        this.promptPath.textContent = displayPath;
    }

    printWelcome() {
        const welcomeMsg = `
<span style="color: var(--green)">Welcome to Felix's Terminal Portfolio v1.0.0</span>
Type <span class="md-code">help</span> to see available commands.
`;
        this.print(welcomeMsg);
    }

    handleInput(e) {
        if (e.key === 'Enter') {
            const commandLine = this.input.value.trim();
            if (commandLine) {
                this.history.push(commandLine);
                this.historyIndex = this.history.length;
                this.execute(commandLine);
            } else {
                this.printPromptLine('');
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.input.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabCompletion();
        }
    }

    handleTabCompletion() {
        const currentInput = this.input.value;
        const parts = currentInput.split(/\s+/); // Don't trim end to detect if we are starting a new arg
        const isNewArg = currentInput.endsWith(' ');

        // Case 1: Command Completion (First part)
        if (parts.length === 1 && !isNewArg) {
            const prefix = parts[0];
            const allCommands = this.getAvailableCommands();
            const matches = allCommands.filter(cmd => cmd.startsWith(prefix));

            if (matches.length === 0) return;

            if (matches.length === 1) {
                this.input.value = matches[0] + ' ';
            } else {
                this.printPromptLine(currentInput);
                this.print(matches.join('  '));
            }
            return;
        }

        // Case 2: File/Directory Completion (Arguments)
        // Determine the partial path being typed
        let partialPath = isNewArg ? '' : parts[parts.length - 1];
        const cmdName = parts[0];

        // We need to find the directory to look in and the prefix to match
        // Example: "cd projects/de" -> dir: "projects", prefix: "de"
        // Example: "cat " -> dir: ".", prefix: ""

        let dirPath = '.';
        let filePrefix = partialPath;

        if (partialPath.includes('/')) {
            const lastSlashIndex = partialPath.lastIndexOf('/');
            dirPath = partialPath.slice(0, lastSlashIndex) || '/'; // Handle root case
            filePrefix = partialPath.slice(lastSlashIndex + 1);
        }

        // Resolve the directory node
        const resolvedParts = resolvePath(this.currentPath, dirPath);
        const node = getNode(resolvedParts);

        if (!node || !node.children) return;

        const options = Object.keys(node.children);
        const matches = options.filter(name => name.startsWith(filePrefix));

        if (matches.length === 0) return;

        if (matches.length === 1) {
            const match = matches[0];
            const isDir = node.children[match].type === 'directory';

            // Construct the new path
            let newPathSegment = match + (isDir ? '/' : '');

            // Replace the partial path in the input with the completed one
            if (partialPath.includes('/')) {
                const lastSlashIndex = partialPath.lastIndexOf('/');
                const basePath = partialPath.slice(0, lastSlashIndex + 1);
                // Reconstruct input: everything before the last arg + base path + new segment
                // Actually simpler: replace the last part of the input array
                parts[parts.length - 1] = basePath + newPathSegment;
            } else {
                if (isNewArg) {
                    parts.push(newPathSegment);
                } else {
                    parts[parts.length - 1] = newPathSegment;
                }
            }

            // Join parts back carefully to preserve spaces? 
            // Simpler approach: take substring up to the partial path start
            const inputUpToPartial = currentInput.slice(0, currentInput.lastIndexOf(partialPath));
            this.input.value = inputUpToPartial + (partialPath.includes('/') ? partialPath.slice(0, partialPath.lastIndexOf('/') + 1) : '') + newPathSegment;

        } else {
            this.printPromptLine(currentInput);
            // Decorate directories with / for display
            const displayMatches = matches.map(name => {
                return node.children[name].type === 'directory' ? name + '/' : name;
            });
            this.print(displayMatches.join('  '));
        }
    }

    execute(commandLine) {
        this.printPromptLine(commandLine);

        const parts = commandLine.trim().split(/\s+/);
        let cmdName = parts[0];
        const rawArgs = parts.slice(1);

        // Parse flags and arguments
        const args = [];
        const options = {};

        rawArgs.forEach(arg => {
            if (arg.startsWith('--')) {
                // Long option (e.g. --help)
                const key = arg.slice(2);
                options[key] = true;
            } else if (arg.startsWith('-')) {
                // Short options (e.g. -la)
                const chars = arg.slice(1).split('');
                chars.forEach(c => options[c] = true);
            } else {
                args.push(arg);
            }
        });

        // Check aliases
        if (this.aliases[cmdName]) {
            const aliasExpansion = this.aliases[cmdName].split(' ');
            cmdName = aliasExpansion[0];
            // Prepend alias args to the parsed args
            // Note: This is a simple alias implementation. 
            // For complex alias + flags interaction, we might need re-parsing, 
            // but for now we just prepend the alias parts to args.
            const aliasArgs = aliasExpansion.slice(1);
            args.unshift(...aliasArgs);
        }

        const cmdDef = this.loadCommand(cmdName);

        if (cmdDef) {
            try {
                // Pass options as the third argument
                const result = cmdDef.execute(args, this, options);
                if (result) {
                    this.print(result);
                }
            } catch (err) {
                this.print(`<span style="color: var(--red)">Error executing command: ${err.message}</span>`);
            }
        } else {
            this.print(`<span style="color: var(--red)">${cmdName}: command not found</span>`);
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    getAvailableCommands() {
        const binPath = ['home', 'felixzsh', '.local', 'bin'];
        const binNode = getNode(binPath);
        if (!binNode || !binNode.children) return [];

        return Object.keys(binNode.children)
            .filter(f => f.endsWith('.js'))
            .map(f => f.replace('.js', ''));
    }

    loadCommand(name) {
        const binPath = ['home', 'felixzsh', '.local', 'bin'];
        const binNode = getNode(binPath);
        if (!binNode || !binNode.children) return null;

        const filename = name + '.js';
        if (binNode.children[filename]) {
            const content = binNode.children[filename].content;
            try {
                const cmdFactory = new Function('context', content);
                return cmdFactory({
                    term: this,
                    args: [],
                    options: {}
                });
            } catch (e) {
                console.error(`Error loading command ${name}:`, e);
                return null;
            }
        }
        return null;
    }

    printPromptLine(command) {
        const promptHtml = document.getElementById('prompt').innerHTML;
        const line = document.createElement('div');
        line.className = 'command-line';
        line.innerHTML = `${promptHtml} ${command}`;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    print(content) {
        const line = document.createElement('div');
        line.className = 'output-line';
        line.innerHTML = content;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    clear() {
        this.output.innerHTML = '';
    }

    scrollToBottom() {
        const terminal = document.getElementById('terminal');
        terminal.scrollTop = terminal.scrollHeight;
    }

    renderMarkdown(text) {
        // Simple Markdown Parser
        let html = text
            // Headers
            .replace(/^# (.*$)/gim, '<div class="md-h1">$1</div>')
            .replace(/^## (.*$)/gim, '<div class="md-h2">$1</div>')
            .replace(/^### (.*$)/gim, '<div class="md-h3">$1</div>')
            // Bold
            .replace(/\*\*(.*?)\*\*/gim, '<span class="md-strong">$1</span>')
            // Italic
            .replace(/\*(.*?)\*/gim, '<span class="md-em">$1</span>')
            // Code blocks
            .replace(/```([\s\S]*?)```/gim, '<code class="md-block-code">$1</code>')
            // Inline code
            .replace(/`([^`]+)`/gim, '<span class="md-code">$1</span>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="md-link">$1</a>')
            // Lists
            .replace(/^\- (.*$)/gim, '<div class="md-list-item">• $1</div>')
            // Newlines to breaks (for non-block elements)
            .replace(/\n/gim, '<br>');

        return html;
    }
}


window.addEventListener('DOMContentLoaded', () => {
    window.terminal = new Terminal();
});
