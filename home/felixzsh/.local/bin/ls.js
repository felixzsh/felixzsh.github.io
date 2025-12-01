// ls.js - List directory contents

/**
 * Formats a timestamp to a readable date string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, ' ');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');

  return `${month} ${day} ${hour}:${minute}`;
}

return {
  description: 'List directory contents',
  execute: (context) => {
    const { args, options, fs, stdout, stderr, cwd } = context;

    const targetPath = args[0] || cwd;

    const segments = fs.resolvePath(targetPath, cwd);
    const node = fs.getNode(segments);

    if (!node) {
      stderr.write(`ls: cannot access '${targetPath}': No such file or directory\n`);
      return 1;
    }

    // If it's a file, just show the file
    if (node.type === 'file') {
      if (options.l) {
        const stats = fs.stat(targetPath, cwd);
        const dateStr = formatDate(stats.modifiedAt);
        stdout.write(`${stats.permissions} 1 user user ${stats.size.toString().padStart(8)} ${dateStr} ${stats.name}\n`);
      } else {
        stdout.write(`${node.name}\n`);
      }
      return 0;
    }

    if (node.type !== 'directory') {
      stderr.write(`ls: ${targetPath}: Not a directory\n`);
      return 1;
    }

    const entries = fs.readDir(targetPath, cwd);

    // Filter hidden files unless -a is specified
    let filteredEntries = entries;
    if (!options.a) {
      filteredEntries = entries.filter(name => !name.startsWith('.'));
    }

    filteredEntries.sort();

    if (filteredEntries.length === 0) {
      return 0;
    }

    const absolutePath = segments.length === 0 ? '/' : '/' + segments.join('/');

    if (options.l) {
      // Long format
      filteredEntries.forEach(name => {
        const entryPath = absolutePath === '/' ? `/${name}` : `${absolutePath}/${name}`;
        try {
          const stats = fs.stat(entryPath, '/');
          const dateStr = formatDate(stats.modifiedAt);
          const sizeStr = stats.size.toString().padStart(8);
          const isDir = stats.type === 'directory';
          const displayName = isDir
            ? `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`
            : name;
          stdout.write(`${stats.permissions} 1 user user ${sizeStr} ${dateStr} ${displayName}\n`);
        } catch (e) {
          console.log(`entry ${entryPath} stat failed, err: ${e}`);
          // Skip entries that can't be stat'd
        }
      });
    } else {
      // Simple format - inline with spaces between items
      const formattedItems = filteredEntries.map(name => {
        const entryPath = absolutePath === '/' ? `/${name}` : `${absolutePath}/${name}`;
        const entryNode = fs.getNode(fs.resolvePath(entryPath, '/'));

        if (entryNode && entryNode.type === 'directory') {
          return `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`;
        }
        return name;
      });
      stdout.write(formattedItems.join('  ') + '\n');
    }
    return 0;
  }
}
