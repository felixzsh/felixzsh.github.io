return {
  description: 'List directory contents',
  execute: (args, context, options = {}) => {
    const target = args[0] || '.';
    const resolvedParts = context.fs.resolvePath(context.cwd, target);
    const node = context.fs.getNode(resolvedParts);

    if (!node) {
      return `ls: cannot access '${target}': No such file or directory`;
    }

    if (node.type === 'file') {
      return target;
    }

    if (node.children) {
      let items = Object.keys(node.children);

      if (!options.a) {
        items = items.filter(name => !name.startsWith('.'));
      }

      items.sort();

      if (options.l) {
        let output = '<div style="display: grid; grid-template-columns: auto auto auto auto auto auto auto; gap: 0 10px;">';
        items.forEach(name => {
          const child = node.children[name];
          const isDir = child.type === 'directory';
          const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = isDir ? '-' : (child.content ? child.content.length : 0);
          const user = context.env.USER || 'felixzsh';
          const date = 'Nov 20 12:00';

          const nameHtml = isDir
            ? `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`
            : name;

          output += `
                        <div style="color: var(--foreground)">${perms}</div>
                        <div style="color: var(--foreground)">1</div>
                        <div style="color: var(--foreground)">${user}</div>
                        <div style="color: var(--foreground)">${user}</div>
                        <div style="color: var(--foreground); text-align: right;">${size}</div>
                        <div style="color: var(--foreground)">${date}</div>
                        <div>${nameHtml}</div>
                    `;
        });
        output += '</div>';
        return output;
      }

      const formattedItems = items.map(name => {
        const child = node.children[name];
        if (child.type === 'directory') {
          return `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`;
        }
        return name;
      });
      return formattedItems.join('  ');
    }
    return '';
  }
};
