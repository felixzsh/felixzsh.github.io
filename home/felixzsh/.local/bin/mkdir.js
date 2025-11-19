function execute(args, term, options) {
  if (args.length === 0 || options.help) {
    return "Usage: mkdir <directory_name>\n\nCreate new directory.";
  }

  const newDirPath = args[0];
  const pathParts = resolvePath(term.currentPath, newDirPath);

  if (pathParts.length === 0) {
    return `<span style="color: var(--red)">mkdir: cannot create directory '': File exists (or invalid path)</span>`;
  }

  const dirName = pathParts.pop();
  const parentPath = pathParts;

  const parentNode = getNode(parentPath);

  if (!parentNode || parentNode.type !== 'directory' || !parentNode.children) {
    return `<span style="color: var(--red)">mkdir: cannot create directory '${newDirPath}': No such file or directory (parent does not exist)</span>`;
  }

  if (parentNode.children[dirName]) {
    return `<span style="color: var(--red)">mkdir: cannot create directory '${newDirPath}': File exists</span>`;
  }


  parentNode.children[dirName] = {
    "type": "directory",
    "children": {}
  };


  saveFS();

  return "";
}

return { execute: execute };
