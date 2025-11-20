return {
  description: "evolution of the unix vi editor",
  execute: (args, term, options) => {
    if (args.length === 0 || options.help) {
      return "Use: vim &lt;file_name&gt;\n\nEdits a file in the virtual filesystem.";
    }

    const rawPath = args[0];
    const absPathParts = resolvePath(term.currentPath, rawPath);
    const absPath = '/' + absPathParts.join('/');

    const parentPathParts = absPathParts.slice(0, -1);
    const fileName = absPathParts[absPathParts.length - 1];

    let fileNode = getNode(absPathParts);
    let isNewFile = false;
    let initialContent = "";


    if (fileNode) {
      if (fileNode.type === 'directory') {
        return `<span style="color: var(--red)">vim: '${rawPath}': is a directory</span>`;
      }
      initialContent = fileNode.content || "";
    } else {

      const parentNode = getNode(parentPathParts);

      if (!parentNode || parentNode.type !== 'directory') {
        return `<span style="color: var(--red)">vim: '${rawPath}': No such file or directory</span>`;
      }

      fileNode = { "type": "file", "content": "" };
      isNewFile = true;
    }

    term.toggleEditor(true, fileNode, absPath);

    const editorContainer = document.getElementById('editor-container');

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

    editor.on('vim-mode-change', function(e) {
      if (e.mode === 'normal' || e.mode === 'visual') {
        setTimeout(() => {
          editor.focus();
        }, 0);
      }
    });

    CodeMirror.Vim.defineEx("write", "w", function() {
      const newContent = editor.getValue();

      if (isNewFile) {
        const parentNode = getNode(parentPathParts);
        parentNode.children[fileName] = fileNode;
        isNewFile = false;
      }

      fileNode.content = newContent;
      saveFS();

      editor.setOption('readOnly', 'nocursor');
      setTimeout(() => editor.setOption('readOnly', false), 500);

      setTimeout(() => {
        editor.focus();
      }, 500);
    });

    CodeMirror.Vim.defineEx("quit", "q", function() {
      term.toggleEditor(false);
    });

    CodeMirror.Vim.defineEx("wq", "wq", function(cm) {
      CodeMirror.Vim.handleEx(cm, 'w');
      CodeMirror.Vim.handleEx(cm, 'q');
    });

    return null;
  }
}
