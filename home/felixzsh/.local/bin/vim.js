/**
 * Command: vim
 * Description: Basic text editor integrated using CodeMirror with Vim Keymap.
 * It leverages the FileSystem's powerful readFile/writeFile methods for I/O.
 */
return {
  description: "Evolution of the Unix vi editor (CodeMirror integration)",
  execute: (context) => {
    const { args, options, fs, cwd, shell, stdout, stderr } = context;

    // --- VIM Session State ---
    const rawPath = args[0];
    let initialContent = "";
    let hasBeenWritten = false; // Tracks if ':w' has been executed at least once

    if (args.length === 0 || options.help) {
      stdout.write("Usage: vim &lt;file_name&gt;\n\nEdits a file in the virtual filesystem.\n");
      return 0;
    }

    try {
      initialContent = fs.readFile(rawPath, cwd);
    } catch (e) {

      if (e.message.includes('Is a directory')) {
        stderr.write(`vim: '${rawPath}': Is a directory\n`);
        return 1;
      }

      // If the error is 'No such file or directory', we assume it's a new file.
      initialContent = "";
      // NOTE: We rely on fs.writeFile to throw an error later if the PARENT directory is missing.
    }


    shell.tty.hide()

    const editorContainer = document.getElementById('editor-container');
    editorContainer.style.display = 'block';
    editorContainer.innerHTML = '';

    const editor = CodeMirror(editorContainer, {
      value: initialContent,
      mode: "markdown",
      theme: "dracula",
      keyMap: "vim",
      lineNumbers: true,
      autofocus: true,
      // Pass the shell's tty element ID for potential integration or visual fixes
      extraKeys: {
        ':': CodeMirror.Vim.startEx
      }
    });

    // CRITICAL: Logic to force editor focus back on ESC key (required for Vim keymap to work properly)
    editor.on('keydown', (cm, e) => {
      if (e.keyCode === 27) { // ESC key
        setTimeout(() => {
          if (!cm.hasFocus()) {
            cm.focus();
          }
        }, 0);
      }
    });

    // Track if any change has occurred since the file was opened or last written.
    editor.changeHandled = false;
    editor.on('change', () => { editor.changeHandled = true; });



    /**
     * @param {boolean} shouldSave - Force close even if changes are unsaved (for :q!).
     * @returns {number|boolean} Exit code 0 or false if closing is prevented.
     */
    const closeEditor = (shouldSave = false) => {
      // Prevent closing if changes are unsaved and force flag is not set
      if (!shouldSave && editor.changeHandled && !hasBeenWritten) {
        editor.openNotification(`<span style="color: var(--yellow)">No write since last change (add ! to override)</span>`, { duration: 3000 });
        return false;
      }

      // Restore terminal state
      editorContainer.innerHTML = '';
      editorContainer.style.display = 'none';

      shell.tty.unhide();
      return 0;
    };


    /**
     * Handles the logic for the Vim ':w' command.
     * This is where the actual FS write operation takes place.
     */
    const commandWrite = () => {
      const newContent = editor.getValue();

      try {
        // *** THE CORE OPERATION ***
        // fs.writeFile handles path resolution, parent directory validation, 
        // file creation (if new) or overwriting (if existing).
        fs.writeFile(rawPath, newContent, cwd);

        // Success: Reset state flags
        editor.changeHandled = false;
        hasBeenWritten = true;

        editor.openNotification(`<span style="color: var(--green)">"${rawPath}" written</span>`, { duration: 1000 });

      } catch (e) {
        // Error: This captures errors like "Parent directory not found" 
        // or trying to write to an existing directory.
        editor.openNotification(`<span style="color: var(--red)">Error: ${e.message}</span>`, { duration: 5000 });
        stderr.write(`vim: Error writing file: ${e.message}\n`);
      }
    };


    CodeMirror.Vim.defineEx("write", "w", commandWrite);

    CodeMirror.Vim.defineEx("quit", "q", function(cm, params) {
      const force = params.argString === '!';

      if (force) {
        // :q! (Force quit)
        closeEditor(true);
      } else if (editor.changeHandled && !hasBeenWritten) {
        // :q (Prevent quit if modified and not written)
        closeEditor(false);
      } else {
        // :q (Safe quit)
        closeEditor(true);
      }
    });

    CodeMirror.Vim.defineEx("wq", "wq", function(cm) {
      commandWrite();
      // Use setTimeout to ensure the notification can display briefly before quitting
      setTimeout(() => {
        // Re-call the quit handler after writing
        CodeMirror.Vim.handleEx(cm, 'q');
      }, 150);
    });

    return 0;
  }
};
