/**
 * Main Entry Point - Terminal Portfolio
 * Orchestrates all modules: TTY, Shell, FileSystem, Formatter
 */

import { TTY } from './tty.js';
import { Shell } from './shell.js';
import { FileSystem } from './filesystem.js';
import { Formatter } from './formatter.js';

/**
 * Initialize the terminal application
 */
function initTerminal() {

  // Initialize TTY (terminal interface)
  const tty = new TTY(
    document.getElementById('output'),
    document.getElementById('command-input'),
    document.querySelector('.path')
  );

  const filesystem = new FileSystem();

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

  // Expose global API for debugging and console access
  window.terminal = {
    tty,
    shell,
    filesystem,
    formatter: Formatter
  };

  console.log('Terminal initialized successfully');
  console.log('Available modules:', { tty, shell, filesystem, formatter: Formatter });
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', initTerminal);
