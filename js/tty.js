import { Formatter } from './formatter.js';

/**
 * TTY - Terminal interface handling all input/output operations
 */
export class TTY {
    constructor(outputElement, inputElement, promptPathElement) {
        this.output = outputElement;
        this.input = inputElement;
        this.promptPath = promptPathElement;

        this.history = [];
        this.historyIndex = 0;
        this.inputLocked = false;

        // Callbacks
        this.commandCallback = null;
        this.tabCompleteCallback = null;

        this.init();
    }

    /**
     * Initialize event listeners
     */
    init() {
        this.input.addEventListener('keydown', (e) => this.handleInput(e));

        // Keep focus on input unless locked
        document.addEventListener('click', (e) => {
            if (!this.inputLocked) {
                this.input.focus();
            } else {
                console.log('Click ignored because input is locked');
            }
        });
    }

    /**
     * Handle keyboard input
     */
    handleInput(e) {
        if (this.inputLocked) return;

        if (e.key === 'Enter') {
            const commandLine = this.input.value.trim();
            if (commandLine) {
                this.history.push(commandLine);
                this.historyIndex = this.history.length;

                // Call command callback
                if (this.commandCallback) {
                    this.commandCallback(commandLine);
                }
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

    /**
     * Handle tab completion
     */
    handleTabCompletion() {
        if (!this.tabCompleteCallback) return;

        const currentInput = this.input.value;
        const result = this.tabCompleteCallback(currentInput);

        if (!result) return;

        if (result.type === 'complete') {
            // Single match - complete it
            this.input.value = result.value;
        } else if (result.type === 'suggestions') {
            // Multiple matches - show suggestions
            this.printPromptLine(currentInput);
            this.print(result.suggestions.join('  '));
        }
    }

    /**
     * Register callback for command execution
     * @param {function} callback - Function to call when user presses Enter
     */
    onCommand(callback) {
        this.commandCallback = callback;
    }

    /**
     * Register callback for tab completion
     * @param {function} callback - Function to call for tab completion
     */
    onTabComplete(callback) {
        this.tabCompleteCallback = callback;
    }

    /**
     * Print content to terminal
     * @param {string} content - HTML content to print
     */
    print(content) {
        const line = document.createElement('div');
        line.className = 'output-line';
        line.innerHTML = content;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    /**
     * Print a line with the prompt
     * @param {string} command - Command text to show after prompt
     */
    printPromptLine(command) {
        const promptHtml = document.getElementById('prompt').innerHTML;
        const line = document.createElement('div');
        line.className = 'command-line';
        line.innerHTML = `${promptHtml} ${command}`;
        this.output.appendChild(line);
        this.scrollToBottom();
    }

    /**
     * Clear the terminal screen
     */
    clear() {
        this.output.innerHTML = '';
    }

    /**
     * Update the prompt path display
     * @param {string} path - Current path to display
     */
    updatePrompt(path) {
        let displayPath = path;
        if (displayPath.startsWith('/home/felixzsh')) {
            displayPath = displayPath.replace('/home/felixzsh', '~');
        }
        if (displayPath === '') displayPath = '~';
        this.promptPath.textContent = displayPath;
    }

    /**
     * Lock input (for applications like vim)
     */
    lockInput() {
        console.log('Locking input');
        this.inputLocked = true;
        this.input.blur();
    }

    /**
     * Unlock input
     */
    unlockInput() {
        console.log('Unlocking input');
        this.inputLocked = false;
        this.input.focus();
        this.scrollToBottom();
    }

    /**
     * Scroll terminal to bottom
     */
    scrollToBottom() {
        const terminal = document.getElementById('terminal');
        terminal.scrollTop = terminal.scrollHeight;
    }

    /**
     * Print welcome message
     */
    printWelcome() {
        const welcomeMsg = `
<pre class="whitespace-pre-wrap mb-4">
<span style="color: var(--blue)">
            ┌───────────────────────────────────────────┐
            │          F E L I X   S A N C H E Z        │
            │              P O R T F O L I O            │
            └───────────────────────────────────────────┘
</span>
            <span style="color: var(--green)">Type <span class="md-code">help</span> to see available commands.</span>
            <span style="color: var(--green)">Press <span class="md-code">Ctrl+Shift+R</span> to reset the virtual filesystem.</span>
            <span style="color: var(--blue)">───────────────────────────────────────────</span>
</pre>
`;
        this.print(welcomeMsg);
    }

    /**
     * Render markdown content
     * @param {string} text - Markdown text
     * @returns {string} HTML string
     */
    renderMarkdown(text) {
        return Formatter.renderMarkdown(text);
    }
}
