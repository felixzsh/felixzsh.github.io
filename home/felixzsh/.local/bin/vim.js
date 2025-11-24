return {
  description: "Evolution of the Unix vi editor (CodeMirror integration)",

  execute: (args, context, options) => {
    const { fs, cwd, shell, stdout, stderr } = context;

    // --- VIM Session State ---
    const rawPath = args[0];
    let initialContent = "";
    let isNewFile = false;
    let hasBeenWritten = false;

    if (args.length === 0 || options.help) {
      stdout.write("Usage: vim <file_name>\n\nEdits a file in the virtual filesystem.\n");
      return 0;
    }

    try {
      initialContent = fs.readFile(rawPath, cwd);
    } catch (e) {

      if (fs.isDirectory(rawPath, cwd)) {
        stderr.write(`vim: '${rawPath}': Is a directory\n`);
        return 1;
      }

      try {
        // This call internally handles '..', '.', and CWD resolution.
        const parentDir = fs.getParentDirPath(rawPath, cwd);

        // Check: Only abort if the parent directory does NOT exist or is NOT a directory.
        if (parentDir !== '/' && !fs.isDirectory(parentDir, '/')) {
          stderr.write(`vim: '${rawPath}': No such file or directory\n`);
          return 1;
        }

        initialContent = "";
        isNewFile = true;

      } catch (pathResolutionError) {
        // Catches errors like trying to get the parent of the root, though getParentDirPath 
        // should typically handle it gracefully (returning '/').
        stderr.write(`vim: '${rawPath}': No such file or directory\n`);
        return 1;
      }
    }


    shell.tty.lockInput();

    const editorContainer = document.getElementById('editor-container');
    editorContainer.style.display = 'block';
    document.getElementById('terminal').style.opacity = '0';
    editorContainer.innerHTML = '';

    const editor = CodeMirror(editorContainer, {
      value: initialContent,
      mode: "markdown",
      theme: "dracula",
      keyMap: "vim",
      lineNumbers: true,
      autofocus: true,
      extraKeys: {
        ':': CodeMirror.Vim.startEx
      }
    });

    // CRITICAL: Logic to force editor focus back on ESC key (required for Vim)
    editor.on('keydown', (cm, e) => {
      if (e.keyCode === 27) {
        setTimeout(() => {
          if (!cm.hasFocus()) {
            cm.focus();
          }
        }, 0);
      }
    });

    editor.changeHandled = false;
    editor.on('change', () => { editor.changeHandled = true; });



    const closeEditor = (shouldSave = false) => {
      if (!shouldSave && editor.changeHandled && !hasBeenWritten) {
        editor.openNotification(`<span style="color: var(--yellow)">No write since last change (add ! to override)</span>`, { duration: 3000 });
        return false;
      }

      editorContainer.innerHTML = '';
      editorContainer.style.display = 'none';
      document.getElementById('terminal').style.opacity = '1';

      shell.tty.unlockInput();
      return 0;
    };


    const commandWrite = () => {
      const newContent = editor.getValue();

      try {
        fs.writeFile(rawPath, newContent, cwd);

        editor.changeHandled = false;
        hasBeenWritten = true;
        isNewFile = false;

        editor.openNotification(`<span style="color: var(--green)">"${rawPath}" written</span>`, { duration: 1000 });

      } catch (e) {
        editor.openNotification(`<span style="color: var(--red)">Error: ${e.message}</span>`, { duration: 3000 });
        stderr.write(`vim: Error writing file: ${e.message}\n`);
      }
    };

    // :w
    CodeMirror.Vim.defineEx("write", "w", commandWrite);

    // :q, :q!
    CodeMirror.Vim.defineEx("quit", "q", function(cm, params) {
      const force = params.argString === '!';

      if (force) {
        closeEditor(true);
      } else if (editor.changeHandled && !hasBeenWritten) {
        closeEditor(false);
      } else {
        closeEditor(true);
      }
    });

    // :wq
    CodeMirror.Vim.defineEx("wq", "wq", function(cm) {
      commandWrite();
      setTimeout(() => {
        CodeMirror.Vim.handleEx(cm, 'q');
      }, 100);
    });

    return null;
  }
};
