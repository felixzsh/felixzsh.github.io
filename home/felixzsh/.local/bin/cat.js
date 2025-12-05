// Content for /bin/cat.js
return {
  description: 'Concatenate files and print on the standard output. Renders markdown for .md files unless --raw is used.',
  execute: (context) => {
    const { fs, cwd, stdin, stdout, stderr, shell } = context;
    const { args, options } = context;
    let exitCode = 0;

    const showRaw = options.raw || options.r;

    if (args.length > 0) {
      for (const path of args) {
        try {
          const content = fs.readFile(path, cwd);
          const shouldRenderMarkdown = !showRaw && path.toLowerCase().endsWith('.md');
          if (shouldRenderMarkdown) {
            const html = shell.tty.renderMarkdown(content);
            stdout.write(html);
          } else {
            stdout.write(content);
          }
        } catch (e) {
          stderr.write(`cat: ${path}: ${e.message}\n`);
          exitCode = 1;
        }
      }
    } else {
      const input = stdin.read();
      if (input) {
        if (!showRaw) {
          const html = shell.tty.renderMarkdown(input);
          stdout.write(html);
        } else {
          stdout.write(input);
        }
      }
    }
    return exitCode;
  }
};
