function execute(args, term, options) {
  if (args.length === 0 || options.help) {
    return "Usage: touch <file_name>\n\nCreate a new file or update timestamp (simple implementation).";
  }

  const filePath = args[0];
  const pathParts = resolvePath(term.currentPath, filePath);

  if (pathParts.length === 0) {
    return `<span style="color: var(--red)">touch: cannot create file '': Invalid path or root directory</span>`;
  }

  const fileName = pathParts.pop();
  const parentPath = pathParts;

  const parentNode = getNode(parentPath);

  if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
    return `<span style="color: var(--red)">touch: cannot create file '${filePath}': No such file or directory</span>`;
  }

  if (parentNode.children[fileName]) {
    return "";
  }

  parentNode.children[fileName] = {
    "type": "file",
    "content": ""
  };

  saveFS();

  return "";
}

return { execute: execute };
