import { TTY } from './tty.js';
import { Shell } from './shell.js';
import { FileSystem } from './filesystem.js';
import { Formatter } from './formatter.js';

function initTerminal() {

  const tty = new TTY(
    document.getElementById('output'),
    document.getElementById('command-input'),
    document.querySelector('.path')
  );

  const filesystem = new FileSystem();

  const shell = new Shell(tty, filesystem);

  tty.onCommand((commandLine) => {
    shell.execute(commandLine);
  });

  tty.onTabComplete((currentInput) => {
    return shell.getCompletions(currentInput);
  });

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
