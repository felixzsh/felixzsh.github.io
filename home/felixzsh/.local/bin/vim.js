function execute(args, term, options) {
  if (args.length === 0 || options.help) {
    return "Usage: vim <file_path>\n\nEdit a file in the virtual filesystem.";
  }

  const rawPath = args[0];
  const absPathParts = resolvePath(term.currentPath, rawPath);

  const absPath = '/' + absPathParts.join('/');

  const node = getNode(absPathParts);

  let fileContent = "";

  if (node) {
    if (node.type === 'directory') {
      return `<span style="color: var(--red)">vim: '${rawPath}': es un directorio</span>`;
    }
    fileContent = node.content || "";
  } else {
    const parentPathParts = absPathParts.slice(0, -1);
    const parentNode = getNode(parentPathParts);

    if (!parentNode || parentNode.type !== 'directory') {
      return `<span style="color: var(--red)">vim: '${rawPath}': No such file or directory</span>`;
    }

    const fileName = absPathParts[absPathParts.length - 1];
    parentNode.children[fileName] = { "type": "file", "content": fileContent };
    term.print(`<span style="color: var(--yellow)">"${rawPath}" [New File]</span>`);
  }

  term.toggleVim(true, absPath);

  window.startVim(absPath, fileContent);

  return null;
}

return { execute: execute };
