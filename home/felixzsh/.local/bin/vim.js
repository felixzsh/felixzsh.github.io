return {
  description: "evolution of the unix vi editor",
  execute: (args, context, options) => {
    if (args.length === 0 || options.help) {
      return "Use: vim &lt;file_name&gt;\n\nEdits a file in the virtual filesystem.";
    }

    const rawPath = args[0];
    const absPathParts = context.fs.resolvePath(context.cwd, rawPath);
    const absPath = '/' + absPathParts.join('/');

    const parentPathParts = absPathParts.slice(0, -1);
    const fileName = absPathParts[absPathParts.length - 1];

    let fileNode = context.fs.getNode(absPathParts);
    let isNewFile = false;
    let initialContent = "";

    if (fileNode) {
      if (fileNode.type === 'directory') {
        return `<span style="color: var(--red)">vim: '${rawPath}': is a directory</span>`;
      }
      initialContent = fileNode.content || "";
    } else {
      const parentNode = context.fs.getNode(parentPathParts);

      if (!parentNode || parentNode.type !== 'directory') {
        return `<span style="color: var(--red)">vim: '${rawPath}': No such file or directory</span>`;
      }

      fileNode = { "type": "file", "content": "" };
      isNewFile = true;
    }

    // Lock terminal input while vim is open
    context.shell.tty.lockInput();

    const editorContainer = document.getElementById('editor-container');
    editorContainer.style.display = 'block';
    document.getElementById('terminal').style.opacity = '0';

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

    editor.on('keydown', (cm, e) => {
      if (e.keyCode === 27) {
        setTimeout(() => {
          if (!cm.hasFocus()) {
            cm.focus();
          }
        }, 0);
      }
    });



    const closeEditor = () => {
      editorContainer.innerHTML = '';
      editorContainer.style.display = 'none';
      document.getElementById('terminal').style.opacity = '1';
      context.shell.tty.unlockInput();
    };

    CodeMirror.Vim.defineEx("write", "w", function () {
      const newContent = editor.getValue();

      if (isNewFile) {
        const parentNode = context.fs.getNode(parentPathParts);
        parentNode.children[fileName] = fileNode;
        isNewFile = false;
      }

      fileNode.content = newContent;
      context.fs.save();
    });

    CodeMirror.Vim.defineEx("quit", "q", function () {
      closeEditor();
    });

    CodeMirror.Vim.defineEx("wq", "wq", function (cm) {
      CodeMirror.Vim.handleEx(cm, 'w');
      CodeMirror.Vim.handleEx(cm, 'q');
    });

    return null;
  }
}
