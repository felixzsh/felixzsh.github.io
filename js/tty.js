import { Formatter } from './formatter.js';

/**
 * Class managing the Terminal Teletype (TTY) interface.
 * Handles input/output, command history, tab completion, and terminal visibility control.
 */
export class TTY {
  /**
   * @param {HTMLElement} terminalElement - The main terminal container element (used for hiding/scrolling).
   * @param {HTMLElement} outputElement - The output area where text is printed.
   * @param {HTMLInputElement} inputElement - The command input field.
   * @param {HTMLElement} promptPathElement - The element displaying the current path in the prompt.
   */
  constructor(terminalElement, outputElement, inputElement, promptPathElement) {
    this.terminalElement = terminalElement;
    this.output = outputElement;
    this.input = inputElement;
    this.promptPath = promptPathElement;

    this.history = [];
    this.historyIndex = 0;
    this.inputLocked = false;
    this.isVisible = true;

    // Callbacks
    this.commandCallback = null;
    this.tabCompleteCallback = null;

    this.init();
  }

  // -------------------------------------------------------------------------
  //  INITIALIZATION AND INPUT HANDLING
  // -------------------------------------------------------------------------

  init() {
    // Handle keyboard input in the command line
    this.input.addEventListener('keydown', (e) => this.handleInput(e));

    // Focus the input when clicking anywhere on the document, unless locked or hidden
    document.addEventListener('click', (e) => {
      if (!this.inputLocked && this.isVisible) {
        this.input.focus();
      }
    });
  }

  /**
   * Processes keydown events for command execution and history navigation.
   * @param {KeyboardEvent} e 
   */
  handleInput(e) {
    if (this.inputLocked) return;

    if (e.key === 'Enter') {
      const commandLine = this.input.value.trim();
      if (commandLine) {
        this.history.push(commandLine);
        this.historyIndex = this.history.length;

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
   * Executes the tab completion callback and handles the result (complete or suggest).
   */
  handleTabCompletion() {
    if (!this.tabCompleteCallback) return;

    const currentInput = this.input.value;
    const result = this.tabCompleteCallback(currentInput);

    if (!result) return;

    if (result.type === 'complete') {
      this.input.value = result.value;
    } else if (result.type === 'suggestions') {
      this.printPromptLine(currentInput);
      this.print(result.suggestions.join('  '));
    }
  }

  // -------------------------------------------------------------------------
  //  VISIBILITY AND INPUT CONTROL (Core Abstraction)
  // -------------------------------------------------------------------------

  /**
   * Hides the terminal and locks the input.
   * Used by interactive programs like vim to take control of the screen.
   */
  hide() {
    if (!this.terminalElement || !this.isVisible) return;

    this.lockInput();

    this.isVisible = false;
    this.terminalElement.style.opacity = '0';
    console.log('TTY: Hiding terminal and locking input.');
  }

  /**
   * Shows the terminal and unlocks the input.
   * Used by interactive programs to return control to the main shell.
   */
  unhide() {
    if (!this.terminalElement || this.isVisible) return;

    this.isVisible = true;
    this.terminalElement.style.opacity = '1';

    this.unlockInput();
    console.log('TTY: Showing terminal and unlocking input.');
  }

  lockInput() {
    this.inputLocked = true;
    this.input.blur();
  }

  unlockInput() {
    this.inputLocked = false;
    this.input.focus();
    this.scrollToBottom();
  }

  // -------------------------------------------------------------------------
  //  OUTPUT AND UTILITY METHODS
  // -------------------------------------------------------------------------

  /**
   * Register callback for command execution.
   * @param {function} callback - Function to call when user presses Enter.
   */
  onCommand(callback) {
    this.commandCallback = callback;
  }

  /**
   * Register callback for tab completion.
   * @param {function} callback - Function to call for tab completion.
   */
  onTabComplete(callback) {
    this.tabCompleteCallback = callback;
  }

  /**
   * Print content to terminal output area.
   * @param {string} content - HTML content to print.
   */
  print(content) {
    const line = document.createElement('div');
    line.className = 'output-line';
    line.innerHTML = content;
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  /**
   * Prints a line showing the prompt and the command entered.
   * @param {string} command - Command text to show after prompt.
   */
  printPromptLine(command) {
    // Assumes an element with ID 'prompt' exists in the HTML for the prompt structure
    const promptHtml = document.getElementById('prompt').innerHTML;
    const line = document.createElement('div');
    line.className = 'command-line';
    line.innerHTML = `${promptHtml} ${command}`;
    this.output.appendChild(line);
    this.scrollToBottom();
  }


  /**
   * Update the prompt path display. Abbreviates /home/felixzsh to ~.
   * @param {string} path - Current path to display.
   */
  updatePrompt(path) {
    let displayPath = path;
    // Abbreviate home directory
    if (displayPath.startsWith('/home/felixzsh')) {
      displayPath = displayPath.replace('/home/felixzsh', '~');
    }
    if (displayPath === '') displayPath = '~';
    this.promptPath.textContent = displayPath;
  }

  scrollToBottom() {
    this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
  }

  clear() {
    this.output.innerHTML = '';
  }

  printWelcome() {
    const welcomeMsg = `
<pre class="whitespace-pre-wrap mb-4">
<span style="color: var(--blue)">
            ┌───────────────────────────────────────────┐
            │          F E L I X   S A N C H E Z        │
            │              P O R T F O L I O            │
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
   * Renders markdown content using the external Formatter utility.
   * @param {string} text - Markdown text.
   * @returns {string} HTML string.
   */
  renderMarkdown(text) {
    return Formatter.renderMarkdown(text);
  }
}
