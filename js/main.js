/**
 * Main Entry Point - Terminal Portfolio
 * Orchestrates all modules: TTY, Shell, FileSystem, Formatter
 */

import { TTY } from './tty.js';
import { Shell } from './shell.js';
import { FileSystem, initGlobalFileSystem } from './filesystem.js';
import { Formatter } from './formatter.js';

/**
 * Initialize the terminal application
 */
function initTerminal() {
  // Initialize filesystem (also sets up global compatibility layer)
  const filesystem = initGlobalFileSystem();

  // Initialize TTY (terminal interface)
  const tty = new TTY(
    document.getElementById('output'),
    document.getElementById('command-input'),
    document.querySelector('.path')
  );

  // Initialize Shell (command execution engine)
  const shell = new Shell(tty, filesystem);

  // Connect TTY events to Shell
  tty.onCommand((commandLine) => {
    shell.execute(commandLine);
  });

  tty.onTabComplete((currentInput) => {
    return shell.getCompletions(currentInput);
  });

  // Print welcome message
  tty.printWelcome();

  // Expose global API for legacy commands and debugging
  window.terminal = {
    tty,
    shell,
    filesystem,
    formatter: Formatter,

    // Legacy compatibility interface
    get currentPath() {
      return shell.currentPath;
    },
    set currentPath(path) {
      shell.currentPath = path;
    },

    lockInput: () => tty.lockInput(),
    unlockInput: () => tty.unlockInput(),
    print: (content) => tty.print(content),
    clear: () => tty.clear(),
    updatePrompt: () => tty.updatePrompt(shell.currentPath),
    renderMarkdown: (text) => tty.renderMarkdown(text)
  };

  console.log('Terminal initialized successfully');
  console.log('Available modules:', { tty, shell, filesystem, formatter: Formatter });
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', initTerminal);
