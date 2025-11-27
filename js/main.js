import { TTY } from './tty.js';
import { Shell } from './shell.js';
import { FileSystem } from './filesystem.js';
import { Formatter } from './formatter.js';

function initTerminal() {

  const terminalElement = document.getElementById('terminal');
  const outputElement = document.getElementById('output');
  const inputElement = document.getElementById('command-input');
  const promptPathElement = document.querySelector('#prompt .path');

  const tty = new TTY(
    terminalElement,
    outputElement,
    inputElement,
    promptPathElement
  );

  const filesystem = new FileSystem();

  const shell = new Shell(tty, filesystem);

  tty.onCommand((commandLine) => {
    shell.exec(commandLine);
  });

  // tty.onTabComplete((currentInput) => {
  //   return shell.getCompletions(currentInput);
  // });

  tty.printWelcome();

  window.terminal = {
    tty,
    shell,
    filesystem,
    formatter: Formatter
  };

  console.log('Terminal initialized successfully');
  console.log('Available modules:', { tty, shell, filesystem, formatter: Formatter });
}

window.addEventListener('DOMContentLoaded', initTerminal);
