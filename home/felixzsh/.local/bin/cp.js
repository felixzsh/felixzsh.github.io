return {
  description: 'Copy files',
  execute: (context) => {
    const { fs, cwd, stdout, stderr, shell } = context;
    const { args, options } = context;

    if (args.length === 0 || options.help) {
      stdout.write("Usage: cp SOURCE DEST\n");
      stdout.write("   or: cp SOURCE... DIRECTORY\n\n");
      stdout.write("Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.\n");
      return 0;
    }

    const dest = args.pop();
    const sources = args;

    if (sources.length === 0) {
      stderr.write("cp: missing file operand\n");
      stderr.write("Try 'cp --help' for more information.\n");
      return 1;
    }

    let exitCode = 0;

    let destIsDir = false;
    try {
      const destStats = fs.stat(dest, cwd);
      destIsDir = destStats.type === 'directory';
    } catch (e) {
      if (sources.length > 1) {
        stderr.write(`cp: target '${dest}' is not a directory\n`);
        return 1;
      }
    }

    for (const source of sources) {
      try {
        const content = fs.readFile(source, cwd);

        let targetPath = dest;
        if (destIsDir || sources.length > 1) {
          const sourceName = source.split('/').pop();
          targetPath = `${dest}/${sourceName}`;
        }

        fs.writeFile(targetPath, content, cwd);

      } catch (e) {
        stderr.write(`cp: ${e.message}\n`);
        exitCode = 1;
      }
    }

    return exitCode;
  }
};
