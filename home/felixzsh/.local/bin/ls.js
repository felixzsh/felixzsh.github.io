return {
  description: 'List directory contents',
  execute: (context) => {
    const { fs, cwd, args, options, stdout, stderr } = context;
    const target = args[0] || '.';
    try {
      if (!fs.exists(target, cwd)) {
        stderr.write(`ls: cannot access '${target}': No such file or directory\n`);
        return 1;
      }

      // Handle file case
      if (fs.isFile(target, cwd)) {
        stdout.write(target + '\n');
        return 0;
      }

      // Handle directory case
      if (fs.isDirectory(target, cwd)) {
        let items = fs.readDir(target, cwd);
        // Filter hidden files if -a option is not set
        if (!options.a) {
          items = items.filter(name => !name.startsWith('.'));
        }
        items.sort();

        // Long format with -l option
        if (options.l) {
          let output = '<div style="display: grid; grid-template-columns: auto auto auto auto auto auto auto; gap: 0 10px;">';
          items.forEach(name => {
            try {
              const itemPath = target === '.' ? name : `${target}/${name}`;
              const isDir = fs.isDirectory(itemPath, cwd);
              const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
              const size = isDir ? '-' : fs.readFile(itemPath, cwd).length;
              const user = context.env.USER || 'felixzsh';
              const date = 'Nov 24 03:24';

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
            } catch (e) {
              // Skip items that can't be accessed
            }
          });
          output += '</div>';
          stdout.write(output);
        } else {
          // Simple format
          const formattedItems = items.map(name => {
            try {
              const itemPath = target === '.' ? name : `${target}/${name}`;
              if (fs.isDirectory(itemPath, cwd)) {
                return `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`;
              }
              return name;
            } catch (e) {
              return name; // Return name even if we can't determine type
            }
          });
          stdout.write(formattedItems.join('  ') + '\n');
        }
        return 0;
      }

      // If it's neither file nor directory (shouldn't happen with exists() check)
      stderr.write(`ls: ${target}: Not a file or directory\n`);
      return 1;
    } catch (error) {
      stderr.write(`ls: ${error.message}\n`);
      return 1;
    }
  }
};
