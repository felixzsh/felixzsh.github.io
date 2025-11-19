
function execute(args, term, options) {
  if (args.length === 0 || options.help) {
    return "Uso: vim <archivo>\n\nEdita un archivo en el sistema de archivos virtual.";
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
      return `<span style="color: var(--red)">vim: '${rawPath}': es un directorio</span>`;
    }
    initialContent = fileNode.content || "";
  } else {

    const parentNode = getNode(parentPathParts);

    if (!parentNode || parentNode.type !== 'directory') {
      return `<span style="color: var(--red)">vim: '${rawPath}': No such file or directory</span>`;
    }


    fileNode = { "type": "file", "content": "" };
    isNewFile = true;
    term.print(`<span style="color: var(--yellow)">"${rawPath}" [New File]</span>`);
  }




  term.toggleEditor(true, fileNode, absPath);

  const editorContainer = document.getElementById('editor-container');


  const editor = CodeMirror(editorContainer, {
    value: initialContent,
    mode: "markdown",
    theme: "dracula",
    keyMap: "vim",
    lineNumbers: true,
    autofocus: true
  });


  editor.on('vim-mode-change', function(e) {
    if (e.mode === 'normal' || e.mode === 'visual') {
      editor.focus();
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

    console.log(`Guardado en VFS: ${absPath}`);
  });

  CodeMirror.Vim.defineEx("quit", "q", function() {
    term.toggleEditor(false);
    term.print(`Saliendo de vim. Escriba 'cat ${rawPath}' para ver el contenido.`);
  });

  CodeMirror.Vim.defineEx("wq", "wq", function(cm) {
    CodeMirror.Vim.handleEx(cm, 'w');
    CodeMirror.Vim.handleEx(cm, 'q');
  });


  return null;
}

return { execute: execute };
