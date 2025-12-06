return {
  description: 'Move or rename files',
  execute: (context) => {
    const { fs, cwd, stdout, stderr, shell } = context;
    const { args, options } = context;
    if (args.length === 0 || options.help) {
      stdout.write("Usage: mv SOURCE DEST\n");
      stdout.write("   or: mv SOURCE... DIRECTORY\n\n");
      stdout.write("Rename SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.\n");
      return 0;
    }
    const dest = args.pop();
    const sources = args;
    if (sources.length === 0) {
      stderr.write("mv: missing file operand\n");
      stderr.write("Try 'mv --help' for more information.\n");
      return 1;
    }
    let exitCode = 0;
    let destIsDir = false;
    try {
      const destStats = fs.stat(dest, cwd);
      destIsDir = destStats.type === 'directory';
    } catch (e) {
      if (sources.length > 1) {
        stderr.write(`mv: target '${dest}' is not a directory\n`);
        return 1;
      }
    }
    for (const source of sources) {
      try {
        let targetPath = dest;
        if (destIsDir || sources.length > 1) {
          const sourceName = source.split('/').pop();
          targetPath = `${dest}/${sourceName}`;
        }
        const cpResult = shell.run(`cp ${source} ${targetPath}`);
        if (cpResult.code === 0) {
          const rmResult = shell.run(`rm ${source}`);
          if (rmResult.code !== 0) {
            stderr.write(`mv: failed to remove source '${source}'\n`);
            exitCode = 1;
          }
        } else {
          exitCode = 1;
        }
      } catch (e) {
        stderr.write(`mv: ${e.message}\n`);
        exitCode = 1;
      }
    }
    return exitCode;
  }
};
